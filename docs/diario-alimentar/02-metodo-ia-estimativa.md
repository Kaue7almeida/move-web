# 02 — Método técnico de estimativa nutricional via IA

## O problema, sem otimismo

Estimar gramas e calorias a partir de uma foto 2D é um problema mal-condicionado: a mesma área de pixel pode representar volumes bem diferentes dependendo da profundidade do prato, e a IA não "vê" ingredientes escondidos (óleo de cozinha, molho, manteiga, açúcar). O benchmark em [01-benchmark-apps.md](01-benchmark-apps.md) confirma isso na prática: até os melhores apps do mercado erram ±9–20% em MAPE, e o pior caso (pratos mistos) chega a subestimar 25–50%.

A pesquisa acadêmica aponta o mesmo problema, com duas linhas de solução:

- **Objeto de referência físico** ("Food Portion Estimation via 3D Object Scaling", CVPR 2024) — usar um objeto de tamanho conhecido na cena (no paper, um tabuleiro de xadrez; num app real, um talher, cartão ou moeda) para calibrar a escala e reconstruir volume a partir de modelos 3D de referência do alimento. Funciona sem dado de treino específico, generaliza bem. ([arxiv.org/abs/2404.12257](https://arxiv.org/abs/2404.12257))
- **Ângulo de captura definido** — o Digital Photographic Food Atlas (usado como referência científica de porção no Japão) padroniza fotos a 42° com objeto de referência (hashi/talher) ao lado do prato. ([PMC9182677](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9182677/))
- Sistemas com hardware dedicado (câmera estéreo + luz estruturada, como o FOODCAM) chegam a 94% de acurácia — **não é o nosso caso**, não temos hardware especial, só a câmera do celular do usuário. ([PMC9102485](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9102485/))

Conclusão prática: não existe forma de "resolver" a precisão só com prompt melhor. O produto precisa (a) pedir um objeto de referência, (b) tratar o resultado como estimativa editável, e (c) separar "estimar gramas" (tarefa da IA) de "calcular nutrientes" (tarefa de uma base de dados confiável).

## Decisão de arquitetura: reaproveitar o padrão do Scan

O move-web já resolve exatamente este tipo de problema — "extrair dados estruturados e confiáveis de uma foto usando IA" — no módulo Scan corporal. Não vamos reinventar a integração, vamos clonar o padrão e trocar o domínio:

- Client: [`OpenAiScanClient.ts`](../../src/bff/modules/scan/infra/OpenAiScanClient.ts) chama a **OpenAI Responses API** com `text.format.type = "json_schema"` e `strict: true` — a IA só pode responder no formato exato definido.
- Validação em duas camadas: o JSON Schema garante a forma na origem; um **schema Zod equivalente** (`scanAiResponseSchema`) revalida no servidor antes de confiar no dado (defesa em profundidade).
- O prompt de sistema é escrito em regras rígidas e explícitas (fórmulas fixas, enums fechados, escala de confiança 0–1 por dimensão), não em linguagem solta — isso é o que reduz alucinação, mais do que o modelo em si.
- Cada foto recebe uma **nota de qualidade por dimensão** (`enquadramento`, `iluminação`, etc.) com `status: "ok" | "ajustar"` e `needsRetake: boolean` — o usuário é orientado a refazer a foto *antes* de gastar a análise.

Para o Diário Alimentar, o cliente equivalente seria `OpenAiFoodDiaryClient.ts`, seguindo a mesma estrutura de arquivo.

## Abordagem híbrida: IA para visão, base de dados para nutrição

Esta é a decisão mais importante do documento. Em vez de pedir para a IA "inventar" kcal/proteína/carboidrato/gordura por ingrediente (que é onde Cal AI mais erra, por não ter uma base de dados por trás), o fluxo proposto é:

```
1. IA analisa a foto → identifica ingredientes + estima gramas de cada um
                        (com nível de confiança por item)
2. Para cada ingrediente identificado, o backend busca o valor nutricional
   por 100g numa base confiável:
     a. TACO (Tabela Brasileira de Composição de Alimentos, UNICAMP) — prioridade,
        cobre a realidade alimentar brasileira (597 alimentos analisados em
        laboratório nacional)
     b. USDA FoodData Central — fallback para itens não cobertos pela TACO
        (comida internacional, produtos industrializados)
     c. Se não houver match em nenhuma base, mantém a estimativa nutricional
        que a própria IA sugeriu, mas marca `fonteNutricional: "ia_estimado"`
        e reduz a confiança exibida ao usuário
3. kcal/macros finais = gramas estimadas × valor por 100g da base encontrada
```

Isso separa o que a IA faz bem (visão computacional: "isso parece ~150g de arroz branco") do que ela faz mal (adivinhar densidade calórica de memória). É também o motivo pelo qual MyFitnessPal e Foodvisor (que têm bases de dados por trás) performam melhor que Cal AI no benchmark.

> Nota de implementação futura: a busca por nome de ingrediente numa base como a TACO precisa de normalização (acentos, sinônimos — "arroz branco cozido" vs "arroz"). Vale considerar um passo de *matching* com embeddings ou fuzzy search quando formos implementar; não é um bloqueador para o desenho do schema agora.

## Schema JSON proposto (Structured Outputs)

Rascunho no mesmo estilo de `SCAN_ANALYSIS_JSON_SCHEMA`, para reaproveitar a estrutura de `type: "json_schema", strict: true`:

```ts
type FoodDiaryAiResponse = {
  analysis: {
    quality: {
      enquadramento: QualityItem;       // prato inteiro visível?
      iluminacao: QualityItem;          // sem sombra forte escondendo o prato?
      referenciaEscala: QualityItem;    // objeto de referência presente e visível?
      needsRetake: boolean;
    };
    referenciaDetectada: {
      presente: boolean;
      tipo: "talher" | "moeda" | "mao" | "cartao" | "prato_padrao" | "nenhum";
    };
    itens: Array<{
      nome: string;                     // ex: "Arroz branco cozido"
      categoria: string;                // ex: "carboidrato", "proteina", "vegetal", "molho"
      gramasEstimadas: number;
      confiancaGramas: number;          // 0–1
      metodoPreparoInferido: string | null; // "frito" | "grelhado" | "cru" | ...
    }>;
    observations: string[];             // ex: "Molho pode conter óleo/açúcar não visível"
    confidence: number;                 // 0–1, confiança geral da análise
  };
};
```

O cálculo de `kcal`, `proteinaG`, `carboidratoG`, `gorduraG`, `fibraG` por item **não vem da IA** — é responsabilidade do `FoodDiaryService` no backend, cruzando `itens[].nome` + `gramasEstimadas` com a base nutricional (TACO/USDA), conforme o fluxo híbrido acima. Isso também facilita a correção manual: se o usuário edita a gramatura de um item na revisão, o total recalcula localmente sem nova chamada à IA.

## Prompt de sistema — diretrizes específicas do domínio

Seguindo o mesmo estilo rígido do prompt do Scan (`buildSystemPrompt()`):

- Pedir para o modelo **raciocinar sobre proporção relativa ao objeto de referência**, quando presente, antes de estimar gramas (equivalente ao "chain of thought" dos papers acadêmicos, mas expresso como instrução de estimativa, não exposto ao usuário).
- Instruir a listar **cada componente do prato separadamente** (não "prato de comida" genérico) — arroz, feijão, proteína, salada, molho contam como itens distintos.
- Instruir a **assinalar em `observations` ingredientes prováveis mas não visíveis** (óleo de fritura, manteiga, açúcar em molhos) sem tentar quantificá-los — isso alimenta o passo de revisão do usuário (ver [03-ux-fotos-inputs.md](03-ux-fotos-inputs.md)).
- Mesma prática de segurança do Scan: nunca inferir/mencionar atributos sensíveis do usuário; resposta sempre em pt-BR; tratar refusal da API da mesma forma (`scan_image_rejected` → equivalente `food_image_rejected`).
- Disclaimer fixo (mesmo padrão de `SCAN_DISCLAIMER`): deixar claro que é uma estimativa, não uma pesagem.

## Loop de correção do usuário (não negociável)

Nenhum concorrente sério pula esse passo (ver [01](01-benchmark-apps.md)). Depois da análise, a tela de revisão deve permitir, por item:

- Ajustar a gramatura (slider ou input numérico — recalcula kcal/macros na hora, client-side, usando os valores por-100g já resolvidos no passo 2 do fluxo híbrido);
- Remover um item que a IA detectou errado;
- Adicionar um item que a IA não viu;
- Confirmar o registro no diário.

Esse é o mesmo padrão de "revisão antes de salvar" do wizard do Scan (`review` step em `SCAN_WIZARD_STEPS`), adaptado para lista editável de itens em vez de métricas corporais.

## Fontes

- [Food Portion Estimation via 3D Object Scaling (arXiv 2404.12257)](https://arxiv.org/abs/2404.12257)
- [Food Volume Estimation Based on Reference (ACM 2020)](https://dl.acm.org/doi/10.1145/3390557.3394123)
- [Food Portion Estimation: From Pixels to Calories](https://www.researchgate.net/publication/400505489_Food_Portion_Estimation_From_Pixels_to_Calories)
- [FOODCAM: Structured Light-Stereo Imaging System (PMC9102485)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9102485/)
- [Digital Photographic Food Atlas — Japan (PMC9182677)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9182677/)
- [TACO API — Sobre](https://taco-api.netlify.app/about/)
- [Taco API Explorer](https://taco.codivatech.com/)
