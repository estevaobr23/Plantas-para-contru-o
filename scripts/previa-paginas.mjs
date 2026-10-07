/**
 * previa-paginas.mjs — monta as páginas da PRÉVIA do flipbook em HTML.
 *
 * Regra da skill: a prévia só pode conter o que vem ANTES do primeiro projeto.
 * Nenhuma prancha completa entra aqui — o miolo fica só no carrossel da página.
 *
 * Saída: scratchpad/previa/1.html .. 6.html (A4 paisagem, 1123x794)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = process.argv[2];
if (!SAIDA) { console.error('uso: node scripts/previa-paginas.mjs <pasta-saida>'); process.exit(1); }
mkdirSync(SAIDA, { recursive: true });

const EXEMPLO = "file:///" + join(RAIZ,"assets","projetos","p01-terrea-10x20-3q-planta.png").split("\\").join("/");
const P = JSON.parse(readFileSync(join(RAIZ, 'specs', 'projetos-todos.json'), 'utf8')).projetos;

const BASE = `
  *{margin:0;padding:0;box-sizing:border-box}
  @font-face{font-family:S;src:local('Segoe UI'),local('Arial')}
  body{width:1123px;height:794px;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;
    color:#16384d;background:#fff;position:relative}
  .grade{position:absolute;inset:0;z-index:0;
    background:
      linear-gradient(rgba(29,127,184,.07) 1px,transparent 1px) 0 0/24px 24px,
      linear-gradient(90deg,rgba(29,127,184,.07) 1px,transparent 1px) 0 0/24px 24px,
      linear-gradient(rgba(29,127,184,.11) 1px,transparent 1px) 0 0/120px 120px,
      linear-gradient(90deg,rgba(29,127,184,.11) 1px,transparent 1px) 0 0/120px 120px;}
  .c{position:relative;z-index:1;padding:54px 64px;height:100%;display:flex;flex-direction:column}
  h1{font-size:50px;line-height:1.08;letter-spacing:-.02em;color:#0a2232}
  h2{font-size:34px;line-height:1.15;letter-spacing:-.015em;color:#0a2232;margin-bottom:8px}
  .eyebrow{font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#d2643a;font-weight:700}
  .regua{width:72px;height:4px;background:linear-gradient(90deg,#1d7fb8,#1d4ed8);border-radius:99px;margin:14px 0 22px}
  p{font-size:17px;line-height:1.6;color:#2b4a5c}
`;

const pagina = (corpo, extra = '') => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<style>${BASE}${extra}</style></head><body><div class="grade"></div>${corpo}</body></html>`;

// ---------- 1. CAPA
const capa = pagina(`
<div class="c" style="justify-content:center;align-items:center;text-align:center;
  background:radial-gradient(900px 520px at 50% -10%,rgba(29,127,184,.42),transparent 62%),
  linear-gradient(180deg,#12384f,#0a2232);color:#fff">
  <span class="eyebrow" style="color:#fcc419">Biblioteca digital de projetos</span>
  <h1 style="color:#fff;margin:18px 0 10px;max-width:880px">100 Projetos de Casas e Sobrados</h1>
  <p style="color:#cfe6f3;font-size:23px;max-width:720px">para construir e lucrar em terrenos pequenos</p>
  <div style="display:flex;gap:14px;margin-top:38px">
    ${['Casas térreas','Sobrados','Duas unidades','Para aluguel','Comércio']
      .map(t=>`<span style="font-size:14px;font-weight:600;color:#fff;background:rgba(29,127,184,.3);
        border:1px solid rgba(135,200,235,.4);padding:9px 18px;border-radius:9px">${t}</span>`).join('')}
  </div>
  <p style="color:#9fc6dc;font-size:15px;margin-top:46px">Plantas · Dimensões · Implantação no lote · Fundação</p>
</div>`);

// ---------- 2. APRESENTAÇÃO
const apre = pagina(`
<div class="c">
  <span class="eyebrow">Como usar esta biblioteca</span>
  <h2>Em vez de imaginar do zero, você compara.</h2>
  <div class="regua"></div>
  <p style="max-width:900px">Cada projeto desta biblioteca é uma possibilidade de construção para um
  terreno pequeno. A ideia não é escolher a planta "certa" na primeira olhada, e sim <b>ampliar seu
  repertório</b>: ver quantas coisas diferentes cabem num mesmo pedaço de chão antes de decidir o que fazer.</p>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:34px">
    ${[['1','Comece pelo terreno','Veja os projetos do tamanho de lote que você tem ou pretende comprar.'],
       ['2','Compare as opções','O mesmo lote pode virar casa térrea, sobrado ou duas unidades. Compare antes de decidir.'],
       ['3','Leve ao profissional','Escolheu? Leve a referência ao seu arquiteto ou engenheiro para desenvolver o projeto.']]
      .map(([n,t,d])=>`<div style="background:#fff;border:1px solid #d7e3ec;border-radius:16px;padding:24px 22px">
        <div style="width:38px;height:38px;border-radius:50%;background:#1d4ed8;color:#fff;font-weight:800;
          display:grid;place-items:center;font-size:17px;margin-bottom:14px">${n}</div>
        <div style="font-size:19px;font-weight:700;color:#0a2232;margin-bottom:8px">${t}</div>
        <p style="font-size:15px">${d}</p></div>`).join('')}
  </div>
  <div style="margin-top:auto;background:#fff7e0;border:1px solid #f3dca0;border-radius:14px;padding:20px 24px">
    <p style="font-size:15px"><b>Importante:</b> os projetos são referências e estudos preliminares.
    Eles não substituem arquiteto ou engenheiro, projeto executivo, cálculo estrutural, ART/RRT nem
    aprovação municipal. Toda obra deve ser desenvolvida e acompanhada por profissional habilitado.</p>
  </div>
</div>`);

// ---------- 3. COMO LER CADA PROJETO
const comoLer = pagina(`
<div class="c">
  <span class="eyebrow">Como ler cada projeto</span>
  <h2>O que você encontra em cada prancha</h2>
  <div class="regua"></div>
  <div style="display:grid;grid-template-columns:1.25fr 1fr;gap:34px;flex:1;align-items:center">
    <div style="background:#fff;border:1px solid #d7e3ec;border-radius:16px;padding:14px">
      <img src="${EXEMPLO}" style="width:100%;height:auto;display:block;border-radius:9px" />
      <div style="font-size:13px;color:#5a7a8c;text-align:center;margin-top:11px">
        exemplo real de prancha — <b style="color:#0a2232">Casa Térrea 3 Quartos com Suíte</b></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      ${[['Ambientes mobiliados','Cada cômodo com o nome e a área aproximada em m².'],
         ['Medidas do lote','A largura e o comprimento do terreno cotados nas bordas.'],
         ['Legenda de aberturas','Azul = janela · Laranja = porta · Verde = porta-janela · Grafite = entrada e garagem.'],
         ['Implantação','Como a casa se posiciona no terreno, com os recuos e a rua.'],
         ['Fundação','O esquema estrutural seguindo exatamente as paredes da planta.']]
        .map(([t,d])=>`<div style="display:flex;gap:13px;align-items:flex-start">
          <div style="flex:none;width:9px;height:9px;border-radius:50%;background:#d2643a;margin-top:7px"></div>
          <div><div style="font-size:17px;font-weight:700;color:#0a2232">${t}</div>
          <p style="font-size:14.5px">${d}</p></div></div>`).join('')}
    </div>
  </div>
  <p style="margin-top:22px;font-size:15px;color:#5a7governa"></p>
</div>`.replace('5a7governa','5a7a8c'));

// ---------- 4. ÍNDICE POR TAMANHO DE LOTE
const porLote = {};
P.forEach(p=>{ const k=`${p.lote.largura}x${p.lote.comprimento}`; (porLote[k] ||= []).push(p); });
const lotes = Object.keys(porLote).sort((a,b)=>parseFloat(a)-parseFloat(b));
const idxLote = pagina(`
<div class="c">
  <span class="eyebrow">Índice</span>
  <h2>Projetos por tamanho de terreno</h2>
  <div class="regua"></div>
  <p style="margin-bottom:24px">Comece por aqui se você já tem o lote. ${lotes.length} tamanhos diferentes.</p>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px">
    ${lotes.map(l=>`<div style="background:#fff;border:1px solid #d7e3ec;border-radius:13px;padding:17px 14px;text-align:center">
      <div style="font-size:21px;font-weight:800;color:#1d4ed8">${l}</div>
      <div style="font-size:12.5px;color:#5a7a8c;margin-top:5px">metros</div>
      <div style="font-size:13px;color:#d2643a;font-weight:700;margin-top:9px">${porLote[l].length} projeto${porLote[l].length>1?'s':''}</div>
    </div>`).join('')}
  </div>
  <div style="margin-top:auto;display:flex;gap:28px;padding-top:24px;border-top:1px solid #d7e3ec">
    ${[['Lotes estreitos','a partir de 4,5 m de frente'],['Lotes médios','de 6 a 8 m de frente'],
       ['Lotes largos','de 9 a 12 m de frente']]
      .map(([t,d])=>`<div><div style="font-size:16px;font-weight:700;color:#0a2232">${t}</div>
      <p style="font-size:14px">${d}</p></div>`).join('')}
  </div>
</div>`);

// ---------- 5. ÍNDICE POR TIPO
const grupos = [
  ['Casas térreas', P.filter(p=>p.tipo==='terrea'&&!/geminad|kitnet|unidades|fundos|frente e fundos|edícula|comercial/i.test(p.nome)).length,'De 1 a 4 quartos, com e sem suíte'],
  ['Sobrados', P.filter(p=>p.tipo==='sobrado'&&!/geminad|unidades|comercial/i.test(p.nome)).length,'Mais área construída no mesmo lote'],
  ['Duas unidades no lote', P.filter(p=>/geminad|frente e fundos/i.test(p.nome)).length,'Geminadas e casas frente e fundos'],
  ['Para aluguel', P.filter(p=>/aluguel|kitnet/i.test(p.nome)).length,'Unidades compactas e independentes'],
  ['Com ponto comercial', P.filter(p=>/comercial/i.test(p.nome)).length,'Loja no térreo, moradia junto'],
  ['Casos especiais', P.filter(p=>/fundos|acessível|edícula|esquina/i.test(p.nome)).length,'Fundos, esquina, acessível e edícula']
];
const idxTipo = pagina(`
<div class="c">
  <span class="eyebrow">Índice</span>
  <h2>Projetos por tipo de imóvel</h2>
  <div class="regua"></div>
  <p style="margin-bottom:26px">Comece por aqui se você já sabe o que quer construir.</p>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px">
    ${grupos.map(([t,n,d])=>`<div style="background:#fff;border:1px solid #d7e3ec;border-radius:16px;padding:26px 22px">
      <div style="font-size:30px;font-weight:800;color:#1d4ed8;line-height:1">${n}</div>
      <div style="font-size:18px;font-weight:700;color:#0a2232;margin:9px 0 6px">${t}</div>
      <p style="font-size:14.5px">${d}</p></div>`).join('')}
  </div>
  <div style="margin-top:auto;background:#12384f;color:#fff;border-radius:16px;padding:24px 28px;
    display:flex;align-items:center;justify-content:space-between">
    <div><div style="font-size:21px;font-weight:700">Procure também por número de quartos</div>
    <p style="color:#bcd9e8;font-size:15px;margin-top:4px">De 1 a 4 quartos, com ou sem suíte e garagem.</p></div>
    <div style="display:flex;gap:9px">
      ${['1 quarto','2 quartos','3 quartos','4 quartos'].map(q=>`<span style="font-size:13.5px;font-weight:700;
        background:rgba(29,127,184,.34);border:1px solid rgba(135,200,235,.4);padding:9px 15px;border-radius:8px">${q}</span>`).join('')}
    </div>
  </div>
</div>`);

// ---------- 6. AVISO / FIM DA PRÉVIA
const fim = pagina(`
<div class="c" style="justify-content:center;align-items:center;text-align:center;
  background:radial-gradient(900px 500px at 50% 0%,rgba(29,127,184,.4),transparent 62%),
  linear-gradient(180deg,#12384f,#0a2232);color:#fff">
  <span class="eyebrow" style="color:#fcc419">Fim da prévia</span>
  <h1 style="color:#fff;font-size:42px;margin:16px 0 14px;max-width:820px">A partir daqui começam os projetos</h1>
  <p style="color:#cfe6f3;max-width:700px;font-size:19px">Cada um com a planta humanizada, as medidas do
  lote, a implantação no terreno e o esquema de fundação.</p>
  <div style="margin-top:40px;background:rgba(255,255,255,.08);border:1px solid rgba(135,200,235,.3);
    border-radius:16px;padding:22px 30px;max-width:780px">
    <p style="color:#dbeaf4;font-size:15px">Os projetos são <b style="color:#fff">referências e estudos
    preliminares</b>. Não substituem arquiteto ou engenheiro, projeto executivo, cálculo estrutural,
    ART/RRT ou aprovação municipal.</p>
  </div>
</div>`);

const paginas = [capa, apre, comoLer, idxLote, idxTipo, fim];
paginas.forEach((p, i) => writeFileSync(join(SAIDA, `${i + 1}.html`), p));
console.log(`${paginas.length} páginas da prévia geradas em ${SAIDA}`);
