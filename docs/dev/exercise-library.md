# Biblioteca de Exercícios

Como a base de exercícios do Move está modelada, como a mídia se liga ao Storage e
como adicionar novos exercícios com segurança. Esta é a fundação para o futuro
Workout Studio (Fase S1).

> Fase de origem: **S0 — Exercise Library Foundation**.
> Migration: `supabase/migrations/20260530120000_exercise_library_media.sql`.

---

## 1. Modelo de dados

Tabela única: **`public.exercises`** (uma linha = um exercício da biblioteca global,
compartilhada por todos os personais; RLS de leitura para `authenticated`).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `slug` | `text` | **único**, kebab-case, sem acento. Identidade estável do exercício |
| `name` | `text` | Nome de exibição em PT, com acento e maiúsculas |
| `description` | `text \| null` | Descrição curta |
| `primary_muscle` | `text \| null` | Token simples (ex.: `peitoral`, `quadriceps`) |
| `equipment` | `text \| null` | Token simples (ex.: `barra`, `halteres`, `maquina`, `polia`, `smith`, `peso corporal`) |
| `thumbnail_path` | `text \| null` | Caminho do objeto no Storage usado como capa |
| `image_start_path` | `text \| null` | Caminho do frame inicial do movimento |
| `image_end_path` | `text \| null` | Caminho do frame final do movimento |
| `media_type` | `text` | `not null default 'none'`. Ver abaixo |
| `is_active` | `boolean` | `not null default true` |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` via trigger `set_exercises_updated_at` |

### `media_type`

Restrito por `constraint exercises_media_type_check`:

- **`none`** — exercício sem mídia (apenas texto). Os 3 `*_path` ficam `null`.
- **`image_pair`** — par de fotos (frame inicial + final). É o estado atual de 62 exercícios.
- **`gif`** — reservado para GIF único (ainda não usado).
- **`video`** — reservado para vídeo (ainda não usado).

Campos simples e explícitos por decisão de projeto: nada de JSONB enquanto colunas
resolverem. O front **nunca** adivinha mídia — lê só estas colunas.

---

## 2. Ligação Storage ↔ Banco

- Bucket **público**: `exercises` (no projeto Supabase remoto).
- Os `*_path` guardam o **caminho exato do objeto** dentro do bucket, ex.:
  `Leg Press 45/Leg press 45 - 1.jpg`. Esse valor sai diretamente de
  `storage.objects.name` — **não é montado nem normalizado** por código.
- A URL pública é resolvida **no servidor** (BFF), nunca no front, por
  `WorkoutRepository.getPublicMediaUrl(path)`, que apenas chama
  `supabase.storage.from("exercises").getPublicUrl(path)`. É concatenação de string
  (faz o percent-encoding), **sem rede e sem `service_role`**. O formato final é:

  ```
  {NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exercises/{caminho-encodado}
  ```

### Convenção de frames

Cada exercício com foto tem **2 arquivos** numa pasta. A ordenação por número de frame
define os papéis:

- frame de menor índice (ou arquivo sem número) → `image_start_path`;
- frame seguinte → `image_end_path`;
- `thumbnail_path` = `image_start_path` (capa = posição inicial).

---

## 3. `GET /api/v1/exercises`

Rota: `src/app/api/v1/exercises/route.ts` (somente `GET`, exige personal autenticado).
Não há endpoint novo — ele evoluiu via tipo `ExerciseListItem`.

Cada item retornado:

```jsonc
{
  "id": "…",
  "slug": "leg-press-45",
  "name": "Leg Press 45°",
  "description": "Foco em quadríceps com máquina.",
  "primary_muscle": "quadriceps",
  "equipment": "maquina",
  "mediaType": "image_pair",            // none | image_pair | gif | video
  "thumbnailPath": "Leg Press 45/Leg press 45 - 1.jpg",
  "imageStartPath": "Leg Press 45/Leg press 45 - 1.jpg",
  "imageEndPath": "Leg Press 45/Leg press 45 - 2.jpg",
  "thumbnailUrl": "https://…/storage/v1/object/public/exercises/Leg%20Press%2045/…",
  "imageStartUrl": "https://…",
  "imageEndUrl": "https://…"
}
```

Para `mediaType: "none"`, os `*Path`/`*Url` vêm `null` — o front deve ter fallback
visual (placeholder).

Camadas envolvidas:
`route.ts` → `WorkoutService.listExercises` → `WorkoutService.mapExerciseListItem`
(resolve as URLs via repo) → `WorkoutRepository.listExercises` (`is_active = true`,
ordenado por `name`).

---

## 4. Padrão de slug e nome

- **slug**: kebab-case, sem acento, ASCII. Estável (não renomear depois de usado).
  Ex.: `crucifixo-inclinado-halteres`.
- **name**: PT natural, com acento/maiúsculas. Ex.: `Crucifixo Inclinado com Halteres`.
- Sem duplicatas por caixa/acento/variação boba. Pastas ambíguas, duplicadas por caixa
  ou de teste **ficam de fora** (na carga inicial: `Cadeira Adutora` (dup de
  `Cadeira adutora`), `Elevacao unilateral` (ambígua) e `TESTE`).

---

## 5. Como adicionar um novo exercício

1. **Suba os arquivos** para o bucket `exercises` (frame inicial e final). Pode ser numa
   pasta com o nome do exercício. Anote os caminhos exatos (`storage.objects.name`).
2. **Insira a linha** com os caminhos exatos:

   ```sql
   insert into public.exercises
     (slug, name, description, primary_muscle, equipment,
      media_type, thumbnail_path, image_start_path, image_end_path)
   values
     ('novo-exercicio', 'Novo Exercício', 'Descrição curta.',
      'peitoral', 'halteres', 'image_pair',
      'Pasta/arquivo1.jpg', 'Pasta/arquivo1.jpg', 'Pasta/arquivo2.jpg')
   on conflict (slug) do update set
     name = excluded.name, description = excluded.description,
     primary_muscle = excluded.primary_muscle, equipment = excluded.equipment,
     media_type = excluded.media_type, thumbnail_path = excluded.thumbnail_path,
     image_start_path = excluded.image_start_path, image_end_path = excluded.image_end_path,
     is_active = true;
   ```

   Use `media_type = 'none'` e deixe os `*_path` nulos para exercício só-texto.

3. **Valide** que todo caminho gravado existe no Storage (deve retornar 0 linhas):

   ```sql
   select e.slug, p as path
   from public.exercises e,
        lateral unnest(array[e.thumbnail_path, e.image_start_path, e.image_end_path]) as p
   left join storage.objects o
     on o.bucket_id = 'exercises' and o.name = p
   where p is not null and o.name is null;
   ```

> A carga inicial dos 62 exercícios foi gerada lendo `storage.objects` (caminhos
> verbatim) e aplicando um mapa curado pasta → metadados, com validação de 0 caminhos
> quebrados. Nunca há match de imagem por nome em runtime.

---

## 6. Limitações atuais

- **Mídia = par de fotos**, não animação real. São 2 frames estáticos por exercício.
- **Descrições são templadas** (`Foco em <músculo> com <equipamento>.`) — placeholder de
  qualidade aceitável, a refinar.
- **4 exercícios sem mídia** (`agachamento-livre`, `supino-reto`, `remada-curvada`,
  `prancha`) por não terem pasta correspondente no Storage.
- **Sem categoria/tags estruturadas** além de `primary_muscle`/`equipment` (texto livre).
- **Sem músculos secundários, vídeo, ou variações ligadas**.
- O bucket tem objetos não usados (pasta `TESTE`, duplicata por caixa) — preservados, só
  não referenciados.

---

## 7. Pendência futura (GIF / vídeo real)

`media_type` já prevê `gif` e `video`. Quando houver mídia real:

- **`gif`**: usar um caminho único. Sugestão: reaproveitar `image_start_path` como o GIF
  e manter `image_end_path` nulo, ou (melhor no futuro) adicionar `animation_path text`.
- **`video`**: idem, com `video_path text` dedicado.

A evolução é aditiva (novas colunas nuláveis + ampliar o `check`), sem quebrar os
campos atuais. Decidir o esquema exato quando a mídia real existir, não antes.
