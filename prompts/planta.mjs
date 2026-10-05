/**
 * prompts/planta.mjs — monta o prompt da PRANCHA DE PLANTA HUMANIZADA.
 *
 * Regra de ouro: TODO número que aparece na imagem vem da ficha
 * (specs/projetos.json). O modelo nunca inventa medida nem área —
 * ele desenha o que a ficha manda, no estilo definido aqui.
 *
 * Saída esperada: 1 prancha 16:9, fundo branco, planta colorida vista de
 * cima + painéis de perspectiva ao lado. Sobrado = 2 plantas na mesma prancha.
 */

const ESTILO = `
ESTILO VISUAL (obrigatório, idêntico em todos os projetos):
- Planta baixa humanizada vista de cima, projeção ortogonal perfeita (90° exatos,
  camera perpendicular ao piso). SEM perspectiva, SEM inclinação, SEM isometria na planta.
- Fundo da prancha: BRANCO PURO (#FFFFFF). Nada de textura, moldura, sombra de papel
  ou borda decorativa na prancha.
- Paredes: preenchidas em cinza-escuro sólido (#3A3F45), corte limpo, espessura
  uniforme e proporcional (parede externa visivelmente mais grossa que a interna).
- Pisos coloridos por ambiente, em tons realistas e dessaturados:
  madeira clara nos dormitórios; porcelanato cinza-claro na sala/cozinha/circulação;
  cerâmica clara nos banheiros e área de serviço; pedrisco/deck no espaço aberto;
  concreto texturizado na garagem; grama e vegetação no quintal e jardim.
- Mobiliário desenhado de cima, realista e na escala certa: camas com roupa de cama,
  guarda-roupas, sofá, mesa de jantar com cadeiras, bancada de cozinha com cooktop e
  cuba, geladeira, vaso sanitário, pia, box de vidro, máquina de lavar, carros na garagem.
- Vegetação vista de cima: copas de árvores, arbustos e vasos, em verdes variados.
- CÓDIGO DE CORES DAS ABERTURAS (regra rígida — cada abertura recebe a cor do seu
  tipo, pintada sobre o vão na espessura da parede, em traço nítido e saturado):
  • JANELA — AZUL (#1E88E5). Vão na parede com linha dupla fina azul. Não dá passagem.
  • PORTA INTERNA — LARANJA (#F57C00). Folha e ARCO DE GIRO (quarto de círculo)
    desenhados em laranja.
  • PORTA-JANELA / PORTA BALCÃO — VERDE (#2E9E5B). Vão largo do piso ao teto,
    envidraçado, com as folhas de correr indicadas em verde.
  • PORTA DE ENTRADA e PORTÃO DA GARAGEM — GRAFITE (#37474F), com arco de giro
    na porta de entrada e folhas de correr no portão.
  Nenhuma abertura pode ficar sem cor. Nenhuma cor pode ser usada para outro fim
  dentro da planta.
- Sombra suave e coerente projetada pelos móveis e paredes (luz vindo do mesmo
  canto em toda a prancha).
- Qualidade de render arquitetônico profissional, bordas nítidas, alta definição.
`.trim();

const TEXTO = `
TEXTOS DENTRO DA IMAGEM (seguir ao pé da letra):
- Idioma: PORTUGUÊS DO BRASIL, com acentuação correta.
- Fonte: sans-serif limpa, fina, cinza-escuro, legível e PEQUENA — o texto nunca
  domina o desenho.
- Em cada ambiente, duas linhas centralizadas: o NOME do ambiente e, abaixo,
  a área no formato "A = 00,00 m²".
- TODO texto fica na HORIZONTAL. Nenhuma palavra girada, inclinada ou na vertical,
  em nenhuma hipótese. Se o ambiente for estreito demais para caber o texto na
  horizontal, escreva o nome FORA do ambiente, ao lado, com uma linha de chamada
  fina apontando para dentro dele.
- A unidade de área é SEMPRE metro quadrado, escrito "m²" (m com o algarismo dois
  sobrescrito). NUNCA "m³", NUNCA "m2", NUNCA "M²".
- Escreva EXATAMENTE os nomes e as áreas da lista de ambientes. Não traduza,
  não abrevie, não arredonde, não invente ambiente que não esteja na lista,
  não omita nenhum item da lista.
- Nenhum outro texto na prancha além dos nomes de ambiente, das áreas, dos
  títulos de painel indicados e das cotas pedidas. SEM logotipo, SEM marca,
  SEM nome de escritório, SEM assinatura, SEM legenda extra, SEM números de
  página, SEM marca d'água.
`.trim();

