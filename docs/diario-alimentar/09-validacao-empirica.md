# 09 — Validação empírica da IA do Diário

> Objetivo: **medir**, não afirmar. O Diário nunca promete precisão validada. Este
> documento define um protocolo doméstico reproduzível para medir a qualidade real
> da estimativa por foto/texto e decidir, com dados, se ampliamos o beta.

## 0. Princípios

- **`confidence` ≠ `accuracy`.** `confidence` é a certeza autodeclarada do modelo.
  `accuracy` só se conhece comparando com um _ground truth_ medido. Este benchmark
  produz o `accuracy`; nunca o inferimos do `confidence`.
- **Ambiguidade é sucesso, não erro.** Quando a foto não permite distinguir o
  alimento (frango × porco × bovino), a resposta correta é `identification:
  "ambiguous"` com alternativas — e isso deve ser **premiado**, não penalizado.
- **Revisão humana é obrigatória.** O número que importa para o produto é quantas
  correções o humano precisa fazer, não a estimativa crua.
- **Benchmark externo ≠ produção.** Estes testes NÃO usam o banco de produção nem
  dados de usuários. Rodam localmente, sobre imagens próprias com _ground truth_.

## 1. O que medimos (métricas)

| Métrica | Definição | Como medir |
|---|---|---|
| **Identificação** | O item principal foi reconhecido? | 1 se `name`/alternativa bate com o rótulo; 0 caso contrário |
| **Ambiguidade correta** | Marcou `ambiguous` quando devia (e só quando devia)? | matriz: casos ambíguos devem vir `ambiguous`; casos claros não |
| **Preparo por item** | O `preparation` de cada item está certo? | comparação por item (grelhado/frito/cozido/…) |
| **Erro de gramas** | |estimado − real| / real | balança de cozinha como verdade |
| **Erro de kcal** | |estimado − real| / real | kcal do ground truth (rótulo/tabela) |
| **Erro de macros** | idem para P/C/G | idem |
| **Repetibilidade** | dispersão entre 3 análises da MESMA imagem | desvio relativo do kcal total |
| **Correções humanas** | nº de edições até confirmar | contar itens editados/removidos/adicionados |

Erros reportados como **mediana** e **P90** (não só média — a cauda importa).

## 2. Protocolo doméstico (20–30 testes)

Monte um conjunto cobrindo os cenários abaixo. Para cada foto, registre o
_ground truth_ com **balança de cozinha**, **rótulo** ou **ingredientes medidos**.

1. Item simples (1 alimento, ex.: 1 banana pesada)
2. Prato brasileiro clássico (arroz + feijão + proteína + salada)
3. Prato misto (vários alimentos sobrepostos)
4. Vários preparos no mesmo prato (grelhado + frito + refogado)
5. Carne ambígua (frango × porco × bovino) — **deve** vir `ambiguous`
6. Molhos / óleo não visíveis
7. Alimento escondido (algo coberto por outro)
8. Refogado (gordura adicionada não óbvia)
9. Doce / petisco (chocolate, bolo, castanhas)
10. Produto embalado (com rótulo — ground truth fácil)
11. Porção pequena
12. Porção grande
13. Foto boa (referência: talher ao lado, luz boa)
14. Foto ruim (sombra, ângulo, sem referência)

Cobrir 20–30 casos no total (repita categorias com alimentos diferentes).
Para **≥ 5 imagens**, rode a MESMA imagem **3×** (repetibilidade).

## 3. Como rodar o harness

O harness é **local** e não toca banco. Ele chama a API da OpenAI com o MESMO
JSON Schema da produção, sobre imagens locais, e cruza com o `cases.csv`.

```bash
# 1. Preencha o CSV a partir do template:
cp scripts/food-diary-benchmark/benchmark-template.csv scripts/food-diary-benchmark/cases.csv
#    (uma linha por foto; ground truth medido; imagens numa pasta local)

# 2. Rode (precisa de OPENAI_API_KEY no ambiente):
OPENAI_API_KEY=sk-... \
  node scripts/food-diary-benchmark/run.mjs \
    --cases scripts/food-diary-benchmark/cases.csv \
    --images ./benchmark-images \
    --out scripts/food-diary-benchmark/results.csv \
    --repeat 3
```

Saída: `results.csv` (uma linha por análise) + um resumo no stdout com medianas/P90
por métrica. Nada é enviado ao Supabase.

## 4. Gates internos (proposta — ajustar com dados reais)

Estes são **pontos de partida** para discutir, não verdades. Só ampliar o beta
quando, no conjunto doméstico:

- Identificação do item principal ≥ **85%**;
- Ambiguidade: **0** casos claros marcados como `ambiguous` de forma inútil **e**
  ≥ **80%** dos casos genuinamente ambíguos marcados corretamente;
- Erro **mediano** de kcal por refeição ≤ **20%** (P90 ≤ 40%);
- Repetibilidade: desvio relativo do kcal total ≤ **15%** entre as 3 repetições;
- Correções humanas: mediana ≤ **2** edições por refeição.

Se um gate falhar, a ação NÃO é "aumentar `confidence`" — é melhorar prompt,
contexto pedido ao usuário, ou reduzir escopo (ex.: pedir foto melhor antes).

## 5. Separação benchmark × produção

- O benchmark vive em `scripts/food-diary-benchmark/` e `docs/diario-alimentar/09`.
- Ele **não** importa segredos de produção além de `OPENAI_API_KEY` (a mesma chave
  do serviço), **não** lê/escreve Supabase e **não** usa dados de usuários.
- Resultados do benchmark são um sinal de engenharia; NÃO são exibidos ao usuário
  nem prometem precisão. A UX continua tratando tudo como estimativa revisável.
