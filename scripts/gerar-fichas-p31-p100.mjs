/**
 * gerar-fichas-p31-p100.mjs — monta as 70 fichas que completam os 100 projetos.
 *
 *   node scripts/gerar-fichas-p31-p100.mjs
 *
 * Mesma estrutura das fichas p01–p30 (specs/projetos-todos.json): cada projeto
 * tem um PARTIDO próprio e cada ambiente tem VÍNCULO de acesso, para o prompt
 * da planta (prompts/planta.mjs) desenhar a lógica certa:
 *   - banheiro de suíte nasce dentro da suíte;
 *   - closet abre só para a suíte;
 *   - no sobrado, nada de chão (garagem, quintal) no piso de cima;
 *   - área coberta do térreo limitada a 70% do lote.
 *
 * Saída: specs/projetos-p31-p100.json e specs/projetos-todos.json (100 fichas).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const f2 = (n) => n.toFixed(2).replace('.', ',');
const amb = (nome, area, vinculo) => ({ nome, area, vinculo });

// ------------------------------------------------------------ zona íntima
function zonaIntima(q, s, { closet = false, alinhar = '' } = {}) {
  const lista = [];
  for (let i = 1; i <= s; i++) {
    const nome = q === s && s === 1 ? 'Suíte' : `Suíte ${String(i).padStart(2, '0')}`;
    lista.push(amb(nome, 13.6 + (i === 1 ? 1.2 : 0), 'porta para a circulação'));
    if (closet && i === 1)
      lista.push(amb('Closet', 4.4, `dentro da ${nome}, porta somente para ela, sem passagem para outro ambiente`));
    lista.push(amb(s === 1 ? 'Banho Suíte' : `Banho Suíte ${String(i).padStart(2, '0')}`, 4.0,
      `privativo da ${nome} — porta somente dentro dela${alinhar}`));
  }
  for (let i = s + 1; i <= q; i++)
    lista.push(amb(`Dormitório ${String(i).padStart(2, '0')}`, 11.4 - (i - s) * 0.4, 'porta para a circulação'));
  if (q > s)
    lista.push(amb('Banho Social', 4.0,
      `porta para a circulação, servindo os dormitórios, afastado dos banheiros de suíte${alinhar}`));
  lista.push(amb('Circulação', 3.2 + q * 1.4, 'distribui os quartos e banheiros'));
  return lista;
}

// ------------------------------------------------------------ zona social
function zonaSocial(L, { jantar = L >= 8, gourmet = false, voltaFundo = false } = {}) {
  const lista = [
    amb('Hall de Entrada', 3.6, 'porta de entrada vinda da garagem'),
    amb('Sala de Estar', 14 + L * 0.6, voltaFundo ? 'no fundo, porta-janela para o quintal' : 'integrada à cozinha'),
  ];
  if (jantar) lista.push(amb('Sala de Jantar', 10.8, 'entre a sala de estar e a cozinha'));
  lista.push(amb('Cozinha', 10 + L * 0.3, gourmet ? 'porta-janela para a área gourmet' : 'porta-janela para o quintal'));
  if (gourmet) lista.push(amb('Área Gourmet', 14.0, 'coberta, nos fundos, com churrasqueira e bancada'));
  lista.push(amb('A.S.', 3.6, 'atrás da cozinha, porta para o quintal'));
  return lista;
}

const garagem = (v, L) =>
  v > 0 ? [amb('Garagem', v * 13 + (L >= 10 ? 1.5 : 0), `frente do lote, coberta, ${v} carro(s), portão para a rua`)] : [];

// ------------------------------------------------------------ partidos
const PARTIDOS = {
  // ---------- TÉRREAS
  linear: {
    tipo: 'terrea', nome: (q) => `Casa Térrea ${q} Quarto${q > 1 ? 's' : ''} Linear`,
    obs: 'Partido LINEAR com corredor lateral: todos os ambientes enfileirados ao longo do lote, servidos por uma circulação encostada na divisa, que libera a outra faixa para janelas.',
    monta: (L, C, q, s, v) => [...garagem(v, L), ...zonaSocial(L), ...zonaIntima(q, s)],
  },
  patio: {
    tipo: 'terrea', nome: (q) => `Casa Térrea ${q} Quartos com Pátio Interno`,
    obs: 'Partido do PÁTIO INTERNO descoberto no meio da casa: separa o setor social do íntimo e leva luz e ventilação ao miolo do lote.',
    monta: (L, C, q, s, v) => [...garagem(v, L), ...zonaSocial(L),
      amb('Pátio Interno', 8 + L * 0.4, 'descoberto, no meio da casa; janelas da sala e dos quartos voltadas para ele'),
      ...zonaIntima(q, s)],
  },
  fundo: {
    tipo: 'terrea', nome: (q) => `Casa Térrea ${q} Quartos com Social nos Fundos`,
    obs: 'Partido da SOCIAL NOS FUNDOS: quartos na frente, protegidos por jardim, e sala e cozinha no fundo do lote, abertas por portas-janela para o quintal.',
    monta: (L, C, q, s, v) => [...garagem(v, L),
      amb('Jardim Frontal', L * 1.2, 'faixa ajardinada entre a garagem e os quartos'),
      ...zonaIntima(q, s), ...zonaSocial(L, { voltaFundo: true })],
  },
  jardimLateral: {
    tipo: 'terrea', nome: (q) => `Casa Térrea ${q} Quartos com Jardim Lateral`,
    obs: 'Partido do JARDIM LATERAL contínuo: a casa encosta numa divisa e deixa a outra faixa livre como jardim comprido, para onde se abrem todas as janelas.',
    monta: (L, C, q, s, v) => [...garagem(v, L),
      amb('Jardim Lateral', C * 1.1, 'faixa verde na divisa direita, da frente ao fundo; todas as janelas se voltam para ela'),
      ...zonaSocial(L), ...zonaIntima(q, s)],
  },
  emL: {
    tipo: 'terrea', nome: (q) => `Casa Térrea ${q} Quartos em L`,
    obs: 'Partido da PLANTA EM L em torno do quintal: ala social num braço, ala íntima no outro, ambas abertas para o quintal no canto interno do L.',
    monta: (L, C, q, s, v) => [...garagem(v, L), ...zonaSocial(L, { jantar: true }), ...zonaIntima(q, s, { closet: L >= 10 })],
  },
  varanda: {
    tipo: 'terrea', nome: (q) => `Casa Térrea ${q} Quartos com Varanda Frontal`,
    obs: 'Partido da VARANDA FRONTAL larga como cartão de visita: a casa recua e ganha varanda coberta na frente, que vira o espaço de convivência voltado para a rua.',
    monta: (L, C, q, s, v) => [...garagem(v, L),
      amb('Varanda', L * 1.2, 'coberta, na frente, porta-janela para a sala'), ...zonaSocial(L), ...zonaIntima(q, s)],
  },
  gourmet: {
    tipo: 'terrea', nome: (q) => `Casa Térrea ${q} Quartos com Área Gourmet`,
    obs: 'Partido da ÁREA GOURMET NOS FUNDOS: a cozinha se abre por porta-janela para uma varanda gourmet coberta com churrasqueira, o verdadeiro centro social da casa.',
    monta: (L, C, q, s, v) => [...garagem(v, L), ...zonaSocial(L, { gourmet: true }), ...zonaIntima(q, s)],
  },
  esquinaT: {
    tipo: 'terrea', nome: (q) => `Casa Térrea ${q} Quartos de Esquina`,
    obs: 'Partido das DUAS FRENTES: lote de esquina com rua embaixo e rua na lateral direita. Garagem pela rua lateral, entrada social pela principal, sala no canto com janelas para as duas ruas.',
    monta: (L, C, q, s, v) => [
      amb('Garagem', v * 13, 'lateral direita, portão voltado para a RUA LATERAL'),
      amb('Jardim em L', L + C * 0.4, 'faixa ajardinada contornando a esquina'),
      ...zonaSocial(L).map((a) => (a.nome === 'Hall de Entrada' ? amb(a.nome, a.area, 'porta de entrada voltada para a RUA PRINCIPAL') : a)),
      ...zonaIntima(q, s)],
  },

  // ---------- SOBRADOS
  sobDivisa: {
    tipo: 'sobrado', nome: (q) => `Sobrado ${q} Quartos com Escada na Divisa`,
    obs: 'Partido da ESCADA NA DIVISA: a escada encosta na parede lateral, liberando o centro do térreo para sala e cozinha integradas; quartos no piso superior.',
    sob: (L, C, q, s, v) => ({ extraT: [], extraS: [amb('Sacada', L * 0.8, 'à frente do quarto da frente, sobre a garagem')], closet: false }),
  },
  sobTerraco: {
    tipo: 'sobrado', nome: (q) => `Sobrado ${q} Quartos com Terraço`,
    obs: 'Partido do TERRAÇO DESCOBERTO: o piso superior recua no fundo e abre um terraço sobre a cozinha, área externa privativa em lote pequeno.',
    sob: (L, C, q, s, v) => ({ extraT: [], extraS: [amb('Terraço', L * 2, 'descoberto, no fundo do piso superior, sobre a cozinha do térreo')], closet: true }),
  },
  sobVazio: {
    tipo: 'sobrado', nome: (q) => `Sobrado ${q} Quartos com Vazio de Luz`,
    obs: 'Partido do VAZIO DE ILUMINAÇÃO: um poço aberto do térreo ao telhado, no meio da planta, leva luz ao coração da casa quando as duas divisas são paredes cegas.',
    sob: (L, C, q, s, v) => ({
      extraT: [amb('Vazio de Luz', 4.5, 'poço descoberto no meio da planta, aberto até o telhado')],
      extraS: [amb('Vazio de Luz', 4.5, 'o mesmo poço do térreo, cercado por guarda-corpo, na mesma posição exata')], closet: false,
    }),
  },
  sobPeDireito: {
    tipo: 'sobrado', nome: (q) => `Sobrado ${q} Quartos com Pé-Direito Duplo`,
    obs: 'Partido do PÉ-DIREITO DUPLO na sala: a sala é aberta até a cobertura e a circulação de cima passa como passarela com guarda-corpo olhando para baixo.',
    sob: (L, C, q, s, v) => ({ extraT: [], extraS: [amb('Vazio da Sala', 12 + L, 'vazio do pé-direito duplo sobre a sala, cercado por guarda-corpo, exatamente na projeção dela')], closet: true }),
  },
  sobRecuo: {
    tipo: 'sobrado', nome: (q) => `Sobrado ${q} Quartos com Jardim Frontal`,
    obs: 'Partido do RECUO AJARDINADO: a casa recua e abre jardim frontal com passeio até a porta; a garagem vai para a faixa lateral, descoberta com pergolado.',
    sob: (L, C, q, s, v) => ({
      extraT: [amb('Jardim Frontal', L * 2.4, 'frente do lote, ajardinado, com passeio de pedras até a porta')],
      extraS: [amb('Sacada', L * 0.9, 'à frente da suíte, voltada para o jardim frontal')], closet: true, garagemLateral: true,
    }),
  },
  sobEscritorio: {
    tipo: 'sobrado', nome: (q) => `Sobrado ${q} Quartos com Escritório`,
    obs: 'Partido do TRABALHO EM CASA: escritório no térreo com porta própria para a rua e lavabo acessível ao cliente, sem que ele entre na área íntima.',
    sob: (L, C, q, s, v) => ({ extraT: [amb('Escritório', 11.5, 'na frente, com porta PRÓPRIA para a rua, independente da entrada da casa')], extraS: [], closet: false }),
  },
  sobGourmetCima: {
    tipo: 'sobrado', nome: (q) => `Sobrado ${q} Quartos com Gourmet no Terraço`,
    obs: 'Partido do LAZER NO ALTO: o fundo do piso superior vira terraço gourmet coberto com churrasqueira, liberando o térreo para garagem e social.',
    sob: (L, C, q, s, v) => ({ extraT: [], extraS: [amb('Terraço Gourmet', L * 2.2, 'coberto, no fundo do piso superior, com churrasqueira e bancada')], closet: false }),
  },
  sobEsquina: {
    tipo: 'sobrado', nome: (q) => `Sobrado ${q} Quartos de Esquina`,
    obs: 'Partido das DUAS FRENTES em dois pavimentos: rua embaixo e rua na lateral direita. Garagem pela rua lateral, sacada em L contornando a esquina no piso de cima.',
    sob: (L, C, q, s, v) => ({ extraT: [amb('Jardim em L', L + C * 0.4, 'faixa ajardinada contornando a esquina')], extraS: [amb('Sacada em L', L * 1.1, 'contornando a esquina à frente da suíte')], closet: true, esquina: true }),
  },
};

// ------------------------------------------------------------ sobrado: monta os 2 pisos
function montaSobrado(p, L, C, q, s, v) {
  const x = p.sob(L, C, q, s, v);
  const escada = 5.2 + L * 0.15;
  const terreo = [
    ...(x.garagemLateral
      ? [amb('Garagem', v * 13, 'faixa lateral, descoberta com pergolado, carros em fila')]
      : x.esquina ? [amb('Garagem', v * 13, 'lateral direita, portão voltado para a RUA LATERAL')] : garagem(v, L)),
    amb('Hall de Entrada', 3.4, x.esquina ? 'porta de entrada voltada para a RUA PRINCIPAL' : 'porta de entrada vinda da garagem'),
    amb('Lavabo', 2.3, 'porta para o hall, sob a escada'),
    amb('Escada', escada, 'encostada na divisa, subindo do hall ao piso superior'),
    amb('Sala de Estar', 14 + L * 0.6, 'integrada à cozinha, janela para a frente'),
    ...(L >= 7 ? [amb('Sala de Jantar', 10.4, 'entre a sala de estar e a cozinha')] : []),
    amb('Cozinha', 10 + L * 0.3, 'porta-janela para o quintal'),
    amb('A.S.', 3.4, 'atrás da cozinha, porta para o quintal'),
    ...x.extraT,
  ];
  const superior = [
    amb('Escada', escada, 'chegada no mesmo ponto do térreo, com guarda-corpo'),
    ...zonaIntima(q, s, { closet: x.closet, alinhar: '; alinhado sobre a área molhada do térreo' }),
    ...x.extraS,
  ];
  return { terreo, superior };
}

// ------------------------------------------------------------ multi-unidades (renda)
function geminadas(L, C, q, sobrado) {
  const un = (u) => {
    const base = [
      amb(`Garagem ${u}`, 12.5, `frente, metade ${u === 'A' ? 'esquerda' : 'direita'}, unidade ${u}${u === 'B' ? ', espelhada em relação à A' : ''}`),
      amb(`Sala ${u}`, 15.2, `unidade ${u}, integrada à cozinha ${u}`),
      amb(`Cozinha ${u}`, 9.6, `unidade ${u}, porta-janela para o quintal ${u}`),
    ];
    const quartos = [];
    for (let i = 1; i <= q; i++) quartos.push(amb(`Dorm. 0${i} ${u}`, 10.6 - i * 0.6, `unidade ${u}, porta para a circulação ${u}`));
    quartos.push(amb(`Banho ${u}`, 3.8, `unidade ${u}, porta para a circulação ${u}`));
    quartos.push(amb(`Circulação ${u}`, 4.0, `unidade ${u}, distribui os quartos`));
    return { base, quartos };
  };
  const A = un('A'), B = un('B');
  if (!sobrado) return { ambientes: [...A.base, ...A.quartos, ...B.base, ...B.quartos] };
  const esc = (u) => amb(`Escada ${u}`, 5.2, `unidade ${u}, encostada na parede geminada central`);
  const escS = (u) => amb(`Escada ${u}`, 5.2, `unidade ${u}, chegada no mesmo ponto do térreo`);
  return {
    ambientes_terreo: [...A.base, esc('A'), amb('Lavabo A', 2.2, 'unidade A, sob a escada A'),
      ...B.base, esc('B'), amb('Lavabo B', 2.2, 'unidade B, sob a escada B')],
    ambientes_superior: [escS('A'), ...A.quartos, escS('B'), ...B.quartos],
  };
}

const RENDA = {
  geminadasT: {
    tipo: 'terrea', nome: (q) => `Duas Casas Geminadas de ${q} Quartos`,
    obs: 'Partido das UNIDADES ESPELHADAS: duas casas idênticas dividindo a parede central, cada uma com vaga, entrada e quintal próprios. Desenhar as DUAS unidades completas, rotulando os ambientes com A e B.',
    monta: (L, C, q) => geminadas(L, C, q, false),
  },
  geminadasS: {
    tipo: 'sobrado', nome: (q) => `Dois Sobrados Geminados de ${q} Quartos`,
    obs: 'Partido das UNIDADES VERTICAIS ESPELHADAS: dois sobrados idênticos dividindo a parede central. Desenhar as DUAS unidades completas em cada pavimento, rotulando com A e B.',
    monta: (L, C, q) => geminadas(L, C, q, true),
  },
  kitnets: {
    tipo: 'terrea', nome: (q, n) => `${n} Kitnets no Mesmo Lote`,
    obs: 'Partido da RENDA MÁXIMA POR METRO: kitnets de ambiente único, duas a duas em espelho, servidas por corredor central descoberto. Cada uma com porta própria, janela para fora e banheiro.',
    monta: (L, C, q, n) => {
      const a = [amb('Corredor Central', C * 1.1, 'faixa descoberta no meio do lote, da rua ao fundo, dando acesso a todas as portas')];
      for (let i = 1; i <= n; i++) {
        a.push(amb(`Kitnet ${String(i).padStart(2, '0')}`, 16.4, `ambiente único com cama, cozinha e estar; ${i % 2 ? 'lado esquerdo' : 'lado direito'}; porta para o corredor`));
        a.push(amb(`Banho ${String(i).padStart(2, '0')}`, 3.0, `privativo da Kitnet ${String(i).padStart(2, '0')} — porta somente dentro dela`));
      }
      a.push(amb('Área Comum', 5.5, 'no fundo do corredor, com tanques e medidores'));
      return { ambientes: a };
    },
  },
  unidades: {
    tipo: 'terrea', nome: (q, n) => `${n} Unidades de ${q} Quarto${q > 1 ? 's' : ''} para Aluguel`,
    obs: 'Partido da RENDA MULTIPLICADA: unidades independentes enfileiradas no lote comprido, servidas por corredor lateral descoberto com portão único. Os números valem para UMA unidade; todas são idênticas.',
    monta: (L, C, q, n) => {
      const a = [amb('Corredor Comum', C * 0.95, 'faixa descoberta na divisa esquerda, da rua ao fundo')];
      for (let i = 1; i <= n; i++) {
        a.push(amb(`Sala/Cozinha U${i}`, 15.8, `unidade ${i}, ambiente integrado, porta para o corredor`));
        for (let k = 1; k <= q; k++) a.push(amb(`Dorm. ${k} U${i}`, 10.0, `unidade ${i}, porta para a sala/cozinha`));
        a.push(amb(`Banheiro U${i}`, 3.5, `unidade ${i}, porta para a sala/cozinha`));
      }
      return { ambientes: a };
    },
  },
  frenteFundos: {
    tipo: 'terrea', nome: (q) => `Casa de ${q} Quartos com Casa de Fundos`,
    obs: 'Partido das DUAS CASAS EM SEQUÊNCIA: casa principal na frente e casa menor de 1 quarto no fundo, para alugar, com corredor lateral de acesso independente. Desenhar as DUAS casas completas, separadas por muro com portão.',
    monta: (L, C, q) => ({
      ambientes: [
        amb('Garagem Frente', 13, 'frente do lote, coberta, uso da casa da frente'),
        amb('Sala Frente', 15.6, 'casa da frente, integrada à cozinha'),
        amb('Cozinha Frente', 10.4, 'casa da frente, integrada à sala'),
        ...Array.from({ length: q }, (_, i) => amb(`Dorm. 0${i + 1} Frente`, 10.8 - i * 0.4, 'casa da frente, porta para a circulação')),
        amb('Banho Frente', 4.0, 'casa da frente, porta para a circulação'),
        amb('Circulação Frente', 4.2, 'casa da frente, distribui os quartos'),
        amb('Corredor de Acesso', C * 0.9, 'faixa descoberta na divisa, da rua até a casa dos fundos, com portão próprio'),
        amb('Sala/Cozinha Fundo', 16.8, 'casa dos fundos, ambiente integrado, porta para o corredor'),
        amb('Dorm. Fundo', 10.6, 'casa dos fundos, porta para a sala/cozinha'),
        amb('Banho Fundo', 3.6, 'casa dos fundos, porta para a sala/cozinha'),
      ],
    }),
  },
  comercioT: {
    tipo: 'terrea', nome: (q) => `Casa Térrea ${q} Quartos com Loja na Frente`,
    obs: 'Partido do COMÉRCIO E MORADIA NO MESMO PLANO: loja na frente com porta de enrolar e residência atrás, ligadas por uma porta de serviço que o morador controla.',
    monta: (L, C, q, n, s) => ({
      ambientes: [
        amb('Loja', L * 4, 'frente do lote, porta de enrolar voltada para a rua, vitrine'),
        amb('Banho da Loja', 2.6, 'nos fundos da loja, porta somente para dentro dela'),
        ...zonaSocial(L, { jantar: false }).filter((a) => a.nome !== 'Hall de Entrada'),
        ...zonaIntima(q, s),
      ],
    }),
  },
  comercioS: {
    tipo: 'sobrado', nome: (q) => `Sobrado ${q} Quartos com Loja no Térreo`,
    obs: 'Partido do USO MISTO COM FLUXOS SEPARADOS: loja no térreo voltada à rua e moradia completa no piso superior, com escada independente que sobe de um corredor lateral.',
    monta: (L, C, q, n, s) => ({
      ambientes_terreo: [
        amb('Loja', L * 5, 'frente do lote, porta de enrolar voltada para a rua, pé-direito alto'),
        amb('Banho da Loja', 2.8, 'nos fundos da loja, porta somente para dentro dela'),
        amb('Depósito', 6.5, 'nos fundos da loja, porta somente para dentro dela'),
        amb('Corredor de Acesso', C * 0.45, 'faixa estreita na divisa, da rua até a escada da moradia, com portão próprio'),
        amb('Escada', 5.6, 'no fim do corredor lateral, sobe direto para a moradia'),
      ],
      ambientes_superior: [
        amb('Escada', 5.6, 'chegada no mesmo ponto do térreo, com guarda-corpo'),
        amb('Sala de Estar', 15.4, 'na frente, sobre a loja, janela para a rua'),
        amb('Cozinha', 10.4, 'integrada à sala'),
        amb('A.S.', 3.2, 'ao lado da cozinha; alinhada sobre o banho da loja'),
        ...zonaIntima(q, s),
      ],
    }),
  },
  aptosCima: {
    tipo: 'sobrado', nome: () => 'Casa com Dois Apartamentos em Cima',
    obs: 'Partido do PRÉDIO PEQUENO: casa do proprietário no térreo e duas unidades de aluguel no piso superior, acessadas por escada externa lateral descoberta. As unidades de cima são espelhadas.',
    monta: (L, C, q, n, s) => ({
      ambientes_terreo: [
        ...garagem(1, L),
        amb('Escada Externa', 8.5, 'descoberta na divisa direita, subindo da rua direto ao piso superior'),
        ...zonaSocial(L, { jantar: false }),
        ...zonaIntima(q, s),
      ],
      ambientes_superior: [
        amb('Escada Externa', 8.5, 'chegada no mesmo ponto do térreo, patamar que serve as duas portas'),
        amb('Sala/Cozinha A', 17.5, 'unidade A, ambiente integrado, porta para o patamar'),
        amb('Dormitório A', 11.0, 'unidade A, porta para a sala/cozinha'),
        amb('Banheiro A', 3.8, 'unidade A, alinhado sobre a área molhada do térreo'),
        amb('Sala/Cozinha B', 17.5, 'unidade B, espelhada em relação à A, porta para o mesmo patamar'),
        amb('Dormitório B', 11.0, 'unidade B, porta para a sala/cozinha'),
        amb('Banheiro B', 3.8, 'unidade B, alinhado sobre a área molhada do térreo'),
      ],
    }),
  },
};

// ------------------------------------------------------------ as 70 linhas
// [partido, largura, comprimento, quartos, suítes, vagas, (n unidades)]
const LINHAS = [
  // térreas (26)
  ['linear', 5, 25, 2, 0, 1], ['linear', 6, 30, 3, 1, 1], ['linear', 4.5, 25, 1, 0, 0], ['linear', 5, 30, 2, 1, 1],
  ['patio', 7, 25, 3, 1, 1], ['patio', 8, 25, 3, 1, 2], ['patio', 6, 30, 2, 1, 1],
  ['fundo', 6, 25, 2, 0, 1], ['fundo', 8, 25, 3, 1, 1], ['fundo', 9, 25, 3, 2, 2],
  ['jardimLateral', 8, 20, 2, 1, 1], ['jardimLateral', 9, 25, 3, 1, 2], ['jardimLateral', 7, 30, 3, 1, 1],
  ['emL', 10, 25, 3, 1, 2], ['emL', 12, 25, 4, 2, 2], ['emL', 11, 25, 3, 2, 2],
  ['varanda', 5, 20, 2, 0, 1], ['varanda', 7, 25, 3, 1, 1], ['varanda', 9, 20, 2, 1, 2],
  ['gourmet', 6, 25, 2, 1, 1], ['gourmet', 8, 25, 3, 1, 2], ['gourmet', 10, 30, 3, 2, 2],
  ['esquinaT', 8, 20, 3, 1, 1], ['esquinaT', 10, 20, 3, 1, 2], ['esquinaT', 9, 25, 2, 1, 1], ['esquinaT', 12, 25, 4, 2, 2],
  // sobrados (26)
  ['sobDivisa', 5, 25, 3, 1, 1], ['sobDivisa', 6, 25, 3, 1, 1], ['sobDivisa', 7, 20, 3, 1, 2], ['sobDivisa', 4.5, 20, 2, 0, 1],
  ['sobTerraco', 5, 20, 2, 1, 1], ['sobTerraco', 7, 25, 3, 2, 1], ['sobTerraco', 8, 20, 3, 1, 2],
  ['sobVazio', 5, 30, 3, 1, 1], ['sobVazio', 6, 30, 3, 1, 1], ['sobVazio', 4, 25, 2, 1, 1],
  ['sobPeDireito', 8, 25, 3, 1, 2], ['sobPeDireito', 10, 25, 4, 1, 2], ['sobPeDireito', 9, 20, 3, 2, 2],
  ['sobRecuo', 8, 25, 3, 1, 2], ['sobRecuo', 6, 30, 2, 1, 1], ['sobRecuo', 10, 30, 4, 2, 2],
  ['sobEscritorio', 7, 20, 2, 1, 1], ['sobEscritorio', 8, 25, 3, 1, 1], ['sobEscritorio', 5, 25, 2, 1, 1],
  ['sobGourmetCima', 5, 20, 2, 1, 1], ['sobGourmetCima', 6, 25, 3, 1, 1], ['sobGourmetCima', 7, 30, 3, 2, 2],
  ['sobEsquina', 7, 20, 3, 1, 1], ['sobEsquina', 10, 20, 4, 2, 2], ['sobEsquina', 9, 25, 3, 1, 2], ['sobEsquina', 6, 20, 2, 1, 1],
  // renda e uso misto (18)
  ['geminadasT', 10, 20, 2, 0, 2], ['geminadasT', 10, 25, 2, 0, 2], ['geminadasT', 14, 25, 3, 0, 2],
  ['geminadasS', 10, 20, 2, 0, 2], ['geminadasS', 10, 25, 3, 0, 2], ['geminadasS', 12, 25, 3, 0, 2],
  ['kitnets', 8, 25, 1, 0, 0, 6], ['kitnets', 10, 30, 1, 0, 0, 8],
  ['unidades', 6, 30, 1, 0, 1, 3], ['unidades', 8, 30, 2, 0, 1, 3], ['unidades', 7, 35, 1, 0, 1, 4],
  ['frenteFundos', 8, 30, 2, 0, 1], ['frenteFundos', 10, 30, 3, 0, 2],
  ['comercioT', 10, 20, 2, 1, 0], ['comercioT', 9, 25, 2, 1, 0],
  ['comercioS', 5, 25, 2, 1, 0], ['comercioS', 7, 25, 3, 1, 0],
  ['aptosCima', 10, 25, 2, 1, 1],
];

// ------------------------------------------------------------ montagem + validação
const DESCOBERTO = /quintal|jardim|p[áa]tio|piscina|deck|corredor|po[çc]o|vazio|terra[çc]o|sacada|varanda|[áa]rea gourmet|escada externa|pergolado/i;
const coberta = (lista) => lista.filter((a) => !DESCOBERTO.test(a.nome)).reduce((t, a) => t + a.area, 0);

function paineis(tipo, L, C, extra) {
  return [
    { titulo: 'IMPLANTAÇÃO NO LOTE',
      descricao: `Vista superior do terreno de ${String(L).replace('.', ',')}x${C} m com a ${tipo === 'sobrado' ? 'projeção do sobrado, o contorno do piso superior em linha tracejada' : 'casa implantada'}, os recuos em tom claro${extra ? ', ' + extra : ''}. Calçada e rua na borda inferior. Desenho simplificado, sem mobiliário.` },
    { titulo: 'FUNDAÇÃO E CONTRAPISO',
      descricao: `Perspectiva isométrica da mesma construção na fase de concretagem: sapatas e vigas baldrame seguindo exatamente as paredes ${tipo === 'sobrado' ? 'do térreo, pilares aprumados nos apoios do piso superior' : 'da planta'}, contrapiso nivelado e tubos de esgoto e água aflorando nos pontos dos banheiros, cozinha e área de serviço. Sem pessoas.` },
  ];
}

const nomesUsados = new Set();
const atuais = JSON.parse(readFileSync(join(RAIZ, 'specs', 'projetos-todos.json'), 'utf8')).projetos.slice(0, 30);
atuais.forEach((p) => nomesUsados.add(p.nome));

const fichas = [];
const problemas = [];
LINHAS.forEach((linha, idx) => {
  const [key, L, C, q, s, v, n = 0] = linha;
  const num = 31 + idx;
  const def = PARTIDOS[key] || RENDA[key];
  const lote = L * C;
  let ficha = { tipo: def.tipo, lote: { largura: L, comprimento: C }, quartos: q, suites: s, vagas: v, observacao: def.obs };

  if (PARTIDOS[key] && def.tipo === 'terrea') ficha.ambientes = def.monta(L, C, q, s, v);
  else if (PARTIDOS[key]) { const r = montaSobrado(def, L, C, q, s, v); ficha.ambientes_terreo = r.terreo; ficha.ambientes_superior = r.superior; }
  else Object.assign(ficha, def.monta(L, C, q, n, s));

  // encaixe: área coberta do térreo até 70% do lote (reduz ambientes cobertos, mínimo 78%)
  const terreo = ficha.ambientes || ficha.ambientes_terreo;
  let ocup = coberta(terreo) / lote;
  if (ocup > 0.7) {
    const fator = Math.max(0.78, 0.7 / ocup);
    const ajusta = (lista) => lista.forEach((a) => { if (!DESCOBERTO.test(a.nome)) a.area *= fator; });
    ajusta(terreo); if (ficha.ambientes_superior) ajusta(ficha.ambientes_superior);
    ocup = coberta(terreo) / lote;
  }
  // quintal: o que sobra do lote, com mínimo útil
  const quintalRestante = Math.max(8, lote * 0.92 - terreo.reduce((t, a) => t + a.area, 0));
  if (!/kitnets|unidades/.test(key)) terreo.push(amb('Quintal', Math.min(quintalRestante, lote * 0.3), 'fundo do lote, gramado'));

  if (ocup > 0.72) problemas.push(`p${num} ${key} ${L}x${C}: ocupação ${(ocup * 100).toFixed(0)}%`);

  const todas = [...(ficha.ambientes || []), ...(ficha.ambientes_terreo || []), ...(ficha.ambientes_superior || [])];
  todas.forEach((a) => (a.area = f2(a.area)));
  const num2 = (x) => parseFloat(String(x).replace(',', '.'));
  const cob = todas.filter((a) => !DESCOBERTO.test(a.nome)).reduce((t, a) => t + num2(a.area), 0);
  ficha.area_construida = Math.round(cob);
  ficha.banheiros = todas.filter((a) => /banho|banheiro|lavabo/i.test(a.nome)).length;

  let nome = def.nome(q, n);
  if (nomesUsados.has(nome)) nome = `${nome} — Lote ${String(L).replace('.', ',')}x${C}`;
  nomesUsados.add(nome);

  const slug = `${def.tipo}-${String(L).replace('.', '')}x${C}-${key.toLowerCase()}`;
  fichas.push({
    id: `p${num}-${slug}`, nome, ...ficha,
    paineis: paineis(def.tipo, L, C, /esquina/i.test(key) ? 'mostrando as DUAS ruas (embaixo e na lateral direita)' : ''),
  });
});

const ordem = ['id', 'nome', 'tipo', 'lote', 'area_construida', 'quartos', 'suites', 'banheiros', 'vagas', 'observacao', 'ambientes', 'ambientes_terreo', 'ambientes_superior', 'paineis'];
const limpa = (f) => Object.fromEntries(ordem.filter((k) => f[k] !== undefined).map((k) => [k, f[k]]));
const novas = fichas.map(limpa);

writeFileSync(join(RAIZ, 'specs', 'projetos-p31-p100.json'), JSON.stringify({ projetos: novas }, null, 2));
writeFileSync(join(RAIZ, 'specs', 'projetos-todos.json'), JSON.stringify({ projetos: [...atuais, ...novas] }, null, 1));

const tipos = novas.reduce((t, p) => ((t[p.tipo] = (t[p.tipo] || 0) + 1), t), {});
console.log(`${novas.length} fichas novas (p31–p${30 + novas.length}) · ${JSON.stringify(tipos)}`);
console.log(`total em projetos-todos.json: ${30 + novas.length}`);
console.log(problemas.length ? 'OCUPAÇÃO ALTA:\n  ' + problemas.join('\n  ') : 'ocupação: todas até 72% do lote');
