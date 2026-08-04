# 01 — Benchmark de apps concorrentes

Pesquisa dos principais apps de nutrição que já oferecem estimativa de calorias/macros a partir de foto de prato. Objetivo: entender o que funciona, onde eles falham, e o que vale copiar ou evitar no Move.

## Tabela comparativa

| App | Como captura | Precisão relatada | Correção manual | Modelo de negócio |
|---|---|---|---|---|
| **MyFitnessPal — Meal Scan** | Aponta a câmera e "paira" sobre o prato (live detection) ou envia foto depois; sugere itens verificados do banco de dados do app | ~71% de acerto em benchmark independente ([ai-food-tracker.com](https://ai-food-tracker.com/reviews/myfitnesspal/)) | Sim — usuário revisa e ajusta porção antes de logar a refeição inteira em 1 toque | Feature exclusiva do Premium |
| **Cal AI** | Foto única do prato | 85–92% em alimentos simples e bem visíveis; **subestimativa sistemática de 25–50%** em pratos mistos (comida com molho escondido, recheios) ([nutrola.app](https://nutrola.app/en/blog/cal-ai-review-2026), [askvora.com](https://askvora.com/blog/cal-ai-acquisition-photo-food-logging)) | Sim, mas banco de dados nutricional próprio é menor que concorrentes → menos preciso em itens de marca/restaurante | App pago (assinatura), foco em velocidade > precisão |
| **Foodvisor** | Foto única, com dicas visuais para melhorar o enquadramento | ±9–11% MAPE (erro percentual médio) — melhor da categoria em teste comparativo ([bestapprankings.com](https://bestapprankings.com/en/articles/best-photo-food-recognition-apps-ranked-2026/)) | Correção necessária em 15–22% dos registros, principalmente pratos caseiros/mistos | Freemium, scan por foto é o carro-chefe |
| **Yazio — AI Calorie Counter** | Foto única | ±15–20% MAPE — pior desempenho entre os testados | Sim | Freemium |
| **Lose It! — Snap It** | Foto única | Tecnologia mais antiga: identifica **categoria** do alimento, não estima porção específica (perde feio de Cal AI em teste de precisão de foto) | Sim, mas com base mais fraca | Freemium |
| **Cronometer** | Não tem scan por IA — foco em busca manual/verificada em base nutricional robusta (inclui micronutrientes) | N/A (não é o forte do app) | Manual desde o início | Freemium, público mais "power user" |
| **SnapCalorie** | Foto única, promete estimar volume 3D | Divulga alta precisão via modelagem 3D do prato, mas é nicho e pouco testado por terceiros | Sim | App pago dedicado |

## Padrões que se repetem (e valem a pena copiar)

1. **Nenhum app confia 100% na IA sem revisão do usuário.** Todos — mesmo os "melhores" (Foodvisor) — pedem confirmação/edição da porção antes de salvar. Isso não é um detalhe de UX, é estrutural: a foto sozinha nunca é suficiente.
2. **O ponto fraco universal é o prato misto/caseiro** (molhos, óleo de cozinha, recheios escondidos) — não o alimento isolado (fruta, ovo, filé). Toda a estratégia de produto deve assumir que a IA erra mais aqui e compensar com input do usuário, não tentar "resolver" só com um prompt melhor.
3. **Apps com banco de dados nutricional verificado por trás (MyFitnessPal, Foodvisor) performam melhor que os que dependem só do modelo de visão "inventar" os macros** (Cal AI). Isso confirma a abordagem que detalhamos em [02-metodo-ia-estimativa.md](02-metodo-ia-estimativa.md): usar a IA para *identificar e estimar gramas*, e uma base nutricional confiável para *calcular calorias/macros*.
4. **Fluxo recomendado por reviewers**: tirar a foto e corrigir **na hora** (janela de ~10s), não no fim do dia de memória — reforça a importância de um passo de revisão rápido e de baixo atrito logo após a análise, e não um "editar depois" enterrado em outra tela.

## O que evitar

- Confiar apenas na foto para pratos mistos/caseiros sem pedir contexto adicional (é exatamente onde Cal AI mais falha).
- Prometer precisão alta sem deixar claro para o usuário que é uma **estimativa** — todos os apps sérios tratam isso como estimativa, não medição (mesmo texto de disclaimer que já usamos no Scan: `SCAN_DISCLAIMER`).
- Depender de banco de dados nutricional fraco/pequeno — no nosso caso, a TACO (base brasileira) resolve isso para o público local (ver [02](02-metodo-ia-estimativa.md)).

## Fontes

- [Meal Scan FAQ – MyFitnessPal Help](https://support.myfitnesspal.com/hc/en-us/articles/360045761612-Meal-Scan-FAQ)
- [MyFitnessPal AI Review 2026: Meal Scan Accuracy 71.2%](https://ai-food-tracker.com/reviews/myfitnesspal/)
- [Cal AI Review 2026: Honest Pros, Cons, and Accuracy Test](https://nutrola.app/en/blog/cal-ai-review-2026)
- [Cal AI Review 2026: Photo Food Logging Accuracy, Pricing & Alternatives](https://askvora.com/blog/cal-ai-acquisition-photo-food-logging)
- [Apps That Calculate Calories From Photos: Are They Accurate?](https://fitia.app/learn/article/ai-calorie-photo-apps-accuracy-2026/)
- [Best Photo Food Recognition Apps Ranked 2026: BAR Leaderboard](https://bestapprankings.com/en/articles/best-photo-food-recognition-apps-ranked-2026/)
- [Foodvisor: The Good, the Bad, and the UX](https://www.satukyrolainen.com/foodvisor-the-good-the-bad-and-the-ux/)
- [Foodvisor Worth It in 2026? AI Scan, Dietitian, and Paid Plan Review](https://nutriscan.app/blog/posts/foodvisor-worth-it-2026-review-73e3363135)
