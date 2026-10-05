/**
 * gerar-planta.mjs — gera a prancha de planta humanizada de UM projeto.
 *
 *   node scripts/gerar-planta.mjs <id-do-projeto> [modelo]
 *
 * Lê a ficha do projeto em specs/projetos.json, monta o prompt cirúrgico
 * (prompts/planta.mjs) e salva o PNG em assets/projetos/.
 * Credencial: ~/.gemini/credentials.env (nunca no repositório).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarPromptPlanta } from '../prompts/planta.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODELO_PADRAO = 'gemini-3-pro-image';

function carregarChave() {
  const env = join(homedir(), '.gemini', 'credentials.env');
  if (!existsSync(env)) throw new Error(`Credencial não encontrada em ${env}`);
  const txt = readFileSync(env, 'utf8');
  const achar = (nome) => (txt.match(new RegExp(`^${nome}=(.+)$`, 'm')) || [])[1]?.trim();
  const chave = achar('GEMINI_API_KEY') || achar('GEMINI_API_KEY_ALT');
  if (!chave) throw new Error('GEMINI_API_KEY ausente no credentials.env');
  return chave;
}

async function gerar(projeto, modelo, chave) {
  const prompt = montarPromptPlanta(projeto);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${chave}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: '16:9' }
      }
    })
  });

  const dados = await resp.json();
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${JSON.stringify(dados).slice(0, 600)}`);

  const partes = dados?.candidates?.[0]?.content?.parts || [];
  const img = partes.find((p) => p.inlineData)?.inlineData?.data;
  if (!img) {
    const motivo = dados?.candidates?.[0]?.finishReason || 'sem imagem na resposta';
    throw new Error(`Nenhuma imagem devolvida (${motivo}): ${JSON.stringify(dados).slice(0, 600)}`);
  }

  const saida = join(RAIZ, 'assets', 'projetos');
  mkdirSync(saida, { recursive: true });
  const arquivo = join(saida, `${projeto.id}-planta.png`);
  writeFileSync(arquivo, Buffer.from(img, 'base64'));
  return { arquivo, bytes: Buffer.from(img, 'base64').length, prompt };
}

const id = process.argv[2];
const modelo = process.argv[3] || MODELO_PADRAO;
if (!id) {
  console.error('uso: node scripts/gerar-planta.mjs <id-do-projeto> [modelo]');
  process.exit(1);
}

const specs = JSON.parse(readFileSync(join(RAIZ, 'specs', 'projetos.json'), 'utf8'));
const projeto = specs.projetos.find((p) => p.id === id);
if (!projeto) {
  console.error(`Projeto "${id}" não existe em specs/projetos.json.`);
  console.error('Disponíveis:', specs.projetos.map((p) => p.id).join(', '));
  process.exit(1);
}

const { arquivo, bytes, prompt } = await gerar(projeto, modelo, carregarChave());
writeFileSync(join(RAIZ, 'assets', 'projetos', `${projeto.id}-prompt.txt`), prompt);
console.log(`OK  ${arquivo}  (${(bytes / 1024).toFixed(0)} KB, modelo ${modelo})`);
