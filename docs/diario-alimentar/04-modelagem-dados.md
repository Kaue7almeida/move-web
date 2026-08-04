# 04 — Modelagem de dados

Segue rigorosamente o padrão já estabelecido pelas migrations do Scan (`scan_analyses` + `scan_photos`, ver [supabase/migrations/20260601150000_scan_analyses_foundation.sql](../../supabase/migrations/20260601150000_scan_analyses_foundation.sql)) e as regras do [GUIA_DESENVOLVIMENTO_WEB_BFF_MOVE.md](../GUIA_DESENVOLVIMENTO_WEB_BFF_MOVE.md): front não acessa banco direto, RLS deny-by-default, acesso só via BFF com service-role client.

## Nomenclatura do módulo

| Camada | Nome |
|---|---|
| Rota de app | `/app/diario` (português, mesmo padrão de `treinos`, `alunos`, `galeria`) |
| Módulo BFF | `src/bff/modules/foodDiary/` (inglês, mesmo padrão de `scan`, `chat`, `profile`, `workouts`) |
| Rotas de API | `/api/v1/food-diary/...` |
| Tabelas | `food_diary_entries`, `food_diary_items`, `daily_calorie_targets`, `activity_energy_entries` |

> Atenção de nomenclatura: o [GUIA_DESENVOLVIMENTO_WEB_BFF_MOVE.md](../GUIA_DESENVOLVIMENTO_WEB_BFF_MOVE.md) usa `student-diary` como exemplo *ilustrativo* de nome de módulo na seção de estrutura de pastas — não existe código real com esse nome hoje. Para não colidir semanticamente com um futuro "diário do aluno" (anotações do personal, não alimentação), optamos por `food-diary`/`foodDiary` explicitamente, e não `diary`/`student-diary`.

## Tabelas propostas

### `food_diary_entries` (uma refeição registrada)

Equivalente a `scan_analyses`: mesmo ciclo de vida `draft → processing → completed/failed`, mesmo padrão de `result jsonb` para o payload rico da IA.

```sql
create table public.food_diary_entries (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  status text not null default 'draft',
  meal_type text not null,              -- 'cafe_da_manha' | 'almoco' | 'jantar' | 'lanche'
  meal_origin text,                     -- 'caseiro' | 'restaurante' | 'embalado' (opcional)
  preparation_hint text,                -- 'frito' | 'grelhado' | 'cozido' | 'assado' | 'cru' (opcional)
  hidden_ingredients jsonb not null default '[]'::jsonb,  -- ex: ["oleo", "manteiga"]
  is_shared_portion boolean not null default false,
  -- Payload rico da IA (itens detectados, quality, confidence) — mesmo papel do
  -- `result` em scan_analyses.
  result jsonb not null default '{}'::jsonb,
  -- Totais desnormalizados para consulta rápida do dashboard diário
  -- (evita agregar food_diary_items toda vez que a home carrega).
  total_kcal numeric,
  total_protein_g numeric,
  total_carb_g numeric,
  total_fat_g numeric,
  total_fiber_g numeric,
  confidence numeric,
  quality_overall text,
  failure_reason text,
  logged_at timestamptz not null default now(),  -- data/hora que conta pro diário (editável pelo usuário)
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_diary_entries_status_check
    check (status in ('draft', 'processing', 'completed', 'failed')),
  constraint food_diary_entries_meal_type_check
    check (meal_type in ('cafe_da_manha', 'almoco', 'jantar', 'lanche')),
  constraint food_diary_entries_result_object_check
    check (jsonb_typeof(result) = 'object')
);

create index idx_food_diary_entries_student_logged
  on public.food_diary_entries (student_user_id, logged_at desc);
```

`logged_at` separado de `created_at` é proposital: o usuário pode registrar uma refeição de algumas horas atrás (não fotografou na hora) e o dashboard diário precisa somar pela data da refeição, não da criação do registro.

### `food_diary_items` (ingredientes por refeição, editáveis)

Não existe equivalente direto no Scan (lá o resultado é um conjunto fixo de métricas corporais; aqui é uma lista variável de itens). Guarda tanto a estimativa original da IA quanto a correção do usuário, preservando o valor original para métricas de qualidade da IA no futuro.

```sql
create table public.food_diary_items (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.food_diary_entries(id) on delete cascade,
  name text not null,
  category text,                         -- 'carboidrato' | 'proteina' | 'vegetal' | 'molho' | ...
  grams_estimated numeric not null,      -- valor original da IA
  grams_confirmed numeric,               -- valor após edição do usuário (null = aceitou o da IA)
  confidence numeric,                    -- confiança da IA para este item, 0–1
  nutrition_source text not null,        -- 'taco' | 'usda' | 'ia_estimado' | 'manual'
  nutrition_food_id text,                -- id do alimento na base de origem, quando houver match
  kcal numeric not null,
  protein_g numeric not null,
  carb_g numeric not null,
  fat_g numeric not null,
  fiber_g numeric,
  is_removed boolean not null default false,  -- usuário removeu um item que a IA detectou errado
  created_at timestamptz not null default now(),
  constraint food_diary_items_nutrition_source_check
    check (nutrition_source in ('taco', 'usda', 'ia_estimado', 'manual'))
);

create index idx_food_diary_items_entry_id
  on public.food_diary_items (entry_id);
```

