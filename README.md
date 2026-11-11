# planilha-worker

Cloudflare Worker que lê uma planilha pública do Google Sheets, separa cada linha em um item por plantão, guarda o resultado em KV e serve a API em `/api/dados`. A página estática (`public/`) é servida pelo mesmo Worker.

## Estrutura

```
wrangler.toml                config (assets, KV, variáveis)
src/index.ts                 rotas: /api/dados, /api/refresh e fallback para os assets
src/sheet.ts                 leitura da planilha + cache em KV
src/parse.ts                 separa cada linha (até 3 plantões) em uma entrada por data
src/types.ts                 Env e JsonfiedData
public/app.js                front: busca /api/dados e monta a os ppps
public/style.css             estilos básicos (claro/escuro)
public/index.html            cara do site
```

## Setup

```bash
npm install

# 1. KV para o cache (cole o id no wrangler.toml)
npx wrangler kv namespace create CACHE

# 2. Secrets
npx wrangler secret put GOOGLE_API_KEY
npx wrangler secret put REFRESH_TOKEN      # opcional

# 3. Edite no wrangler.toml: SHEET_ID e SHEET_RANGE (nome da aba)

# 4. Rodar local / publicar
npm run dev
npm run deploy
```

Para `npm run dev`, crie um `.dev.vars`:

```
GOOGLE_API_KEY=sua_chave
REFRESH_TOKEN=um_token_qualquer
```

## Google Cloud

1. Ative a **Google Sheets API** no projeto.
2. Crie uma **API key** e restrinja-a à Sheets API.
3. A planilha precisa estar com acesso "qualquer pessoa com o link pode ver".

## Planilha

- O cabeçalho é lido **pelo nome** (maiúsculas e acentos não importam): `PPP` (matéria), `Curso`, `Responsável` (petiano), `Plantão N` + `Sala/Horário N` (N = 1, 2, 3...) e `Obs`. Colunas extras (P1/P2/P3, POSTADO, OSs, legenda ao lado...) são ignoradas.
- Cada linha vira **uma entrada por plantão preenchido**: 3 datas geram 3 itens, 2 geram 2, e plantões vazios são pulados. Linhas em branco ou sem nenhum plantão não geram nada. O `Obs` da linha vai em todos os itens dela.
- `GET /api/dados` devolve esse array (`JsonfiedData[]`, em `src/types.ts`) na ordem da planilha: linha por linha, plantão 1, 2, 3. O campo `data` fica como está na planilha (`dd/mm/aaaa`).
- Mudanças na planilha aparecem quando o cache expira (`CACHE_TTL`). Para forçar:

```bash
curl -X POST https://SEU_WORKER/api/refresh -H "Authorization: Bearer SEU_REFRESH_TOKEN"
```
