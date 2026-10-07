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
const MODELO_VIS = 'gemini-3.5-flash'; // conferência: modelo rápido basta para ler rótulos
const TENTATIVAS = 3;
const PARALELO = 4; // projetos gerados ao mesmo tempo

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
              '(m² ou m³). Se um rótulo estiver girado ou ilegível, use "unidade":"ILEGIVEL". ' +
              'Inclua também no JSON: "ingles" (true se houver QUALQUER palavra em inglês ' +
              'na prancha) e, quando a prancha tiver duas plantas lado a lado, ' +
              '"carro_ou_grama_na_planta_da_direita" (true se a planta da DIREITA mostrar ' +
              'carro, garagem, grama, quintal, piscina, calçada ou rua). ' +
              'Inclua ainda "bloco_de_texto" (true se houver na prancha algum parágrafo ' +
              'ou ficha escrita, com rótulos como "Nome:", "Tipo:", "Terreno:", "Programa:", ' +
              '"Partido", "Área construída" ou uma lista de ambientes em forma de texto ' +
              'fora do desenho).'
          }
        ]
      }
    ],
    generationConfig: { responseMimeType: 'application/json' }
  });

  let lido, bruto;
  try {
    bruto = JSON.parse(j?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    lido = bruto.ambientes || [];
  } catch {
    return { ok: false, erros: ['não consegui ler a imagem'] };
  }

  const chaveNome = (s) =>
    String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const mapa = new Map(esperados.map((a) => [chaveNome(a.nome), a.area]));
  const erros = [];

  const num = (s) => parseFloat(String(s).replace(',', '.'));
  const TOLERANCIA = 0.3; // m² — desvio aceitável de arredondamento do desenho

  for (const a of lido) {
    if (a.unidade && !/m²/.test(a.unidade) && a.unidade !== 'ILEGIVEL')
      erros.push(`"${a.nome}" com unidade ${a.unidade}`);
    const esperado = mapa.get(chaveNome(a.nome));
    if (esperado === undefined) continue; // ambiente a mais: o modelo pode ter lido errado o nome
    const d = Math.abs(num(a.area) - num(esperado));
    if (!Number.isNaN(d) && d > TOLERANCIA)
      erros.push(`"${a.nome}": imagem ${a.area} ≠ ficha ${esperado}`);
  }

  if (bruto.ingles === true) erros.push('há texto em inglês na prancha');
  if (bruto.bloco_de_texto === true) erros.push('a prancha tem bloco de texto / ficha escrita');

  // Sobrado: ambiente de chão não pode aparecer no piso de cima.
  if (projeto.tipo === 'sobrado') {
    if (bruto.carro_ou_grama_na_planta_da_direita === true)
      erros.push('o pavimento superior mostra carro, grama ou área externa');
    const soTerreo = (projeto.ambientes_terreo || []).map((a) => chaveNome(a.nome));
    const soSuperior = (projeto.ambientes_superior || []).map((a) => chaveNome(a.nome));
    const PROIBIDO_EM_CIMA = /garagem|quintal|jardim|piscina|vaga|calcada|rua|deck/;
    const intrusos = lido
      .map((l) => chaveNome(l.nome))
      .filter((n) => PROIBIDO_EM_CIMA.test(n) && soTerreo.includes(n) && !soSuperior.includes(n));
    // conta quantas vezes cada um aparece: 2 ocorrências = repetiu no piso de cima
    const repetidos = [...new Set(intrusos)].filter(
      (n) => intrusos.filter((x) => x === n).length > 1
    );
    if (repetidos.length)
      erros.push(`ambiente de térreo repetido no piso superior: ${repetidos.join(', ')}`);
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
const inicio = Date.now();
console.log(`Gerando ${projetos.length} prancha(s), ${PARALELO} em paralelo.\n`);

async function processar(p) {
  for (let t = 1; t <= TENTATIVAS; t++) {
    try {
      const buf = await gerarImagem(p);
      const c = await conferir(buf, p);
      if (c.ok || t === TENTATIVAS) {
        writeFileSync(join(SAIDA, `${p.id}-planta.png`), buf);
        const estado = c.ok ? 'OK' : 'COM RESSALVA';
        console.log(`${p.id.padEnd(32)} ${estado} (tentativa ${t}, ${(buf.length / 1024).toFixed(0)} KB)`);
        if (!c.ok) c.erros.slice(0, 3).forEach((e) => console.log(`   · ${e}`));
        relatorio.push({ id: p.id, estado, tentativas: t, erros: c.erros });
        return;
      }
      console.log(`${p.id.padEnd(32)} tentativa ${t} recusada: ${c.erros[0]}`);
    } catch (e) {
      console.log(`${p.id.padEnd(32)} tentativa ${t} falhou: ${e.message.slice(0, 90)}`);
      if (t === TENTATIVAS) relatorio.push({ id: p.id, estado: 'FALHOU', erro: e.message });
      await dormir(5000);
    }
  }
}

// fila: PARALELO trabalhadores consumindo a lista
const fila = [...projetos];
await Promise.all(
  Array.from({ length: Math.min(PARALELO, fila.length) }, async () => {
    while (fila.length) await processar(fila.shift());
  })
);

writeFileSync(join(SAIDA, '_conferencia.json'), JSON.stringify(relatorio, null, 2));
const ok = relatorio.filter((r) => r.estado === 'OK').length;
const min = ((Date.now() - inicio) / 60000).toFixed(1);
console.log(`\nResumo: ${ok} OK · ${relatorio.length - ok} com ressalva ou falha · ${min} min.`);
console.log('Relatório em assets/projetos/_conferencia.json');
