# 06 — Integração no app: onde e como aparece

## Como a navegação funciona hoje

Levantamento de [AppShell.tsx](../../src/app/app/AppShell.tsx) e [app-utils.ts](../../src/app/app/app-utils.ts):

- `buildNavigation()` monta uma lista única de itens por papel (aluno/personal), usada em **três lugares diferentes** com recortes distintos:
  - **Sidebar desktop** (`DesktopSidebar`): lista completa.
  - **Bottom nav mobile** (`MobileBottomNav`): `navigation.slice(0, 5)` — só os **5 primeiros** itens da lista viram ícone fixo embaixo.
  - **Menu overlay mobile** (`MobileOverlayMenu`): lista completa, aberta pelo ícone de hambúrguer — é onde ficam os itens que não couberam nos 5 do bottom nav.
- Navegação atual do aluno: `Início, Treinos, Chat Move, Galeria, Histórico, Perfil, Scan`. Ou seja, **o Scan já não está nos 5 slots do bottom nav** — só aparece na sidebar desktop e no menu overlay mobile.
- A descoberta principal do Scan no mobile não é a navegação — é o **card de destaque na home** (`StudentDailyHome`, ver [app/page.tsx:437-460](../../src/app/app/page.tsx)): bloco com ícone, badge "Novo", descrição curta e seta, dentro do fluxo natural de quem já abriu o app.

Essa distinção importa porque o Diário Alimentar tem um padrão de uso diferente do Scan: Scan é esporádico (tem inclusive um sistema de elegibilidade com `daysUntilNext`, pensado pra rodar a cada X dias). Diário Alimentar é, por natureza, **uso diário, várias vezes ao dia** (café, almoço, janta, lanche). Isso muda a prioridade de navegação — não dá pra tratar os dois da mesma forma só porque compartilham a mesma técnica de IA por trás.

## Recomendação de posicionamento

### 1. Home — não só um card, um resumo ao vivo

Para o Scan, um card-link que leva para outra tela faz sentido (ação pontual). Para o Diário, recomendo ir além do card: um **bloco de saldo do dia** já renderizado na própria home, no mesmo nível de destaque hoje ocupado pelo `WorkoutHero` (treino ativo) — não enterrado como mais um item de "acesso rápido".

- Anel de balanço (ver [05](05-frontend-animacao.md)) em miniatura + "faltam X kcal hoje" ou "você passou Y kcal da meta".
- Toque no bloco abre o diário do dia (lista de refeições já registradas + CTA "Registrar refeição").
- Sem meta configurada ainda: o bloco vira um convite ("Configure sua meta calórica diária") em vez de mostrar um anel vazio — mesmo princípio do `WorkoutHero` que trata estado "sem treino" com uma mensagem própria, não um vazio genérico.

Justificativa: o Scan usa link-card porque a ação em si (nova análise corporal) acontece raramente. O Diário precisa aparecer **como estado**, não só como atalho — é isso que faz o usuário voltar todo dia.

### 2. Navegação — entra na lista completa, decisão pendente sobre o bottom nav

Adicionar `{ href: "/app/diario", label: "Diário" }` em `buildNavigation()` para o papel `student` é direto. A pergunta em aberto é **se ele entra nos 5 slots do bottom nav mobile**, porque isso empurra um item existente para fora (hoje: Início, Treinos, Chat Move, Galeria, Histórico — o quinto, Histórico, seria o candidato a sair do bottom nav e ir pro menu overlay).

Dado que o Diário é pensado para uso diário/multi-toque por dia, ele é um bom candidato a **substituir Histórico** no bottom nav (Histórico é consulta ocasional, encaixa melhor no overlay). Mas essa é uma mudança que afeta a navegação de todos os alunos, não só quem usa o módulo novo — recomendo validar com você antes de mexer na ordem atual, não é algo para decidir sozinho na implementação.

Para o personal (trainer), o módulo em si não teria item de navegação próprio na v1 — quem registra a própria alimentação é o aluno. O acompanhamento do personal é tratado no ponto 4 abaixo.

### 3. Estrutura interna do módulo (dentro de `/app/diario`)

Espelhando a estrutura do Scan (`/app/scan` lista + `/app/scan/[scanId]` detalhe + `/app/scan/novo` wizard):

```
/app/diario                → dashboard do dia (anel, trilha de refeições, meta)
/app/diario/nova           → wizard de registro (prep → foto → contexto → revisão)
/app/diario/[entryId]      → detalhe de uma refeição já registrada (editar itens)
/app/diario/historico      → visão por dia/semana (gráfico de barras, ver 05)
/app/diario/meta           → configurar meta calórica diária (ou vir de onboarding)
```

### 4. Personal (trainer) — fora do escopo da v1, mas prever o gancho

O guia de regras de negócio ([REGRAS_NEGOCIO_MOVE.md](../REGRAS_NEGOCIO_MOVE.md)) já estabelece que o personal tem um módulo de **Acompanhamento** dos alunos. Faz sentido, numa v2, o personal ver o saldo calórico dos alunos vinculados dentro de `/app/acompanhamento` — mas isso depende de decisão de privacidade (o aluno precisa consentir compartilhar o diário alimentar com o personal, é dado sensível de saúde). Não está no escopo desta v1; deixo registrado aqui para não perder o fio quando chegarmos nesse ponto.

### 5. Notificações — gancho de retenção

O `AppShell` já tem um sistema de notificações (`NotificationsBell`, [notifications_foundation migration](../../supabase/migrations/20260605120000_notifications_foundation.sql)). Um lembrete leve ("Já registrou o almoço?") no fim da janela típica de uma refeição é um gancho natural de retenção para um módulo de uso diário — mas é uma decisão de produto sobre frequência/tom que também vale validar antes de implementar (notificação mal calibrada vira motivo de desinstalar o app, não de engajar).

## Resumo da recomendação

| Onde | Tratamento |
|---|---|
| Home (aluno) | Bloco de saldo do dia com destaque alto (não só card-link) |
| Sidebar desktop | Novo item "Diário" |
| Bottom nav mobile | Candidato a entrar nos 5 principais — **validar antes de tirar Histórico do lugar** |
| Menu overlay mobile | Sempre presente (lista completa) |
| Personal/trainer | Sem tela própria na v1; gancho futuro em Acompanhamento (depende de consentimento) |
| Notificações | Lembrete de refeição — proposta a validar separadamente |
