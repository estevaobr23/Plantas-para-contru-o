/**
 * prompts/fachada.mjs — monta o prompt do RENDER 3D DA CASA PRONTA.
 *
 * Diferença crucial em relação ao prompt da planta: aqui a IMAGEM DA PLANTA
 * JÁ GERADA vai junto, como referência visual. O modelo não inventa a casa —
 * ele constrói em 3D exatamente o volume que a planta descreve.
 *
 * Saída: 1 render fotorrealista 4:3 da casa construída, vista da rua.
 */

const CAMERA = `
CÂMERA E ENQUADRAMENTO:
- Vista em perspectiva de quem está na calçada, do outro lado da rua, olhando
  para a casa. Altura da câmera ao nível dos olhos de uma pessoa em pé (1,60 m).
- Ângulo de três quartos: a FACHADA FRONTAL ocupa a maior parte do quadro e uma
  das laterais aparece em fuga, dando volume. Nunca de frente chapado, nunca de
  cima, nunca em plano baixo dramático.
- A casa INTEIRA cabe no quadro, do chão ao topo do telhado, com uma folga de
  céu acima e um pedaço de calçada abaixo.
- Lente equivalente a 35 mm, sem distorção de grande angular, linhas verticais
  aprumadas (as paredes não podem "cair" para os lados).
`.trim();

const LUZ = `
LUZ E ATMOSFERA:
- Fim de tarde de céu limpo, sol baixo vindo de trás e de lado da câmera,
  iluminando a fachada com luz quente e dourada.
- Sombras longas e suaves projetadas no chão, coerentes com essa única fonte de luz.
- Céu azul com poucas nuvens altas, sem drama, sem tempestade, sem pôr do sol
  alaranjado exagerado.
- Algumas luzes acesas dentro da casa, vistas pelas janelas, dando sensação de
  casa habitada.
`.trim();

const MATERIAIS = `
MATERIAIS E ACABAMENTO (padrão brasileiro de obra real, sem luxo irreal):
- Paredes em reboco pintado, cores claras e sóbrias (branco, cinza-claro, areia),
  com no máximo UM elemento de destaque em cor ou revestimento diferente.
- Esquadrias de alumínio ou PVC, vidro transparente, na cor preta, branca ou
  cinza-escuro — coerentes em toda a casa.
- Telhado: ou telha cerâmica aparente com beiral, ou platibanda escondendo o
  telhado — escolha UM e aplique em toda a casa.
- Pode haver um painel ripado de madeira, uma pastilha ou uma pedra decorativa
  em um trecho da fachada, usado com parcimônia.
- Portão de garagem metálico, muro frontal baixo com gradil ou portão social.
- Nada de mármore em excesso, nada de fachada espelhada, nada de mansão.
  Esta é uma casa de obra popular bem executada, não um palacete.
`.trim();

const ENTORNO = `
ENTORNO:
- Rua asfaltada com meio-fio e calçada de concreto na frente.
- Jardim frontal simples: grama, um ou dois arbustos, talvez uma árvore pequena.
- Casas vizinhas apenas sugeridas, desfocadas ou parcialmente cortadas pelas
  bordas do quadro — nunca disputando atenção com a casa principal.
- UM carro popular estacionado na garagem, se o projeto tiver garagem coberta.
- SEM pessoas, SEM animais, SEM texto, SEM placa, SEM marca, SEM logotipo,
  SEM número de casa, SEM marca d'água.
`.trim();

const PROIBIDO = `
PROIBIDO (qualquer um invalida a imagem):
- Qualquer texto, número, letra, placa, logotipo ou marca d'água na imagem.
- Planta baixa, desenho técnico, cota, legenda ou qualquer elemento 2D.
- Pessoas, rostos, animais.
- Casa com mais pavimentos do que o projeto tem.
- Garagem onde o projeto não tem garagem; ausência de garagem onde o projeto tem.
- Número de janelas da frente grosseiramente diferente do que a planta mostra.
- Estética de mansão de luxo, condomínio americano, casa europeia com neve,
  cabana de madeira ou arquitetura que não seja residencial brasileira urbana.
- Imagem em preto e branco, desenho a lápis, aquarela, estilo cartoon ou render
  de videogame. Precisa parecer FOTOGRAFIA de uma casa real.
`.trim();