Os totais em `food_diary_entries` são recalculados (backend) toda vez que um item de `food_diary_items` é editado/removido/adicionado — mesma lógica de "revisão antes de confirmar" descrita em [02](02-metodo-ia-estimativa.md#loop-de-correção-do-usuário-não-negociável).

### `daily_calorie_targets` (meta diária do usuário)

Cobre o pedido de "setar de uma vez a estimativa do dia" — meta pode ser definida manualmente ou vir de um cálculo futuro (TMB × fator de atividade, o mesmo TMB que o Scan já calcula em `scan_analyses.bmr`).

```sql
create table public.daily_calorie_targets (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  target_kcal numeric not null,
  target_protein_g numeric,
  target_carb_g numeric,
  target_fat_g numeric,
  source text not null default 'manual',   -- 'manual' | 'estimated_from_scan'
  effective_from date not null default current_date,
  created_at timestamptz not null default now(),
  constraint daily_calorie_targets_positive_check check (target_kcal > 0)
);

create index idx_daily_calorie_targets_student_effective
  on public.daily_calorie_targets (student_user_id, effective_from desc);
```

Modelado como série histórica (`effective_from`), não uma única linha por usuário — permite a meta mudar ao longo do tempo sem perder o histórico de qual meta valia em cada dia passado (importante para o gráfico de balanço não "reescrever o passado" quando a meta muda).

### `activity_energy_entries` (gasto calórico de atividades)

Cobre "colocar a perda estimada de calorias e atividades". Deliberadamente simples — não é objetivo do módulo virar um tracker de treino paralelo ao módulo `workouts` que já existe.

```sql
create table public.activity_energy_entries (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.student_profiles(user_id) on delete cascade,
  source text not null default 'manual',   -- 'manual' | 'workout_session' (futuro: linkar workout_sessions)
  workout_session_id uuid references public.workout_sessions(id) on delete set null,
  label text,                              -- ex: "Corrida", "Treino de peito" — livre quando manual
  kcal_burned numeric not null,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint activity_energy_entries_positive_check check (kcal_burned > 0)
);

create index idx_activity_energy_entries_student_logged
  on public.activity_energy_entries (student_user_id, logged_at desc);
```

`workout_session_id` já deixa pronta a integração futura de puxar gasto calórico automaticamente de uma sessão de treino concluída (`workout_sessions`, existente), sem forçar isso na primeira versão.

## Storage

Mesmo padrão do bucket `scan-photos`: bucket **privado**, sem policy pública, acesso só via BFF com service-role.

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'food-diary-photos',
  'food-diary-photos',
  false,
  15728640,  -- 15 MB, mesmo limite do scan-photos
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
```

Diferente do Scan, aqui não há necessariamente um bucket público de assets de tutorial (`scan-assets`) dedicado — as imagens de exemplo "certo/errado" de enquadramento de prato podem reaproveisar o mesmo bucket público de tutorial já criado para o Scan, com um prefixo de path diferente (`tutorial/food/...`), evitando criar infraestrutura duplicada.

## RLS

Igual ao Scan: `enable row level security` **sem policies** nas quatro tabelas — deny-by-default para `anon`/`authenticated`. Todo acesso passa pelo BFF com service-role, que aplica o filtro de `student_user_id` no repository (regra central do [GUIA_DESENVOLVIMENTO_WEB_BFF_MOVE.md](../GUIA_DESENVOLVIMENTO_WEB_BFF_MOVE.md): "Repository deve aplicar filtro de ownership").

## Estrutura de módulo BFF

Mesma estrutura de pastas do Scan (`src/bff/modules/scan/`):

```
src/bff/modules/foodDiary/
  types/
    index.ts              — tipos de domínio + schema Zod da resposta da IA
    IFoodDiaryRepository.ts
  infra/
    FoodDiaryRepository.ts
    OpenAiFoodDiaryClient.ts
    NutritionLookupClient.ts   — busca TACO/USDA por nome de ingrediente
  services/
    FoodDiaryAiService.ts      — orquestra: chama IA, resolve nutrição, persiste
    DailyBalanceService.ts     — soma entries + activity_energy_entries do dia vs. target
  factories/
    makeFoodDiaryService.ts

src/app/api/v1/food-diary/
  entries/route.ts
  entries/[entryId]/route.ts
  entries/[entryId]/items/[itemId]/route.ts   — editar/remover item na revisão
  entries/[entryId]/process/route.ts
  targets/route.ts
  activity/route.ts
  daily-summary/route.ts        — agregação do dia (consumido, gasto, meta, saldo)
```

`NutritionLookupClient` é a peça nova que o Scan não tem — encapsula a consulta à TACO/USDA descrita em [02](02-metodo-ia-estimativa.md#abordagem-híbrida-ia-para-visão-base-de-dados-para-nutrição), isolada como infra própria para poder trocar de fonte de dados sem tocar no service.
