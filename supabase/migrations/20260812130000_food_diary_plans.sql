-- ─────────────────────────────────────────────────────────────────────────────
-- Diário Alimentar 2.0 — plano pessoal VERSIONADO (objetivo + motor energético)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- WHY
-- O Diário responde "estou seguindo meu objetivo hoje?". Isso exige um PLANO
-- pessoal por usuário: objetivo (perder/manter/ganhar), TMB (fórmula única do
-- MoveScan) + origem, fator de rotina e saldo planejado — de onde deriva a
-- FAIXA-ALVO do dia. O plano é VERSIONADO: ao mudar objetivo/TMB/rotina, a versão
-- anterior é preservada (archived, com superseded_at) e a nova passa a valer a
-- partir de `effective_from`. Assim o Histórico sabe qual plano valia em cada dia.
--
-- ADITIVA E SEGURA
--  • Cria tabelas/colunas NOVAS — nada existente é recriado, renomeado ou apagado.
--  • Adiciona colunas OPCIONAIS/`default` em food_diary_entries (texto/docinho) e
--    food_diary_items (ambiguidade por item). Linhas atuais recebem defaults.
--  • Ownership em public.profiles(id) (o Diário é role-agnostic).
--  • Preserva daily_calorie_targets e TODOS os dados existentes. NÃO converte
--    metas antigas silenciosamente.
--  • RLS habilitada sem policies (deny-by-default) — o BFF acessa via service role.
--
-- NÃO APLICAR AUTOMATICAMENTE. Revisar e rodar manualmente no Supabase SQL Editor.
-- Requer que a migration role-agnostic (20260812120000, PR aberto) já esteja
-- aplicada em produção — o que já ocorreu (FKs do Diário apontam para profiles).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─── 1. food_diary_plans (versionado) ─────────────────────────────────────────
create table public.food_diary_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- Versionamento: uma versão ativa por usuário; versões antigas ficam 'archived'
  -- com superseded_at preenchido. effective_from é o dia-calendário local em que a
  -- versão passa a valer — o Histórico escolhe, para cada dia, a versão de maior
  -- effective_from <= dia.
  status text not null default 'active',
  effective_from date not null,
  superseded_at timestamptz,

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
    check (jsonb_typeof(tmb_input) = 'object'),
  -- Invariante do objetivo: o saldo planejado NÃO pode contradizer o objetivo.
  constraint food_diary_plans_goal_balance_check check (
    (goal = 'lose' and planned_balance_kcal <= 0)
    or (goal = 'maintain' and planned_balance_kcal = 0)
    or (goal = 'gain' and planned_balance_kcal >= 0)
  ),
  -- Consistência de versionamento: ativa não tem superseded_at; arquivada tem.
  constraint food_diary_plans_version_consistency_check check (
    (status = 'active' and superseded_at is null)
    or (status = 'archived' and superseded_at is not null)
  )
);

-- No máximo UMA versão ativa por usuário.
create unique index food_diary_plans_one_active_per_user
  on public.food_diary_plans (user_id)
  where status = 'active';

-- Histórico: buscar a versão vigente em um dia (maior effective_from <= dia).
create index idx_food_diary_plans_user_effective
  on public.food_diary_plans (user_id, effective_from desc);

create trigger food_diary_plans_set_updated_at
  before update on public.food_diary_plans
  for each row execute function public.set_updated_at();

-- Deny-by-default: RLS ligada, zero policies (BFF usa service role).
alter table public.food_diary_plans enable row level security;

-- ─── 1b. RPC: upsert versionado atômico ───────────────────────────────────────
-- Troca de plano protegida contra corrida/estado inconsistente:
--  • sem plano ativo         → insere a 1ª versão (effective_from = hoje);
--  • edição no MESMO dia      → atualiza a versão ativa in-place (não há histórico
--                               de dias anteriores a preservar);
--  • edição em dia posterior  → arquiva a versão ativa (superseded_at = now) e
--                               insere uma NOVA versão ativa (effective_from = hoje).
-- FOR UPDATE serializa trocas concorrentes do mesmo usuário. search_path explícito.
create or replace function public.food_diary_upsert_plan(
  p_user_id uuid,
  p_today date,
  p_goal text,
  p_tmb_kcal integer,
  p_tmb_source text,
  p_tmb_input jsonb,
  p_scan_id uuid,
  p_routine_level text,
  p_routine_factor numeric,
  p_planned_balance_kcal integer,
  p_tolerance_kcal integer
) returns public.food_diary_plans
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.food_diary_plans;
  v_result public.food_diary_plans;
begin
  select * into v_current
  from public.food_diary_plans
  where user_id = p_user_id and status = 'active'
  for update;

  -- Versão ativa começou num dia anterior → arquiva e força nova versão.
  if v_current.id is not null and v_current.effective_from < p_today then
    update public.food_diary_plans
      set status = 'archived', superseded_at = now()
      where id = v_current.id;
    v_current := null;
  end if;

  if v_current.id is null then
    insert into public.food_diary_plans (
      user_id, status, effective_from, goal, tmb_kcal, tmb_source, tmb_input,
      scan_id, routine_level, routine_factor, planned_balance_kcal, tolerance_kcal
    ) values (
      p_user_id, 'active', p_today, p_goal, p_tmb_kcal, p_tmb_source, p_tmb_input,
      p_scan_id, p_routine_level, p_routine_factor, p_planned_balance_kcal, p_tolerance_kcal
    )
    returning * into v_result;
  else
    update public.food_diary_plans set
      goal = p_goal,
      tmb_kcal = p_tmb_kcal,
      tmb_source = p_tmb_source,
      tmb_input = p_tmb_input,
      scan_id = p_scan_id,
      routine_level = p_routine_level,
      routine_factor = p_routine_factor,
      planned_balance_kcal = p_planned_balance_kcal,
      tolerance_kcal = p_tolerance_kcal
    where id = v_current.id
    returning * into v_result;
  end if;

  return v_result;
end;
$$;

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
-- A IA marca a IDENTIDADE do alimento (identified/ambiguous/unknown) e, quando
-- ambígua, as alternativas plausíveis — para o usuário escolher antes de confirmar.
-- Linhas atuais recebem 'identified' e [].
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
