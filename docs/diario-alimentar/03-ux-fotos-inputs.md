# 03 — Instruções de foto e inputs complementares

Objetivo: maximizar a precisão da IA (ver [02](02-metodo-ia-estimativa.md)) através do que pedimos ao usuário **antes** de tirar a foto e do contexto que coletamos **junto** com ela — não só através do prompt.

O módulo Scan já resolve esse problema para fotos de corpo com um passo de preparação (`SCAN_PREP_ITEMS`: cards de comparação certo/errado + guias por foto) seguido da captura. Vamos seguir a mesma filosofia.

## Instruções antes da foto (tela de preparo)

Mirando o formato de `SCAN_QUALITY_TIPS` (lista curta, direta, com ícone), adaptado para prato de comida:

1. **Fotografe de cima, na vertical (90°)** — enquadramento de cima simplifica a estimativa de área/volume e é o ângulo que a maioria dos apps de referência usa. (Alternativa aceitável: 42°, conforme o Digital Photographic Food Atlas — mas cima é mais fácil de instruir e replicar consistentemente.)
2. **Coloque um objeto de referência ao lado do prato** — um talher, uma moeda, ou a própria mão. Sem isso a IA não tem como calibrar escala (é o achado central da pesquisa em [02](02-metodo-ia-estimativa.md)). Este é o item de maior impacto na precisão — deve ser destacado visualmente, não uma dica perdida no meio das outras.
3. **Prato inteiro dentro do quadro**, sem cortar bordas.
4. **Boa iluminação, sem sombra forte cobrindo parte do prato.**
5. **Um prato por foto** — se a refeição tem múltiplos pratos/tigelas separados, tirar uma foto por prato (evita a IA confundir porções de recipientes diferentes).

Cada item pode reaproveitar o padrão visual `compare`/`guide` de `ScanCompareCard`/`ScanGuideCard` (foto certo vs. errado lado a lado), com fotos de exemplo de prato — precisaremos produzir esse asset (ver [05](05-frontend-animacao.md) e [06](06-integracao-no-app.md)).

## Inputs complementares (o que a foto sozinha não revela)

Coletados numa etapa curta, **depois** da foto e **antes** de disparar a análise (ou em paralelo, sem bloquear) — não um formulário longo, 3–4 escolhas rápidas em chips/botões:

| Input | Por que importa | Formato sugerido |
|---|---|---|
| **Tipo de refeição** | Café da manhã / almoço / jantar / lanche — ajuda a IA a calibrar expectativa de porção e ajuda o agrupamento no diário | Chips de seleção única |
| **Origem do prato** | Caseiro / restaurante / embalado (industrializado) — muda muito a estimativa de óleo/tempero escondido; item embalado pode ter rótulo (abre espaço futuro para leitura de rótulo/código de barras) | Chips |
| **Método de preparo predominante** | Frito / grelhado / cozido / assado / cru — mesma comida, calorias bem diferentes; a IA pode sugerir um valor, mas o usuário confirma/corrige | Chips, pré-preenchido com sugestão da IA quando possível |
| **Ingredientes escondidos conhecidos** | Óleo extra, manteiga, açúcar, molho — o usuário sabe o que colocou, a IA não vê. Checklist rápido, não obrigatório | Checkboxes opcionais |
| **Está dividindo o prato?** | "Esse prato é só seu ou vai ser dividido?" evita contar uma porção para 2 pessoas como se fosse para 1 | Toggle simples, opcional |

Regra geral: **nenhum desses inputs é obrigatório para prosseguir** — são todos opcionais e rápidos, porque fricção alta = usuário abandona o registro (o maior risco de um diário alimentar não é precisão, é abandono de uso). O objetivo é oferecer contexto de forma barata, não construir um formulário de anamnese.

## Fluxo de wizard proposto

Adaptando `SCAN_WIZARD_STEPS` para o domínio de alimentação:

```
1. prep        — instruções de foto (objeto de referência é o destaque)
2. photo       — captura (1 ou mais fotos, uma por prato)
3. contexto    — tipo de refeição + origem + preparo + escondidos (tudo opcional, chips)
4. processing  — análise da IA (ver 05-frontend-animacao.md para a animação)
5. review      — lista de itens detectados, editável (gramas, remover, adicionar)
6. done        — confirmado, soma ao diário do dia
```

Diferença chave em relação ao Scan: no Scan o consentimento (LGPD, foto de corpo) é uma etapa obrigatória à parte por ser dado sensível de biometria. Foto de comida não carrega o mesmo risco de PII — o passo `consent` do Scan não precisa ser replicado aqui, o que já deixa o fluxo do Diário mais curto e rápido de completar (reforça o objetivo de baixo atrito acima).

## Cross-check com o benchmark

O fluxo acima existe porque o benchmark ([01](01-benchmark-apps.md)) mostrou que **todo app sério pede correção manual** e que **o ponto cego universal é o prato misto/caseiro**. Os inputs de "origem" e "preparo" atacam exatamente esse ponto cego antes mesmo da IA errar — em vez de só corrigir depois.