const COTAS = `
COTAS E ORIENTAÇÃO:
- A FRENTE do lote (rua) fica SEMPRE na parte INFERIOR da prancha. A entrada
  principal e a garagem voltam-se para baixo.
- Desenhe a linha de contorno do lote inteiro (limite do terreno) em traço fino
  e contínuo, com o recuo visível entre o limite e as paredes da casa.
- Cote o lote nos dois sentidos, fora do contorno: a largura embaixo e o
  comprimento na lateral direita, com linha de cota de ponta a ponta,
  setas nas extremidades e o valor por extenso.
`.trim();

const LEGENDA = `
LEGENDA (faixa horizontal no RODAPÉ da prancha, fora do desenho, fundo branco,
altura pequena, itens na mesma linha, cada um com um retângulo da cor seguido do
texto em caixa alta pequena):
  [azul] JANELA    [laranja] PORTA    [verde] PORTA-JANELA    [grafite] ENTRADA / GARAGEM
A legenda não encosta na planta e não tem moldura.
`.trim();

function blocoAmbientes(lista, titulo) {
  const linhas = lista
    .map((a) => {
      const v = a.vinculo ? ` — ACESSO: ${a.vinculo}` : '';
      return `  • ${a.nome} — A = ${a.area} m²${v}`;
    })
    .join('\n');
  return `${titulo} (${lista.length} ambientes — desenhar TODOS, nenhum a mais):
${linhas}

REGRA DE ACESSO (obrigatória): posicione cada ambiente de modo que o acesso
descrito acima seja verdadeiro no desenho. Um banheiro privativo de suíte nasce
DENTRO da suíte, com porta abrindo para ela e para mais nenhum outro ambiente —
nunca enfileirado no corredor ao lado dos outros banheiros. Um closet de suíte
abre somente para a suíte. Banheiros de ambientes diferentes não se agrupam
lado a lado no miolo da casa só por conveniência de desenho.`;
}

function blocoPaineis(p) {
  const paineis = p.paineis || [];
  if (!paineis.length) return '';
  const itens = paineis
    .map(
      (x, i) =>
        `  ${i + 1}. "${x.titulo}" — ${x.descricao}`
    )
    .join('\n');
  return `
PAINÉIS DE APOIO (coluna à DIREITA da prancha, empilhados, cada um em seu quadro
com título pequeno em caixa alta acima; a coluna ocupa no máximo 1/3 da largura
e NUNCA cobre a planta principal):
${itens}

CONGRUÊNCIA DOS PAINÉIS (regra rígida): o painel de fundação deve reproduzir
EXATAMENTE o contorno e as divisórias internas da planta baixa ao lado — mesmas
paredes, mesmas posições, mesma proporção, apenas na fase estrutural. Se uma
parede existe na planta, existe no painel; se não existe, não aparece.
`.trim();
}