function descreverVolume(p) {
  if (p.tipo === 'sobrado') {
    return `VOLUME: SOBRADO de DOIS pavimentos. O pavimento superior aparece
inteiro acima do térreo, com suas janelas e, quando houver, a sacada em balanço
sobre a garagem. A casa tem exatamente 2 andares — nem 1, nem 3.`;
  }
  return `VOLUME: CASA TÉRREA, de UM único pavimento. Nenhum segundo andar,
nenhuma escada externa, nenhuma janela em altura de segundo piso. A casa tem
exatamente 1 andar.`;
}

function elementosDaFrente(p) {
  const lista = p.ambientes || p.ambientes_terreo || [];
  const achar = (re) => lista.find((a) => re.test(a.nome));
  const itens = [];

  const garagem = achar(/garagem|vaga/i);
  if (garagem) {
    const coberta = /coberta|coberto/.test(garagem.vinculo || '') || !/descoberta/.test(garagem.vinculo || '');
    itens.push(
      coberta
        ? `GARAGEM COBERTA na frente, com portão metálico; ela está embutida no volume da casa`
        : `VAGA DESCOBERTA na frente, com piso de concreto e portão de acesso`
    );
  }
  if (achar(/varanda/i)) itens.push('VARANDA COBERTA na frente, com pilar e guarda-corpo');
  if (achar(/sacada/i)) itens.push('SACADA no pavimento superior, voltada para a rua, com guarda-corpo de vidro ou alvenaria');
  if (achar(/loja|com[ée]rcio/i)) itens.push('LOJA no térreo voltada para a rua, com porta de enrolar metálica e vitrine de vidro');
  if (achar(/jardim frontal/i)) itens.push('JARDIM FRONTAL ajardinado entre a calçada e a casa, com passeio até a porta');
  if (achar(/escrit[óo]rio/i)) itens.push('uma SEGUNDA PORTA independente na fachada, de acesso ao escritório');
  if (achar(/escada externa/i)) itens.push('ESCADA EXTERNA lateral subindo para o pavimento superior');

  return itens.length
    ? `ELEMENTOS QUE PRECISAM APARECER NA FACHADA:\n${itens.map((i) => `  • ${i}`).join('\n')}`
    : '';
}

// Leitura dirigida da face da rua para os projetos em que a planta exige uma
// composicao menos obvia. "Esquerda" e "direita" sao sempre as de quem esta
// na rua olhando para a casa; isso evita espelhamentos e elementos inventados.
const FACHADAS_DIRIGIDAS = {
  'p02-terrea-6x25-2q-patio': `FACHADA EXATA: casa terrea estreita. Na face da rua ha uma entrada social
no lado esquerdo e o acesso de veiculo no lado direito. Nao criar uma grande
janela de quarto ou sala na frente. O patio central e interno e nao aparece.`,
  'p07-terrea-8x20-3q-suite': `FACHADA EXATA: casa terrea recuada, com jardim e passeio na frente. A garagem
para dois carros fica para tras no lado esquerdo, acessada por uma faixa lateral;
nao transformar a garagem em um volume ocupando a frente. A face frontal da casa
tem as janelas dos ambientes alinhados na borda inferior da planta.`,
  'p08-terrea-7x25-2q-fundos': `FACHADA EXATA: casa terrea com vaga DESCOBERTA no lado esquerdo e jardim frontal
no lado direito. Nao criar cobertura, pergolado ou volume fechado sobre o carro.
A casa fica recuada e mostra duas janelas frontais, com acesso pelo jardim.`,
  'p10-terrea-6x30-fundos': `FACHADA EXATA: este e um projeto de CASA DE FUNDOS. Vista da rua, mostre a casa
terrea existente ocupando a frente e um portao/corredor de acesso independente no
lado esquerdo; por esse corredor deve ser possivel perceber a nova casa terrea ao
fundo com varanda. Nao fingir que a casa de fundos esta sozinha na frente do lote.`,
  'p15-sobrado-45x25-estreito': `FACHADA EXATA: sobrado muito estreito de 4,5 m. No terreo, garagem no lado
esquerdo e entrada social no lado direito. No pavimento superior existe apenas
uma janela frontal de dormitorio. NAO EXISTE SACADA NEM VARANDA no piso superior.`,
  'p16-sobrado-7x20-4q': `FACHADA EXATA: sobrado com garagem para dois carros no lado esquerdo, entrada
social ao centro e jardim no lado direito. A unica sacada fica no pavimento
superior do LADO DIREITO, exatamente sobre o jardim, nunca sobre a garagem.`,
  'p17-sobrado-8x20-esquina': `FACHADA EXATA: sobrado de esquina. Na frente principal, jardim no lado esquerdo,
porta social ao centro e garagem para dois carros no lado direito. A unica sacada
fica no pavimento superior do LADO ESQUERDO, acima do jardim. A lateral direita
acompanha a segunda rua e deve aparecer em fuga.`,
  'p19-sobrado-6x25-comercio': `FACHADA EXATA: sobrado com loja. No terreo, um corredor/porta residencial
independente e a escada ficam no lado esquerdo; a vitrine e a porta de enrolar da
loja ocupam o lado direito. A vaga coberta fica no fundo do lote, acessada pelo
corredor: NAO criar garagem frontal nem carro na fachada. NAO criar sacada.`,
  'p20-sobrado-12x20-geminados': `FACHADA EXATA: dois sobrados geminados identicos, lado a lado e espelhados.
Cada unidade tem sua garagem coberta no extremo externo e sua porta/jardim junto
ao eixo central. No piso superior, cada unidade tem uma janela frontal. NAO ha
sacadas, varandas ou terracos na frente. Mostrar as DUAS unidades completas.`,
  'p21-sobrado-5x25-compacto': `FACHADA EXATA: sobrado estreito de 5 m. Garagem coberta na frente, com entrada
social independente no lado direito. No pavimento superior ha UMA unica janela
frontal de dormitorio. NAO criar sacada nem segunda janela frontal no piso alto.`,
  'p23-terrea-8x20-comercio': `FACHADA EXATA: casa terrea com ponto comercial. A loja ocupa o lado ESQUERDO
da fachada, com vitrine e porta de enrolar; a garagem coberta ocupa o lado DIREITO.
Nao espelhar esses dois elementos e nao criar segundo pavimento.`,
  'p27-terrea-6x20-kitnets': `FACHADA EXATA: conjunto terreo com quatro kitnets. Da rua aparecem as duas
unidades da frente, uma de cada lado, e o portao do corredor comum exatamente no
centro. Cada unidade frontal tem uma janela; nao ha garagem. NAO mostrar carros,
nem mesmo estacionados na rua, e nao mostrar marcas ou logotipos.`,
  'p29-sobrado-8x25-tres-unidades': `FACHADA EXATA: sobrado com tres unidades. No terreo, garagem para dois carros
no lado ESQUERDO, entrada social proxima ao centro e escada externa no extremo
DIREITO. No piso superior aparecem duas unidades lado a lado, cada uma com sua
propria sacada frontal; sao DUAS sacadas separadas. Nao espelhar a garagem.`
};

