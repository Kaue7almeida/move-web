# Food Diary — benchmark local

Harness de avaliação empírica da IA do Diário. **Local, não toca o banco de
produção nem dados de usuários.** Protocolo, métricas e gates em
[`docs/diario-alimentar/09-validacao-empirica.md`](../../docs/diario-alimentar/09-validacao-empirica.md).

## Passos

1. Copie o template e preencha uma linha por foto (ground truth medido):
   ```bash
   cp benchmark-template.csv cases.csv
   ```
2. Coloque as imagens numa pasta local (ex.: `./benchmark-images`).
3. Rode (usa a mesma `OPENAI_API_KEY` do serviço; nada é enviado ao Supabase):
   ```bash
   OPENAI_API_KEY=sk-... node run.mjs \
     --cases cases.csv --images ./benchmark-images --out results.csv --repeat 3
   ```

Saída: `results.csv` (uma linha por análise) + resumo com medianas/P90 no stdout.

> `cases.csv`, `results.csv` e as imagens são artefatos locais — não versione
> imagens de comida nem resultados. Só o **template** e o **harness** vivem no repo.
