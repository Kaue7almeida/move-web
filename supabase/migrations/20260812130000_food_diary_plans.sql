-- ─────────────────────────────────────────────────────────────────────────────
-- Diário Alimentar 2.0 — plano pessoal (objetivo + motor energético)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY
-- O Diário deixa de ser um contador de calorias e passa a responder "estou
-- seguindo meu objetivo hoje?". Isso exige um PLANO pessoal por usuário: objetivo
-- (perder/manter/ganhar), TMB (reusando a fórmula única do MoveScan) + origem,
-- fator de rotina e saldo planejado — de onde deriva a FAIXA-ALVO do dia.
--
-- ADITIVA E SEGURA
--  • Cria uma tabela NOVA (food_diary_plans) — nada existente é recriado.
--  • Adiciona 2 colunas OPCIONAIS/`default` em food_diary_entries (registro por
--    texto e por docinho/petisco). Linhas atuais recebem input_kind='photo'.
--  • Ownership em public.profiles(id) (o Diário é role-agnostic).
--  • Preserva daily_calorie_targets e TODOS os dados existentes. NÃO converte
--    metas antigas silenciosamente.
--  • RLS habilitada sem policies (deny-by-default) — o BFF acessa via service role,
--    exatamente como as demais tabelas do Diário.
--
-- NÃO APLICAR AUTOMATICAMENTE. Revisar e rodar manualmente no Supabase SQL Editor.
-- Requer que a migration role-agnostic (20260812120000, PR aberto) já esteja
-- aplicada em produção — o que já ocorreu (FKs do Diário apontam para profiles).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── 1. food_diary_plans ──────────────────────────────────────────────────────
create table public.food_diary_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  status text not null default 'active',
  goal text not null,

  -- TMB (kcal/dia) + de onde veio. tmb_input guarda o snapshot usado (massa magra,
  -- % de gordura, peso), para auditoria e para não recalcular silenciosamente.
  tmb_kcal integer not null,
  tmb_source text not null,
  tmb_input jsonb not null default '{}'::jsonb,
  scan_id uuid references public.scan_analyses(id) on delete set null,

  -- Rotina fora dos treinos registrados. routine_factor é o snapshot do fator
  -- aplicado (a fonte da verdade dos fatores vive no código: planEnergy.ts).
  routine_level text not null,
  routine_factor numeric not null,

  -- Convenção de sinal: déficit < 0 · manutenção = 0 · superávit > 0.
  planned_balance_kcal integer not null default 0,
  -- Meia-largura da faixa-alvo (kcal).
  tolerance_kcal integer not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint food_diary_plans_status_check
    check (status in ('active', 'archived')),
  constraint food_diary_plans_goal_check
    check (goal in ('lose', 'maintain', 'gain')),
  constraint food_diary_plans_tmb_source_check
    check (tmb_source in ('scan', 'body_fat', 'manual')),
  constraint food_diary_plans_routine_level_check
    check (routine_level in ('sedentary', 'light', 'moderate', 'high')),
  constraint food_diary_plans_tmb_positive_check
    check (tmb_kcal > 0 and tmb_kcal <= 10000),
  constraint food_diary_plans_routine_factor_range_check
    check (routine_factor >= 1 and routine_factor <= 3),
  constraint food_diary_plans_tolerance_range_check
    check (tolerance_kcal > 0 and tolerance_kcal <= 2000),
  constraint food_diary_plans_planned_balance_range_check
    check (planned_balance_kcal >= -3000 and planned_balance_kcal <= 3000),
  constraint food_diary_plans_tmb_input_object_check
    check (jsonb_typeof(tmb_input) = 'object')
);

-- No máximo UM plano ativo por usuário.
create unique index food_diary_plans_one_active_per_user
  on public.food_diary_plans (user_id)
  where status = 'active';

create index idx_food_diary_plans_user_created
  on public.food_diary_plans (user_id, created_at desc);

create trigger food_diary_plans_set_updated_at
  before update on public.food_diary_plans
  for each row execute function public.set_updated_at();

-- Deny-by-default: RLS ligada, zero policies (BFF usa service role).
alter table public.food_diary_plans enable row level security;

-- ─── 2. food_diary_entries — registro por texto / docinho (aditivo) ───────────
alter table public.food_diary_entries
  add column if not exists input_kind text not null default 'photo';

alter table public.food_diary_entries
  add column if not exists text_description text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'food_diary_entries_input_kind_check'
  ) then
    alter table public.food_diary_entries
      add constraint food_diary_entries_input_kind_check
      check (input_kind in ('photo', 'text', 'snack'));
  end if;
end $$;

-- ─── 3. food_diary_items — ambiguidade por item (aditivo) ─────────────────────
-- A IA passa a marcar a IDENTIDADE do alimento (identified/ambiguous/unknown) e,
-- quando ambígua, as alternativas plausíveis — para o usuário escolher antes de
-- confirmar. Linhas atuais recebem 'identified' e [].
alter table public.food_diary_items
  add column if not exists identification text not null default 'identified';

alter table public.food_diary_items
  add column if not exists alternatives jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'food_diary_items_identification_check'
  ) then
    alter table public.food_diary_items
      add constraint food_diary_items_identification_check
      check (identification in ('identified', 'ambiguous', 'unknown'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'food_diary_items_alternatives_array_check'
  ) then
    alter table public.food_diary_items
      add constraint food_diary_items_alternatives_array_check
      check (jsonb_typeof(alternatives) = 'array');
  end if;
end $$;

commit;
