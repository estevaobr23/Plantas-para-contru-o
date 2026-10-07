/**
 * Gera fachadas a partir das plantas e valida fotografia + fidelidade frontal.
 *
 *   node scripts/gerar-fachada.mjs
 *   node scripts/gerar-fachada.mjs p02 p15 --refazer
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarPromptFachada } from '../prompts/fachada.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(RAIZ, 'assets', 'projetos');
const RELATORIO = join(SAIDA, '_conferencia-fachadas.json');
const MODELO_IMG = 'gemini-3-pro-image';
const MODELO_VIS = 'gemini-3.5-flash';
const TENTATIVAS = 3;
const PARALELO = 4;
const chave = (readFileSync(join(homedir(), '.gemini', 'credentials.env'), 'utf8')
  .match(/^GEMINI_API_KEY=(.+)$/m) || [])[1]?.trim();
const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pedir(modelo, corpo, tentativa = 0) {
  const resposta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${chave}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }
  );
  if ((resposta.status === 429 || resposta.status >= 500) && tentativa < 4) {
    await dormir(10000 * (tentativa + 1));
    return pedir(modelo, corpo, tentativa + 1);
  }
  const json = await resposta.json();
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

async function gerar(projeto) {
  const planta = join(SAIDA, `${projeto.id}-planta.png`);
  if (!existsSync(planta)) throw new Error('planta nao existe');
  const json = await pedir(MODELO_IMG, {
    contents: [{ parts: [
      { inlineData: { mimeType: 'image/png', data: readFileSync(planta).toString('base64') } },
      { text: montarPromptFachada(projeto) }
    ] }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '4:3' } }
  });
  const b64 = (json?.candidates?.[0]?.content?.parts || []).find((parte) => parte.inlineData)?.inlineData?.data;
  if (!b64) throw new Error(`sem imagem (${json?.candidates?.[0]?.finishReason || '?'})`);
  return Buffer.from(b64, 'base64');
}

async function conferir(buf, projeto) {
  const planta = readFileSync(join(SAIDA, `${projeto.id}-planta.png`));
  const json = await pedir(MODELO_VIS, {
    contents: [{ parts: [
      { text: 'IMAGEM 1: planta de referencia. A frente do lote esta na parte inferior do desenho.' },
      { inlineData: { mimeType: 'image/png', data: planta.toString('base64') } },
      { text: 'IMAGEM 2: fotografia de fachada gerada.' },
      { inlineData: { mimeType: 'image/png', data: buf.toString('base64') } },
      { text: `Compare as duas imagens e responda somente JSON:
{"pavimentos":1,"tem_texto":false,"tem_pessoa":false,"eh_planta_baixa":false,
"parece_foto_de_casa_real":true,"garagem_corresponde":true,
"varanda_corresponde":true,"sacada_corresponde":true,
"aberturas_frontais_correspondem":true,"erros_fidelidade":[]}.
O projeto esperado e ${projeto.tipo === 'sobrado' ? 'sobrado com exatamente 2 pavimentos' : 'casa terrea com exatamente 1 pavimento'}.
Compare esquerda e direita como quem esta na rua olhando para a casa. Garagem,
varanda, sacada, loja, quantidade/posicao aproximada de portas e janelas e numero
de unidades devem corresponder a planta. Se a planta nao tiver sacada/varanda,
o campo correspondente so e true se a foto tambem nao inventar esse elemento.
Texto inclui placa, numero, marca ou logotipo legivel. erros_fidelidade deve listar
somente erros arquitetonicos objetivos e importantes.` }
    ] }],
    generationConfig: { responseMimeType: 'application/json' }
  });
  let v;
  try { v = JSON.parse(json?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'); }
  catch { return { ok: false, erros: ['validador nao retornou JSON'] }; }
  const erros = [];
  const esperado = projeto.tipo === 'sobrado' ? 2 : 1;
  if (v.pavimentos !== esperado) erros.push(`${v.pavimentos || '?'} pavimento(s), esperado ${esperado}`);
  if (v.eh_planta_baixa === true) erros.push('imagem saiu como planta baixa');
  if (v.tem_texto === true) erros.push('ha texto, marca ou logotipo');
  if (v.tem_pessoa === true) erros.push('ha pessoa');
  if (v.parece_foto_de_casa_real === false) erros.push('nao parece fotografia realista');
  if (v.garagem_corresponde === false) erros.push('garagem nao corresponde a planta');
  if (v.varanda_corresponde === false) erros.push('varanda nao corresponde a planta');
  if (v.sacada_corresponde === false) erros.push('sacada nao corresponde a planta');
  if (v.aberturas_frontais_correspondem === false) erros.push('aberturas frontais nao correspondem a planta');
  if (Array.isArray(v.erros_fidelidade)) erros.push(...v.erros_fidelidade.filter(Boolean));
  return { ok: erros.length === 0, erros: [...new Set(erros)] };
}

const args = process.argv.slice(2);
const refazer = args.includes('--refazer');
const filtros = args.filter((arg) => !arg.startsWith('--'));
const todos = JSON.parse(readFileSync(join(RAIZ, 'specs', 'projetos-todos.json'), 'utf8')).projetos;
const projetos = todos
  .filter((p) => filtros.length ? filtros.some((filtro) => p.id.startsWith(filtro)) : true)
  .filter((p) => refazer || !existsSync(join(SAIDA, `${p.id}-fachada.png`)));
mkdirSync(SAIDA, { recursive: true });
const relatorio = [];
const salvarRelatorio = () => writeFileSync(RELATORIO, JSON.stringify(
  [...relatorio].sort((a, b) => a.id.localeCompare(b.id)), null, 2
));

async function processar(projeto) {
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      const buf = await gerar(projeto);
      const conferencia = await conferir(buf, projeto);
      if (conferencia.ok || tentativa === TENTATIVAS) {
        writeFileSync(join(SAIDA, `${projeto.id}-fachada.png`), buf);
        const estado = conferencia.ok ? 'OK' : 'COM RESSALVA';
        relatorio.push({ id: projeto.id, estado, tentativas: tentativa, erros: conferencia.erros });
        salvarRelatorio();
        console.log(`${projeto.id} ${estado} tentativa ${tentativa}`);
        return;
      }
      console.log(`${projeto.id} recusado ${tentativa}: ${conferencia.erros.slice(0, 2).join('; ')}`);
    } catch (erro) {
      console.log(`${projeto.id} falhou ${tentativa}: ${erro.message.slice(0, 120)}`);
      if (tentativa === TENTATIVAS) {
        relatorio.push({ id: projeto.id, estado: 'FALHOU', tentativas: tentativa, erros: [erro.message] });
        salvarRelatorio();
      }
      await dormir(5000);
    }
  }
}

console.log(`Gerando ${projetos.length} fachada(s).`);
const fila = [...projetos];
await Promise.all(Array.from({ length: Math.min(PARALELO, fila.length) }, async () => {
  while (fila.length) await processar(fila.shift());
}));
salvarRelatorio();
console.log('Concluido.');
