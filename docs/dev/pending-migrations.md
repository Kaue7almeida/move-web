# Migrations Pendentes e Validacao Operacional

## Contexto

O Claude Code cria migrations localmente no diretorio `supabase/migrations/`, seguindo o padrao Supabase de nomenclatura (`YYYYMMDDHHMMSS_descricao.sql`). Porem, o Claude Code nao possui acesso ao MCP/Supabase remoto para aplicar essas migrations.

### Fluxo de trabalho

1. **Claude Code** cria o arquivo `.sql` em `supabase/migrations/` e atualiza `database.types.ts`.
2. **Agente com MCP/Supabase** (VS Code ou outro ambiente com acesso remoto) aplica a migration com `supabase db push` ou via Supabase Dashboard.
3. **Desenvolvedor** executa os testes manuais e marca a migration como validada neste documento.

### Regra fundamental

Features que dependem de migrations pendentes **nao devem ser consideradas validadas em runtime** ate que a migration seja aplicada no banco remoto e os testes funcionais confirmem o comportamento esperado.

---

## Migrations

### 1. `20260528120000_workout_sessions.sql`

**Status:** APLICADA (2026-05-29)

**Arquivo:** `supabase/migrations/20260528120000_workout_sessions.sql`

**Objetivo:**
Permitir que o aluno execute um treino aplicado pelo personal. A migration cria as estruturas necessarias para salvar sessoes de treino e as series executadas com repeticoes, carga e observacoes.

**Tabelas criadas:**

| Tabela | Descricao |
|---|---|
| `workout_sessions` | Sessao de execucao de um treino aplicado. Vincula aluno, personal e treino. |
| `workout_session_sets` | Series individuais executadas dentro de uma sessao, com reps, carga e notas. |

**Colunas principais:**

`workout_sessions`:
- `id` (uuid, PK)
- `student_user_id` (uuid, FK student_profiles)
- `trainer_user_id` (uuid, FK trainer_profiles)
- `student_workout_id` (uuid, FK student_workouts, cascade)
- `status` (text, constraint: `in_progress` | `completed`)
- `started_at` (timestamptz)
- `completed_at` (timestamptz, obrigatorio quando status = completed)
- `duration_seconds` (integer, >= 0)
- `notes` (text)
- `created_at`, `updated_at` (timestamptz)

`workout_session_sets`:
- `id` (uuid, PK)
- `workout_session_id` (uuid, FK workout_sessions, cascade)
- `student_workout_exercise_id` (uuid, FK student_workout_exercises, set null)
- `exercise_name` (text, not blank)
- `set_number` (integer, >= 1)
- `target_reps_text` (text)
- `performed_reps` (integer, >= 0)
- `load_kg` (numeric, >= 0, default 0)
- `notes` (text)
- `completed` (boolean, default true)
- `created_at`, `updated_at` (timestamptz)

**Indexes criados:**
- `idx_workout_sessions_student_user_id`
- `idx_workout_sessions_student_workout_id`
- `idx_workout_sessions_status`
- `idx_workout_session_sets_workout_session_id`

**Triggers:**
- `set_workout_sessions_updated_at` (before update, usa `public.set_updated_at()`)
- `set_workout_session_sets_updated_at` (before update, usa `public.set_updated_at()`)

**RLS Policies:**
- `workout_sessions_select_own`: aluno so le as proprias sessoes (`auth.uid() = student_user_id`)
- `workout_session_sets_select_own`: aluno so le sets das proprias sessoes (via join com `workout_sessions`)

**Constraints:**
- `workout_sessions_status_check`: status in (`in_progress`, `completed`)
- `workout_sessions_completed_requires_completed_at_check`: status completed exige completed_at
- `workout_sessions_duration_check`: duration_seconds >= 0 ou null
- `workout_session_sets_exercise_name_not_blank_check`
- `workout_session_sets_set_number_check`: >= 1
- `workout_session_sets_performed_reps_check`: >= 0
- `workout_session_sets_load_kg_check`: >= 0

**Impacto no produto:**
- Habilita a feature de execucao de treino pelo aluno em `/app/treinos`.
- Endpoints afetados: `POST /api/v1/student/workouts/[id]/sessions`, `POST /api/v1/student/workout-sessions/[id]/complete`.
- Sem essa migration, os endpoints retornam erro 500 ao tentar inserir nas tabelas inexistentes.

#### Checklist de aplicacao

