# 05 — Frontend e animação

## Referência: o que o Fantasy Hike faz bem

Fantasy Hike transforma passos caminhados em progresso numa jornada de fantasia (do "buraco de hobbit" até a "Montanha da Fogueira"). Elementos de design identificados na pesquisa ([mwm.ai](https://mwm.ai/apps/fantasy-hike/1557127861), [Medium — Emma Coath](https://medium.com/@emmacoath/walking-1-780-miles-over-900-days-ui-ux-review-of-fantasy-hike-app-44cb1ea0b16f)):

- **Métrica real vira metáfora narrativa** — distância caminhada não aparece só como número, vira posição num mapa ilustrado.
- **Mapa/jornada ilustrado à mão**, com paisagens ricas (não fotorealista, não ícone genérico) — "lovingly crafted drawings".
- **Sistema de conquistas** com badges visuais atrelados a marcos, não só uma lista de texto.
- **Avatar/personagem customizável** e visão social do progresso de amigos no mesmo mapa.
- **Dashboard de estatística limpo** por trás da camada narrativa (gráfico de barras diário/semanal, "média diária", "melhor dia") — a fantasia é a camada de superfície, o dado por baixo é direto.

## O que NÃO copiar (e por quê)

O usuário já observou isso corretamente: Fantasy Hike é mobile e tem um Design System próprio. Duas coisas especificamente não se encaixam no move-web:

1. **Pele de fantasia literal** (hobbits, Mount Doom, personagens de RPG) — o move-web é usado por personal trainers e alunos numa relação profissional; uma narrativa de fantasia genérica destoaria do resto do produto (treinos, chat, scan corporal) e não tem relação temática com nutrição.
2. **Avatar/personagem jogável** — adiciona complexidade de produto (customização, assets de personagem) sem ligação clara com o objetivo do módulo (registrar refeições rápido, ver saldo calórico).

O que vale a pena importar não é a "pele", é o **mecanismo emocional**: transformar um número frio (calorias) em progresso visual celebrado, com identidade visual própria (ilustração, não só ícone) e feedback de marco/conquista. Isso dá para fazer sem sair do DS atual.

## Tradução para o nosso Design System

O move-web já tem uma identidade consistente: paleta em CSS custom properties (`--accent: #f26a1b`, tema claro/escuro via `[data-theme]`, ver [globals.css](../../src/app/globals.css)), tipografia Manrope + Space Grotesk, ícones `lucide-react` de traço fino (`strokeWidth: 1.8`). A proposta abaixo não cria uma paleta nova — usa os tokens existentes com mais ousadia de composição do que o resto do app usa hoje.

### 1. Anel de Balanço Calórico — peça central (hero)

Hoje o `ScanProgressRing` ([src/app/app/scan/_components/ScanProgressRing.tsx](../../src/app/app/scan/_components/ScanProgressRing.tsx)) é um único anel SVG simples. Para o Diário, a proposta é um **anel duplo/triplo camadas**, no espírito Apple Fitness, mas na paleta do Move:

- Anel externo: consumido vs. meta (laranja `--accent`, mesma cor de marca).
- Anel interno: gasto por atividade vs. estimativa (`--success`, verde já usado para estados positivos).
- Centro: saldo do dia em número grande (`font-display`, Space Grotesk — mesma fonte de destaque já usada no logo/títulos).
- Animação de preenchimento **spring** (não linear) ao carregar a tela — o anel "acelera e desacelera" como o gauge do Fantasy Hike quando você fecha uma meta, em vez do `transition-all duration-500 ease-out` estático que o Scan usa hoje.
- Quando o saldo bate a meta do dia: pulso de glow sutil no anel (box-shadow animado com a cor de accent) — o equivalente ao "momento de celebração" de badge do Fantasy Hike, sem precisar de confete ou modal.

### 2. Trilha do dia — jornada sem pele de fantasia

Em vez do mapa de RPG, uma **trilha horizontal simples** representando o dia: café da manhã → almoço → lanche → jantar como nós/checkpoints numa linha, cada um preenchido conforme a refeição é registrada. É a mesma ideia estrutural do mapa do Fantasy Hike (progresso real virando posição visual num percurso) sem a narrativa literal — aqui o "destino" é simplesmente fechar o dia dentro da meta.

- Nó preenchido = refeição registrada (mostra kcal em miniatura ao tocar/hover).
- Nó vazio = refeição ainda não registrada (estado convidativo, não uma cobrança).
- Linha conectando os nós preenche com gradiente de accent conforme o dia avança — reaproveita a mesma barra de progresso do `ScanStepper` (`bg-accent`, `transition-all duration-300 ease-out`), só que horizontal e com nós maiores.

### 3. Marcos e constância — versão leve do "sistema de conquistas"

Sem badges ilustrados de fantasia, mas com o mesmo princípio: reconhecer marcos visualmente, não só em texto.

- Sequência de dias registrando refeições ("7 dias seguidos") — chip pequeno com ícone (`Flame`, já usado em `_content.ts` do Scan) e leve animação de entrada (scale + fade) quando o marco é atingido.
- "Meta batida" — o mesmo pulso de glow do anel (item 1), reaproveitado como linguagem consistente de "conquista" no módulo inteiro, em vez de inventar um segundo sistema visual.

### 4. Estatística por trás da camada bonita

Como no Fantasy Hike, a camada "bonita" não substitui o dado direto — ela fica em cima. Mantemos gráfico de barras simples (dia a dia da semana, consumido vs. meta) usando o mesmo padrão de `MetricCard`/ícone `BarChart3` já usado na home (`src/app/app/app-utils.ts`, `app-ui`), sem introduzir uma biblioteca de gráficos nova para isso — SVG simples resolve.

## Reaproveitamento de componentes existentes

Não começamos do zero — o módulo Scan já forneceu boa parte do esqueleto:

| Componente Scan | Reaproveitamento no Diário |
|---|---|
| `ScanStepper` | Wizard de registro de refeição (prep → foto → contexto → revisão) |
| `ScanPhotoCapture` | Captura de foto do prato (mesmo padrão de input de câmera + preview) |
| `ScanGuideCard` / `ScanCompareCard` | Tela de preparo (objeto de referência certo/errado) |
| `ScanProgressRing` | Vira a base técnica (SVG, sem dependência) do Anel de Balanço, evoluído para múltiplas camadas |
| Padrão `card-themed` + `border-accent/30` do CTA de home | Card de destaque do módulo na home (ver [06](06-integracao-no-app.md)) |

## Animação: CSS puro vs. biblioteca

Hoje o move-web **não tem nenhuma biblioteca de animação** (`package.json` só tem Tailwind/React puro) — todo o polish do Scan é feito com transições CSS (`transition-all`, `duration-500`, `ease-out`) e `@media (prefers-reduced-motion: reduce)` já é respeitado globalmente em `globals.css`.

Recomendação: **continuar em CSS/SVG puro para 90% do módulo** (é o que já funciona bem no Scan) e considerar adicionar a biblioteca `motion` (sucessora do Framer Motion) **apenas** se formos implementar:
- a animação spring do anel de balanço (mola natural é difícil de replicar bem só com `cubic-bezier`);
- orquestração de entrada em sequência dos nós da trilha do dia (stagger).

Isso é uma decisão de dependência nova — não vou adicionar nada ao `package.json` sem validar com você antes, é só um ponto em aberto para quando formos implementar de fato.

## Hierarquia de objetivos e estados vazios (decisão validada no protótipo)

A página tem **um** objetivo primário e dois secundários, nessa ordem — e todo o layout respeita essa hierarquia:

1. **Primário: registrar a refeição com o mínimo de atrito.** É o CTA de maior destaque da tela, sempre visível. Tudo o mais existe para alimentar ou motivar esse gesto.
2. **Secundário: entender o dia num relance.** O anel de balanço responde "quanto ainda cabe hoje?" sem exigir leitura de números pequenos.
3. **Terciário: acompanhar o progresso.** Fica na aba Histórico — nunca compete com os dois primeiros.

**Primeiro uso (sem meta definida):** o anel não renderiza vazio — o hero vira um card de definição de meta com valor sugerido em um toque (na versão final, derivado da TMB do Scan) ou input manual. Um checklist "Primeiros passos" (meta → primeira refeição → gasto) guia a ativação, no mesmo padrão do `StepperChecklist` da home, e some quando o essencial está completo. A aba Histórico fica desabilitada até existir meta (sem meta não há "dentro/fora da meta" para mostrar). Trilha e lista vazias usam mensagens convidativas, nunca tela em branco.

## Macros do dia: origem dos alvos e camadas de profundidade

**De onde vem o alvo de cada macro** (ex.: "Proteínas — 15g de 138g") — decisão em três camadas, na ordem de resolução:

1. **Automático (padrão, v1):** derivado da meta de kcal com split 25% proteína / 45% carboidrato / 30% gordura (4-4-9 kcal/g). Funciona para 100% dos usuários sem nenhuma configuração — ninguém trava no onboarding por causa disso.
2. **Personal sobrescreve (v2):** o personal do aluno define split personalizado pelo objetivo (ex.: high protein para hipertrofia). Os campos `target_protein_g`/`target_carb_g`/`target_fat_g` já existem na tabela `daily_calorie_targets` proposta em [04](04-modelagem-dados.md) — o schema já está pronto para isso.
3. **Aluno ajusta** se não tiver personal vinculado.

A origem do alvo é **explicada na própria UI** (botão ⓘ no painel) — indicador que não se explica é decoração.

**Contra o "bonito mas não entendi", duas camadas de profundidade** (validadas no protótipo):

- **Drill-down por macro:** tocar em "Proteínas" expande o ranking de alimentos do dia que contribuíram para aquele macro (frango 38g, bife 32g…), com barras proporcionais. Responde "de onde veio esse número?" e educa o usuário sobre a própria alimentação — sem poluir o estado fechado.
- **Análise do dia:** ação explícita ("Analisar meu dia") que devolve um resumo do balanço + até 3 dicas acionáveis ("faltam ~31g de proteína — 150g de frango resolvem", "sobram X kcal para o jantar"). **Insight de implementação:** no protótipo (e possivelmente na v1 real) as dicas vêm de regras determinísticas sobre os dados do dia — custo zero, resposta instantânea, já personalizadas. IA generativa entra depois via **Chat Move**: o padrão de context-trigger já existe no BFF (`scanUnderstandResultTrigger` faz isso para o Scan) — um `foodDiaryUnderstandDayTrigger` abriria o chat com o payload do dia. Sempre com disclaimer: sugestões automáticas não substituem personal/nutricionista.

## Celebração de registro (gamificação estilo Duolingo)

Validado no protótipo: a celebração rápida "não registra" emocionalmente. A sequência final é teatral e encadeada (~2s até o botão aparecer):

1. Check com mola lenta (0,9s) + três ondas expandindo dele
2. Chuva de confete caindo com balanço lateral e giro 3D de papel (2,2–3,6s por peça, não um burst instantâneo)
3. kcal da refeição sobe com count-up (0 → total em 1,1s)
4. Macros da refeição (P/C/G) aparecem
5. Selo gamificado: "2ª refeição de hoje" / "Dia completo!" (com Flame, cores do DS)
6. Só então o botão "Ver meu dia"

Tudo em CSS puro (duas animações compostas para o confete: queda no wrapper, balanço+giro no filho), respeitando `prefers-reduced-motion`.

## Assets de ilustração

O único ponto onde vale investimento visual "fora da caixa" de verdade é a tela de preparo de foto (item de maior impacto em precisão, ver [03](03-ux-fotos-inputs.md)) e os estados vazios/celebrativos. Proposta: manter o mesmo espírito de traço fino do `lucide-react` (não ilustração colorida estilo game) para não destoar do resto do app — ilustração de linha, monocromática com um toque de accent, não pintura estilo Fantasy Hike. É a mesma lógica de "pegar o mecanismo, não a pele" aplicada à arte.