function blocoPisos(p) {
  if (p.tipo !== 'sobrado') {
    return `COMPOSIÇÃO DA PRANCHA: UMA única planta baixa, grande, ocupando a maior
parte da área da prancha, com os painéis de apoio ao lado.

${blocoAmbientes(p.ambientes, 'AMBIENTES DA CASA')}`;
  }

  return `COMPOSIÇÃO DA PRANCHA: DUAS plantas baixas lado a lado, do MESMO tamanho e
na MESMA escala, separadas por um espaço branco limpo. À esquerda o PAVIMENTO
TÉRREO, à direita o PAVIMENTO SUPERIOR. Acima de cada uma, um título pequeno em
caixa alta: "PAVIMENTO TÉRREO" e "PAVIMENTO SUPERIOR".

COERÊNCIA ENTRE OS DOIS PAVIMENTOS (regra rígida — a planta é inválida se falhar):
- O contorno externo da casa é EXATAMENTE o mesmo nos dois pavimentos (mesma
  largura, mesmo comprimento, mesmo alinhamento).
- A escada ocupa a MESMA posição nos dois desenhos: no térreo mostrando os degraus
  subindo, no superior mostrando a chegada e o guarda-corpo.
- As paredes hidráulicas coincidem: banheiros e área molhada do piso superior
  ficam alinhados sobre os do térreo.
- A garagem e a entrada principal existem apenas no térreo.

${blocoAmbientes(p.ambientes_terreo, 'AMBIENTES DO PAVIMENTO TÉRREO')}

${blocoAmbientes(p.ambientes_superior, 'AMBIENTES DO PAVIMENTO SUPERIOR')}`;
}

const PROIBIDO = `
PROIBIDO (qualquer um destes invalida a imagem):
- Mão humana, caneta, marcador, lápis, régua, mesa, prancheta ou qualquer objeto
  físico sobre o desenho. A prancha é 100% digital e limpa.
- Rabisco, anotação manual, seta desenhada à mão ou destaque de marca-texto.
- Qualquer texto em inglês ou em idioma que não seja português do Brasil.
- Medida, área ou cota diferente das informadas nesta instrução.
- Ambiente sem nome ou sem a área escrita.
- Quarto, banheiro ou suíte acessível somente passando por dentro de outro quarto.
- Banheiro ou cozinha sem janela ou sem abertura para ventilação.
- Móvel fora de escala (cama maior que o quarto, carro maior que a garagem).
- Parede solta que não fecha ambiente, ou ambiente sem porta de acesso.
- Fundo colorido, gradiente, textura de papel, moldura ou sombra de folha.
- Dois ou mais banheiros enfileirados lado a lado no miolo da casa.
- Banheiro de suíte com porta para o corredor em vez de para dentro da suíte.
- Closet servindo de passagem entre dois ambientes.
- Abertura (janela ou porta) desenhada sem a cor do seu tipo.
- Painel de fundação com paredes diferentes das da planta baixa.
`.trim();

export function montarPromptPlanta(p) {
  const vagas = p.vagas > 0 ? `${p.vagas} vaga(s) de garagem coberta` : 'sem garagem coberta';

  return `Crie UMA prancha de apresentação arquitetônica, formato paisagem 16:9,
de um projeto residencial brasileiro para terreno pequeno.

=== IDENTIFICAÇÃO DO PROJETO ===
Nome: ${p.nome}
Tipo: ${p.tipo === 'sobrado' ? 'sobrado (dois pavimentos)' : 'casa térrea'}
Terreno: ${p.lote.largura} m de frente × ${p.lote.comprimento} m de fundo (${p.lote.largura}x${p.lote.comprimento} m)
Área construída aproximada: ${p.area_construida} m²
Programa: ${p.quartos} quarto(s), sendo ${p.suites} suíte(s) · ${p.banheiros} banheiro(s) · ${vagas}
${p.observacao ? `Partido adotado: ${p.observacao}` : ''}

=== ${blocoPisos(p)}

=== ${ESTILO}

=== ${COTAS}

=== ${TEXTO}

=== ${blocoPaineis(p)}

=== ${LEGENDA}

=== ${PROIBIDO}

Gere a prancha completa, pronta para publicação em um catálogo de projetos.`;
}