export function montarPromptFachada(p) {
  const frente = `${p.lote.largura} metros`;
  const unidades = /geminad|duas casas|kitnet|unidades/i.test(p.nome)
    ? `\nATENÇÃO: este projeto tem MAIS DE UMA UNIDADE no mesmo lote. O render deve
mostrar o CONJUNTO como se vê da rua, com as unidades lado a lado ou em sequência,
e não apenas uma delas.`
    : '';

  return `A imagem anexada é a PLANTA BAIXA de um projeto residencial brasileiro.
Sua tarefa: produzir uma FOTOGRAFIA REALISTA da casa dessa planta já CONSTRUÍDA,
vista da rua.

COMO USAR A PLANTA ANEXADA (não a copie, CONSTRUA a partir dela):
- A planta é a verdade sobre o volume: respeite a largura da casa, a posição da
  garagem, da porta de entrada, da varanda e das janelas da frente.
- A frente do lote, na planta, está na parte de BAIXO do desenho. É essa face que
  você vai mostrar no render.
- Conte as janelas e portas voltadas para a frente na planta e reproduza essa
  mesma quantidade e posição na fachada.
- NÃO desenhe a planta, NÃO mostre linhas técnicas: entregue uma FOTOGRAFIA
  da casa pronta, construída, no mundo real.

[dados do projeto, para você construir corretamente — NÃO escrever na imagem]
Nome: ${p.nome}
Tipo: ${p.tipo === 'sobrado' ? 'sobrado de dois pavimentos' : 'casa térrea de um pavimento'}
Largura do lote (frente para a rua): ${frente}
Programa: ${p.quartos} quarto(s) · ${p.banheiros} banheiro(s) · ${p.vagas} vaga(s)
Partido: ${p.observacao || '—'}${unidades}

=== ${descreverVolume(p)}

=== ${elementosDaFrente(p)}

=== ${FACHADAS_DIRIGIDAS[p.id] || ''}

=== ${CAMERA}

=== ${LUZ}

=== ${MATERIAIS}

=== ${ENTORNO}

=== ${PROIBIDO}

Entregue uma fotografia arquitetônica realista, nítida, em alta definição,
como as que aparecem em anúncio de imobiliária.`;
}