- [x] Aplicar migration no Supabase remoto (aplicada via Management API em 2026-05-29)
- [x] Confirmar existencia da tabela `workout_sessions`
- [x] Confirmar existencia da tabela `workout_session_sets`
- [x] Confirmar indexes (`idx_workout_sessions_student_user_id`, `idx_workout_sessions_student_workout_id`, `idx_workout_sessions_status`, `idx_workout_session_sets_workout_session_id`)
- [x] Confirmar triggers (`set_workout_sessions_updated_at`, `set_workout_session_sets_updated_at`)
- [x] Confirmar RLS habilitado em ambas as tabelas (`relrowsecurity: true`)
- [x] Confirmar policies (`workout_sessions_select_own`, `workout_session_sets_select_own`)
- [x] Confirmar constraints de status, set_number, performed_reps e load_kg

#### Checklist de teste funcional

**Testes de banco (via Management API, 2026-05-29):**

- [x] Personal cria treino com status `active` (treino pre-existente: `35e71387`)
- [x] Personal aplica treino para aluno vinculado (aluno `863903b2`, personal `01e6804d`)
- [x] Aluno clica "Iniciar treino" (INSERT session: `dd56cb68`, status `in_progress`)
- [x] Aluno preenche reps e carga para cada serie (12 sets: 3 Agachamento + 4 Desenvolvimento + 5 Prancha)
- [x] Aluno clica "Concluir treino" (UPDATE status `completed`, duration 2700s)
- [x] Verificar registro em `workout_sessions` no banco — OK
- [x] Verificar registros em `workout_session_sets` no banco — 12 registros OK
- [x] Validar que `student_user_id` corresponde ao aluno — `863903b2` OK
- [x] Validar que `trainer_user_id` corresponde ao personal — `01e6804d` OK
- [x] Validar que `student_workout_id` corresponde ao treino — `35e71387` OK
- [x] Validar que `status` = `completed` — OK
- [x] Validar que `completed_at` esta preenchido — `2026-05-29 00:00:57` OK
- [x] Validar que `performed_reps` e `load_kg` correspondem ao informado — OK
- [x] Testar com serie desmarcada — Prancha set 5 com `completed: false` OK
- [x] Constraint: `completed` sem `completed_at` rejeita — `workout_sessions_completed_requires_completed_at_check` OK
- [x] Constraint: `exercise_name` em branco rejeita — `workout_session_sets_exercise_name_not_blank_check` OK
- [x] Constraint: `set_number = 0` rejeita — `workout_session_sets_set_number_check` OK
- [x] Trigger `set_updated_at` atualiza `updated_at` apos UPDATE — OK
- [x] Cascade delete: apagar session apaga sets — OK (12 sets removidos)

**Testes de UI (pendentes — requerem teste manual no browser):**

- [ ] Aluno acessa `/app/treinos` e ve o treino na lista
- [ ] Aluno clica no card e ve o detalhe do treino
- [ ] Tela de sucesso aparece com mensagem de parabens
- [ ] Testar validacao: submeter sem preencher reps deve mostrar erro
- [ ] Testar tema claro e escuro em todas as telas do fluxo

**Dados de teste limpos:** sessao `dd56cb68` e 12 sets removidos apos validacao.

#### Criterio de validacao

A fase de execucao de treino pelo aluno so deve ser considerada **validada** quando:
1. ~~A migration estiver aplicada no banco remoto.~~ ✅ Aplicada 2026-05-29
2. Todos os itens do checklist de teste funcional estiverem marcados. (parcial — testes de banco OK, testes de UI pendentes)
3. Os registros no banco estiverem consistentes com os dados informados na UI.

**Status atual:** APLICADA — schema e constraints validados no banco. Faltam testes manuais de UI no browser para promover a VALIDADA.

---

## Regras para proximas migrations

Toda migration criada pelo Claude Code deve ser registrada neste documento seguindo o template abaixo:

```
### N. `YYYYMMDDHHMMSS_descricao.sql`

**Status:** PENDENTE | APLICADA | VALIDADA

**Arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_descricao.sql`

**Objetivo:**
Descricao curta do que a migration resolve e por que e necessaria.

**Tabelas/colunas criadas ou alteradas:**
Lista das mudancas no schema.

**Impacto no produto:**
Quais features dependem dessa migration. Quais endpoints sao afetados.

#### Checklist de aplicacao
- [ ] Itens de verificacao de schema...

#### Checklist de teste funcional
- [ ] Itens de teste manual...

#### Criterio de validacao
Quando considerar a feature validada.
```

**Campos de status:**
- **PENDENTE**: migration criada, aguardando aplicacao no banco remoto.
- **APLICADA**: migration aplicada, aguardando testes funcionais.
- **VALIDADA**: migration aplicada e testes funcionais confirmados.
