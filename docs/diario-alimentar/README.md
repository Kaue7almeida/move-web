# Diário Alimentar — proposta de módulo

> Status: **pesquisa/proposta**, nada implementado ainda. Este diretório documenta o desenho do módulo antes da primeira linha de código, para validação.

## O que é

Um diário calórico dentro do move-web: o aluno fotografa o prato, a IA identifica os ingredientes e estima gramatura/calorias/macros, o aluno revisa e confirma, e o app acumula um saldo calórico do dia — consumo (refeições) vs. gasto (atividade/meta) — apresentado de forma visual e motivadora, não como planilha.

## Por que este desenho parte do módulo Scan

O move-web já resolve, para composição corporal, exatamente o mesmo tipo de problema técnico que o Diário Alimentar precisa resolver para comida: extrair dados estruturados e confiáveis de uma foto usando um modelo de visão, com validação em camadas e um fluxo de revisão humana antes de persistir. Em vez de desenhar a arquitetura do zero, todos os documentos abaixo partem do padrão já validado em produção no [módulo Scan](../../src/app/app/scan) (`OpenAiScanClient`, `scan_analyses`/`scan_photos`, wizard de steps, componentes de UI) e adaptam para o domínio nutricional — que tem um problema adicional que o Scan não tem: precisão de porção/gramatura a partir de uma imagem 2D é um problema conhecido e mal resolvido pelo mercado inteiro (ver benchmark).

## Documentos

| Doc | Conteúdo |
|---|---|
| [01-benchmark-apps.md](01-benchmark-apps.md) | Como MyFitnessPal, Cal AI, Foodvisor, Yazio, Lose It! e Cronometer resolvem (ou não) o mesmo problema — precisão relatada, correção manual, modelo de negócio |
| [02-metodo-ia-estimativa.md](02-metodo-ia-estimativa.md) | Método técnico: por que confiar só na IA para nutrição não funciona, abordagem híbrida IA (visão) + base de dados (TACO/USDA) para os números, schema JSON estruturado proposto |
| [03-ux-fotos-inputs.md](03-ux-fotos-inputs.md) | Instruções para o usuário antes da foto (objeto de referência é o item de maior impacto), inputs complementares opcionais, fluxo de wizard |
| [04-modelagem-dados.md](04-modelagem-dados.md) | Tabelas Supabase propostas (`food_diary_entries`, `food_diary_items`, `daily_calorie_targets`, `activity_energy_entries`), storage, RLS, estrutura de módulo BFF |
| [05-frontend-animacao.md](05-frontend-animacao.md) | Referência visual do Fantasy Hike, o que adaptar (mecanismo, não a pele de fantasia) para o DS atual do move-web: anel de balanço em camadas, trilha do dia, marcos de constância |
| [06-integracao-no-app.md](06-integracao-no-app.md) | Onde o módulo aparece: home (bloco de saldo, não só card-link), navegação (sidebar/bottom nav/overlay), papel do personal, notificações |

## Decisões-chave já tomadas nesta proposta

- **Nome técnico**: `food-diary` / `foodDiary` (rota de usuário em português: `/app/diario`) — evita colisão com o nome ilustrativo `student-diary` usado como exemplo no [GUIA_DESENVOLVIMENTO_WEB_BFF_MOVE.md](../GUIA_DESENVOLVIMENTO_WEB_BFF_MOVE.md).
- **IA estima gramas, banco de dados calcula nutrientes** — a IA nunca "inventa" calorias/macros; ela identifica itens e estima porção, e um lookup em TACO (prioridade, base brasileira) / USDA (fallback) converte em valores nutricionais. É a decisão técnica mais importante do documento 02 e a que mais diferencia o Move dos concorrentes mais fracos do benchmark.
- **Revisão do usuário é obrigatória antes de salvar** — nenhum app sério do mercado pula esse passo, e a arquitetura do Scan já modela isso bem (step `review` do wizard).
- **Não copiar a "pele" do Fantasy Hike, copiar o mecanismo** — narrativa de fantasia não combina com o tom do produto; progresso visual celebrado e trilha do dia sim.
- **Home ganha um bloco de saldo ao vivo**, não só um card-link como o Scan — porque o padrão de uso é diário, não esporádico.
- **Divulgação progressiva contra excesso de informação** (validada no protótipo `/lab/diario-7k2x`): a tela "Hoje" fica enxuta (anel, trilha, refeições) e a carga analítica vai para uma aba "Histórico" (consumo vs. meta por dia, balanço acumulado, variação de peso estimada a ~7.700 kcal/kg). Metas de macro são derivadas da meta de kcal (25% P / 45% C / 30% G) em vez de mais um formulário. Refeições fora do padrão usam o tipo "extra", fora da trilha de âncoras.
- **Hierarquia de objetivos + primeiro uso** (fechada no protótipo, ver seção em [05](05-frontend-animacao.md)): objetivo primário é registrar refeição; sem meta definida o hero vira setup de meta com sugestão em um toque (futura TMB do Scan) + checklist "Primeiros passos"; Histórico bloqueado até haver meta. Celebração de registro é lenta e teatral (confete em queda, count-up, selo "Nª refeição de hoje") — gamificação estilo Duolingo em CSS puro.
- **Alvos de macro em camadas** (ver [05](05-frontend-animacao.md)): automático por padrão (25/45/30 da meta de kcal), personal sobrescreve na v2 (campos já previstos em `daily_calorie_targets`), aluno ajusta se não tiver personal. Contra indicador-decoração: drill-down por macro (quais alimentos contribuíram) e "Análise do dia" com dicas por regras determinísticas (IA generativa depois, via context-trigger do Chat Move como o Scan já faz).

## Em aberto (precisa de validação antes de implementar)

- Se o Diário entra nos 5 slots do bottom nav mobile no lugar de Histórico (ver [06](06-integracao-no-app.md)).
- Se/quando adicionar uma biblioteca de animação (`motion`) para a animação spring do anel — hoje o projeto não tem nenhuma dependência de animação (ver [05](05-frontend-animacao.md)).
- Consentimento de compartilhar o diário com o personal no módulo de Acompanhamento (v2, fora do escopo desta proposta).
- Estratégia de matching de nome de ingrediente contra a base TACO/USDA (fuzzy search/embeddings) — ponto técnico de implementação, não de desenho.
