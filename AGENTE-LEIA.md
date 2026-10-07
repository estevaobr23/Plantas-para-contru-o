# Geração das plantas — leia antes de rodar

## Onde as imagens ficam

`assets/projetos/<id>-planta.png` — 1376×768 (16:9), uma prancha por projeto.

Ao lado de cada uma fica `<id>-prompt.txt` só quando gerada por `gerar-planta.mjs`.
O relatório da conferência automática fica em `assets/projetos/_conferencia.json`.

## O que existe

- `specs/projetos-todos.json` — as 100 fichas (p01–p100). Fonte da verdade:
  todo nome e área que aparece na prancha vem daqui.
- `prompts/planta.mjs` — o prompt da prancha (estilo, cores das aberturas,
  legenda, regras de sobrado, proibições). Não simplifique.
- `scripts/gerar-lote.mjs` — gera em lote, 4 em paralelo, com conferência
  automática e até 3 tentativas por projeto.
- `scripts/gerar-fichas-p31-p100.mjs` — gerador das fichas p31–p100
  (partidos + vínculos de acesso). Backup das 30 originais em
  `specs/projetos-todos.backup-30.json`.

## Como rodar

```bash
node scripts/gerar-lote.mjs            # gera só as que ainda não existem
node scripts/gerar-lote.mjs p45 p46    # só esses ids (prefixo basta)
node scripts/gerar-lote.mjs p01 --refazer
```

Credencial: `~/.gemini/credentials.env` (fora do repositório). Modelo de imagem
`gemini-3-pro-image`; conferência com `gemini-3.5-flash`.

## A regra de verificação (a mesma das 30 primeiras)

A conferência relê cada prancha e regera quando:
- alguma área diverge da ficha em mais de 0,30 m²;
- aparece "m³" em vez de "m²";
- há texto em inglês ou bloco de texto copiado do prompt;
- num sobrado, o piso superior mostra carro, garagem, grama ou área externa.

Depois do lote, ainda vale uma auditoria visual dos sobrados (a conferência
pega nomes, não posições) e olhar as que ficaram "COM RESSALVA".

## Não fazer

- Não gerar fachadas/renders: isso é outra etapa, com outro agente.
- Não alterar `index.html`.
- `p01` está fora do padrão (ainda tem "Marcação da obra" e os banheiros
  enfileirados): regerar com `--refazer`.
