/**
 * gerar-lote.mjs — gera as pranchas em lote, com CONFERÊNCIA AUTOMÁTICA.
 *
 *   node scripts/gerar-lote.mjs            → todos os pendentes
 *   node scripts/gerar-lote.mjs p03 p04    → só esses (prefixo basta)
 *   node scripts/gerar-lote.mjs --refazer  → regera inclusive os já prontos
 *
 * Para cada projeto:
 *   1. gera a prancha pelo Gemini (16:9)
 *   2. relê a imagem com o modelo de visão e extrai nome + área de cada ambiente
 *   3. compara com a ficha; se divergir, regera (até 3 tentativas)
 *   4. grava o relatório em assets/projetos/_conferencia.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarPromptPlanta } from '../prompts/planta.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(RAIZ, 'assets', 'projetos');
const MODELO_IMG = 'gemini-3-pro-image';
const MODELO_VIS = 'gemini-3.1-pro-preview';
const TENTATIVAS = 3;

const chave = (() => {
  const txt = readFileSync(join(homedir(), '.gemini', 'credentials.env'), 'utf8');
  return (txt.match(/^GEMINI_API_KEY=(.+)$/m) || [])[1]?.trim();
})();

const api = (modelo) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${chave}`;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(modelo, corpo, tentativa = 0) {
  const r = await fetch(api(modelo), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });
  if (r.status === 429 || r.status >= 500) {
    if (tentativa >= 4) throw new Error(`HTTP ${r.status} após várias tentativas`);
    await dormir(12000 * (tentativa + 1));
    return pedir(modelo, corpo, tentativa + 1);
  }
  const j = await r.json();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j).slice(0, 400)}`);
  return j;
}

async function gerarImagem(projeto) {
  const j = await pedir(MODELO_IMG, {
    contents: [{ parts: [{ text: montarPromptPlanta(projeto) }] }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } }
  });
  const b64 = (j?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData)?.inlineData?.data;
  if (!b64) throw new Error(`sem imagem (${j?.candidates?.[0]?.finishReason || '?'})`);
  return Buffer.from(b64, 'base64');
}

/** Relê a prancha e devolve os pares nome/área que o modelo enxerga. */
async function conferir(buf, projeto) {
  const esperados = projeto.ambientes || [
    ...(projeto.ambientes_terreo || []),
    ...(projeto.ambientes_superior || [])
  ];
  const j = await pedir(MODELO_VIS, {
    contents: [
      {
        parts: [
          { inlineData: { mimeType: 'image/png', data: buf.toString('base64') } },
          {
            text:
              'Esta é uma prancha de planta baixa. Leia APENAS os rótulos escritos dentro dos ' +
              'ambientes e devolva JSON puro, sem markdown, no formato ' +
              '{"ambientes":[{"nome":"...","area":"00,00","unidade":"m²"}]}. ' +
              'Copie o texto exatamente como está escrito na imagem, incluindo a unidade ' +
              '(m² ou m³). Se um rótulo estiver girado ou ilegível, use "unidade":"ILEGIVEL".'
          }
        ]
      }
    ],
    generationConfig: { responseMimeType: 'application/json' }
  });

  let lido;
  try {
    lido = JSON.parse(j?.candidates?.[0]?.content?.parts?.[0]?.text || '{}').ambientes || [];
  } catch {
    return { ok: false, erros: ['não consegui ler a imagem'] };
  }

  const chaveNome = (s) =>
    String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const mapa = new Map(esperados.map((a) => [chaveNome(a.nome), a.area]));
  const erros = [];

  for (const a of lido) {
    if (a.unidade && !/m²/.test(a.unidade)) erros.push(`"${a.nome}" com unidade ${a.unidade}`);
    const esperado = mapa.get(chaveNome(a.nome));
    if (esperado === undefined) continue; // ambiente a mais: o modelo pode ter lido errado o nome
    if (String(a.area).replace('.', ',') !== esperado)
      erros.push(`"${a.nome}": imagem ${a.area} ≠ ficha ${esperado}`);
  }
  const faltando = esperados.filter((e) => !lido.some((l) => chaveNome(l.nome) === chaveNome(e.nome)));
  if (faltando.length > esperados.length * 0.25)
    erros.push(`${faltando.length} ambientes não encontrados na imagem`);

  return { ok: erros.length === 0, erros, lidos: lido.length, esperados: esperados.length };
}

// ---------------------------------------------------------------- execução
const args = process.argv.slice(2);
const refazer = args.includes('--refazer');
const filtros = args.filter((a) => !a.startsWith('--'));

const projetos = JSON.parse(readFileSync(join(RAIZ, 'specs', 'projetos-todos.json'), 'utf8')).projetos
  .filter((p) => (filtros.length ? filtros.some((f) => p.id.startsWith(f)) : true))
  .filter((p) => refazer || !existsSync(join(SAIDA, `${p.id}-planta.png`)));

mkdirSync(SAIDA, { recursive: true });
const relatorio = [];
console.log(`Gerando ${projetos.length} prancha(s).\n`);

for (const [i, p] of projetos.entries()) {
  const marca = `[${i + 1}/${projetos.length}] ${p.id}`;
  let feito = false;

  for (let t = 1; t <= TENTATIVAS && !feito; t++) {
    try {
      const buf = await gerarImagem(p);
      const c = await conferir(buf, p);
      if (c.ok || t === TENTATIVAS) {
        writeFileSync(join(SAIDA, `${p.id}-planta.png`), buf);
        const estado = c.ok ? 'OK' : 'COM RESSALVA';
        console.log(`${marca}  ${estado} (tentativa ${t}, ${(buf.length / 1024).toFixed(0)} KB)`);
        if (!c.ok) c.erros.slice(0, 4).forEach((e) => console.log(`     · ${e}`));
        relatorio.push({ id: p.id, estado, tentativas: t, erros: c.erros });
        feito = true;
      } else {
        console.log(`${marca}  tentativa ${t} recusada: ${c.erros[0]}`);
      }
    } catch (e) {
      console.log(`${marca}  tentativa ${t} falhou: ${e.message.slice(0, 120)}`);
      if (t === TENTATIVAS) relatorio.push({ id: p.id, estado: 'FALHOU', erro: e.message });
      await dormir(8000);
    }
  }
  await dormir(3000);
}

writeFileSync(join(SAIDA, '_conferencia.json'), JSON.stringify(relatorio, null, 2));
const ok = relatorio.filter((r) => r.estado === 'OK').length;
console.log(`\nResumo: ${ok} OK · ${relatorio.length - ok} com ressalva ou falha.`);
console.log('Relatório em assets/projetos/_conferencia.json');
