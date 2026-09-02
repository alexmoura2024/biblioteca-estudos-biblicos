import type {
  Study,
  StatusEditorial,
  TipoRelacaoPassagem,
} from "@/lib/types";
import { getBookBySlug } from "@/lib/data/books";
import { getTopicBySlug } from "@/lib/data/topics";
import { getCharacterBySlug } from "@/lib/data/characters";
import { getSeriesBySlug } from "@/lib/data/series";
import { formatReference } from "@/lib/search/reference";
import { slugify } from "@/lib/search/normalize";

/**
 * Estudos fictícios usados no Marco 1 (protótipo visual). Nenhum destes
 * textos provém do acervo real do Google Drive — são conteúdos de exemplo
 * escritos para validar navegação, busca e a modelagem de dados descrita
 * em docs/DATA_MODEL.md antes da ingestão do acervo real (ver DEC-006 em
 * docs/DECISIONS.md).
 */
interface StudyPassageSeed {
  /** slug do livro, ver src/lib/data/books.ts */
  livro: string;
  capitulo: number;
  versiculoInicio?: number;
  versiculoFim?: number;
  tipoRelacao?: TipoRelacaoPassagem;
  prioridade?: number;
}

interface StudySeed {
  titulo: string;
  resumo: string;
  conteudo: string[];
  status?: StatusEditorial;
  autor: string;
  dataOrigem: string;
  palavrasChave: string[];
  passagens: StudyPassageSeed[];
  /** slugs de temas, com peso opcional (padrão 1) */
  temas: Array<{ slug: string; peso?: number }>;
  /** slugs de personagens, com papel opcional */
  personagens?: Array<{ slug: string; papel?: string }>;
  /** slug da série, com ordem */
  serie?: { slug: string; ordem: number };
}

const STUDY_SEEDS: StudySeed[] = [
  {
    titulo: "A fé que responde ao chamado",
    resumo:
      "Como o chamado de Deus a Abraão, em Gênesis 12, convida à saída da segurança conhecida rumo à promessa.",
    conteudo: [
      "Em Gênesis 12, Deus chama Abrão a deixar sua terra, sua parentela e a casa de seu pai rumo a uma terra que lhe seria mostrada. Não há mapa, apenas uma promessa.",
      "A fé de Abrão não elimina a incerteza do caminho; ela responde a uma palavra confiável antes de qualquer confirmação visível. Esse é o padrão que atravessa toda a narrativa bíblica da fé.",
      "Para o leitor de hoje, o texto convida a reconhecer que obedecer a Deus frequentemente significa caminhar antes de enxergar o destino completo — sustentado pelo caráter de quem chama, não pelas circunstâncias.",
    ],
    autor: "Equipe Editorial",
    dataOrigem: "2024-02-10",
    palavrasChave: ["chamado", "promessa", "peregrinação", "aliança"],
    passagens: [{ livro: "genesis", capitulo: 12, versiculoInicio: 1, versiculoFim: 9, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "fe", peso: 3 }],
    personagens: [{ slug: "abraao", papel: "protagonista" }],
  },
  {
    titulo: "Provação e provisão no monte Moriá",
    resumo:
      "Um estudo sobre Gênesis 22 e a tensão entre a exigência divina, a obediência de Abraão e a provisão de Deus.",
    conteudo: [
      "Gênesis 22 narra o episódio mais tenso da vida de Abraão: a ordem para oferecer Isaque, o filho da promessa, em sacrifício.",
      "A obediência de Abraão não é cega — é construída sobre décadas de experiência com a fidelidade de Deus, expressa na afirmação de que 'Deus proverá' (v. 8).",
      "O carneiro preso no matagal, oferecido no lugar de Isaque, antecipa um princípio que percorre toda a Escritura: Deus mesmo provê o sacrifício que a obediência humana não poderia produzir.",
    ],
    autor: "Pr. José Ricardo Alves",
    dataOrigem: "2024-02-24",
    palavrasChave: ["sacrifício", "provisão", "monte moriá", "Isaque"],
    passagens: [{ livro: "genesis", capitulo: 22, versiculoInicio: 1, versiculoFim: 19, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "fe", peso: 2 }, { slug: "obediencia", peso: 3 }],
    personagens: [{ slug: "abraao", papel: "protagonista" }],
  },
  {
    titulo: "A sarça ardente e o chamado de Moisés",
    resumo:
      "Êxodo 3 apresenta o encontro de Moisés com Deus na sarça ardente e o envio para libertar o povo de Israel.",
    conteudo: [
      "No deserto de Midiã, Moisés se depara com uma sarça que arde sem se consumir — um sinal da presença santa de Deus em meio ao comum.",
      "Deus se revela como 'EU SOU O QUE SOU' e comissiona Moisés, apesar de suas objeções, para liderar a libertação de Israel do Egito.",
      "O texto ensina que a liderança bíblica nasce do encontro com Deus, não da autoconfiança: Moisés é enviado com a garantia 'Eu serei contigo' (v. 12).",
    ],
    autor: "Profa. Marta Nascimento",
    dataOrigem: "2024-03-02",
    palavrasChave: ["chamado", "libertação", "presença", "nome de Deus"],
    passagens: [{ livro: "exodo", capitulo: 3, versiculoInicio: 1, versiculoFim: 15, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "obediencia", peso: 2 }, { slug: "lideranca", peso: 3 }],
    personagens: [{ slug: "moises", papel: "protagonista" }],
  },
  {
    titulo: "Lealdade e redenção no livro de Rute",
    resumo:
      "A decisão de Rute de permanecer com Noemi inaugura uma história de lealdade que desemboca em redenção.",
    conteudo: [
      "Diante da perda e da possibilidade de voltar para o próprio povo, Rute escolhe permanecer ao lado de Noemi: 'Aonde quer que tu fores, irei eu' (1:16).",
      "Essa lealdade, aparentemente pequena, é o fio que conduz à redenção da família por meio de Boaz, o parente-resgatador.",
      "O livro de Rute mostra como a fidelidade cotidiana, praticada sem grandes sinais, é usada por Deus para tecer sua obra redentora ao longo das gerações.",
    ],
    autor: "Equipe Editorial",
    dataOrigem: "2024-03-15",
    palavrasChave: ["lealdade", "redenção", "família", "parente-resgatador"],
    passagens: [{ livro: "rute", capitulo: 1, versiculoInicio: 1, versiculoFim: 18, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "graca", peso: 3 }, { slug: "familia", peso: 2 }],
    personagens: [{ slug: "rute", papel: "protagonista" }],
  },
  {
    titulo: "Davi e Golias: fé contra o gigante",
    resumo:
      "O confronto entre Davi e Golias em 1 Samuel 17 revela uma fé que enxerga além do tamanho do problema.",
    conteudo: [
      "Enquanto o exército de Israel treme diante de Golias, o jovem Davi enxerga o desafio a partir de outra referência: 'quem é este filisteu incircunciso, para afrontar os exércitos do Deus vivo?' (17:26).",
      "Davi não nega o perigo; ele o interpreta à luz do caráter de Deus, lembrando as vitórias passadas sobre o leão e o urso.",
      "A vitória de Davi, sem a armadura de Saul, ensina que a confiança bíblica não depende de recursos proporcionais ao problema, mas da fidelidade de Deus.",
    ],
    autor: "Pr. José Ricardo Alves",
    dataOrigem: "2024-04-05",
    palavrasChave: ["Golias", "gigante", "confiança", "batalha"],
    passagens: [{ livro: "1-samuel", capitulo: 17, versiculoInicio: 32, versiculoFim: 50, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "fe", peso: 3 }],
    personagens: [{ slug: "davi", papel: "protagonista" }],
    serie: { slug: "vida-de-davi", ordem: 1 },
  },
  {
    titulo: "Davi, Natã e o arrependimento",
    resumo:
      "Após o pecado com Bate-Seba, o confronto do profeta Natã leva Davi a um arrependimento genuíno em 2 Samuel 12.",
    conteudo: [
      "O profeta Natã confronta Davi com uma parábola sobre um cordeirinho roubado, levando o rei a reconhecer: 'Pequei contra o Senhor' (12:13).",
      "O texto não minimiza a gravidade do pecado nem suas consequências, mas também não esconde a resposta de Deus ao arrependimento sincero.",
      "Este episódio, lido ao lado do Salmo 51, mostra o caminho bíblico entre a queda e a restauração: confissão sem desculpas e confiança na misericórdia de Deus.",
    ],
    autor: "Profa. Marta Nascimento",
    dataOrigem: "2024-04-19",
    palavrasChave: ["arrependimento", "confissão", "Natã", "Bate-Seba"],
    passagens: [{ livro: "2-samuel", capitulo: 12, versiculoInicio: 1, versiculoFim: 13, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "perdao", peso: 3 }],
    personagens: [{ slug: "davi", papel: "protagonista" }],
    serie: { slug: "vida-de-davi", ordem: 2 },
  },
  {
    titulo: "O Senhor é o meu pastor",
    resumo:
      "O Salmo 23 descreve o cuidado de Deus como o de um pastor que guia, conforta e sustenta em toda circunstância.",
    conteudo: [
      "Davi, que foi pastor antes de ser rei, descreve sua relação com Deus usando a imagem mais próxima de sua própria experiência: 'O Senhor é o meu pastor; nada me faltará' (v. 1).",
      "O salmo percorre vales sombrios e mesas preparadas 'na presença dos meus inimigos', mostrando que o cuidado de Deus não elimina a dificuldade, mas a atravessa ao lado do crente.",
      "É um dos textos mais lidos da Bíblia justamente por unir, em poucos versos, confiança, provisão e esperança futura ('habitarei na casa do Senhor por longos dias').",
    ],
    autor: "Equipe Editorial",
    dataOrigem: "2024-05-01",
    palavrasChave: ["pastor", "confiança", "provisão", "salmo"],
    passagens: [{ livro: "salmos", capitulo: 23, versiculoInicio: 1, versiculoFim: 6, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "esperanca", peso: 2 }, { slug: "fe", peso: 2 }],
    personagens: [{ slug: "davi", papel: "autor" }],
  },
  {
    titulo: "Sofrimento e integridade: o caso de Jó",
    resumo:
      "Jó perde tudo em um único dia, mas sua resposta inicial revela uma fé que não depende das circunstâncias.",
    conteudo: [
      "Em rápida sucessão, Jó recebe notícias da perda de seus bens e de seus dez filhos. Sua resposta é ao mesmo tempo dolorosa e surpreendente: 'o Senhor deu, o Senhor tirou; bendito seja o nome do Senhor' (1:21).",
      "O livro de Jó não oferece uma explicação simples para o sofrimento; ele resiste às respostas fáceis dos amigos de Jó ao longo dos capítulos seguintes.",
      "O que o texto oferece, já em seu início, é o retrato de uma integridade que não condiciona a adoração a Deus aos resultados visíveis da vida.",
    ],
    autor: "Pr. José Ricardo Alves",
    dataOrigem: "2024-05-12",
    palavrasChave: ["sofrimento", "integridade", "perda", "lamento"],
    passagens: [{ livro: "jo", capitulo: 1, versiculoInicio: 13, versiculoFim: 22, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "sofrimento-e-confianca", peso: 3 }],
    personagens: [{ slug: "jo", papel: "protagonista" }],
  },
  {
    titulo: "Confiança e sabedoria em Provérbios 3",
    resumo:
      "Provérbios 3 ensina a confiar no Senhor de todo o coração, em vez de se apoiar apenas no próprio entendimento.",
    conteudo: [
      "O texto exorta: 'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento' (3:5), estabelecendo um princípio central da sabedoria bíblica.",
      "Confiança e obediência aparecem lado a lado: reconhecer a Deus 'em todos os teus caminhos' é o que endireita as veredas.",
      "O capítulo também liga sabedoria a atitudes práticas — honrar a Deus com os bens, não desprezar a disciplina e buscar a paz com o próximo.",
    ],
    autor: "Profa. Marta Nascimento",
    dataOrigem: "2024-05-20",
    palavrasChave: ["sabedoria", "confiança", "entendimento", "caminhos"],
    passagens: [{ livro: "proverbios", capitulo: 3, versiculoInicio: 1, versiculoFim: 12, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "fe", peso: 2 }, { slug: "obediencia", peso: 2 }],
  },
  {
    titulo: "O Servo Sofredor em Isaías 53",
    resumo:
      "Isaías 53 antecipa a figura de um servo que sofre pelos pecados de outros, um dos textos messiânicos mais centrais do Antigo Testamento.",
    conteudo: [
      "O profeta descreve alguém 'desprezado e rejeitado', 'traspassado pelas nossas transgressões' — uma figura de sofrimento vicário que carrega o peso alheio.",
      "A leitura cristã histórica identifica esse Servo com Jesus, cujo sofrimento é interpretado à luz destas palavras escritas séculos antes.",
      "Independentemente da época de leitura, o capítulo oferece uma das imagens mais profundas de esperança: 'pelas suas pisaduras fomos sarados' (v. 5).",
    ],
    autor: "Equipe Editorial",
    dataOrigem: "2024-06-02",
    palavrasChave: ["servo sofredor", "profecia", "messias", "sofrimento vicário"],
    passagens: [{ livro: "isaias", capitulo: 53, versiculoInicio: 1, versiculoFim: 12, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "esperanca", peso: 3 }],
    personagens: [
      { slug: "isaias", papel: "autor" },
      { slug: "jesus", papel: "mencionado" },
    ],
  },
  {
    titulo: "A parábola do semeador",
    resumo:
      "Em Mateus 13, Jesus ensina sobre os diferentes tipos de solo como imagem para os modos de receber a Palavra.",
    conteudo: [
      "A parábola do semeador descreve quatro tipos de terreno — a beira do caminho, o pedregal, os espinhos e a boa terra — como figuras para diferentes respostas à Palavra de Deus.",
      "Jesus explica a parábola aos discípulos em particular, revelando que o fruto depende não apenas da semente, mas da condição do coração que a recebe.",
      "O texto convida à autoavaliação: que tipo de solo tem sido o coração do leitor diante do que ouve e lê da Palavra?",
    ],
    autor: "Pr. José Ricardo Alves",
    dataOrigem: "2024-06-14",
    palavrasChave: ["parábola", "semeador", "solo", "palavra"],
    passagens: [{ livro: "mateus", capitulo: 13, versiculoInicio: 1, versiculoFim: 23, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "fe", peso: 2 }],
    personagens: [{ slug: "jesus", papel: "protagonista" }],
    serie: { slug: "parabolas-de-jesus", ordem: 1 },
  },
  {
    titulo: "A parábola do filho pródigo",
    resumo:
      "Lucas 15 narra a história do filho que retorna e do pai que corre ao seu encontro — um retrato da graça que perdoa.",
    conteudo: [
      "O filho mais novo pede sua herança, parte para uma terra distante e desperdiça tudo o que tinha — até se ver reduzido a alimentar porcos.",
      "Ao voltar 'em si', ele decide retornar, ensaiando um pedido de perdão. O pai, porém, o vê 'ainda longe' e corre ao seu encontro antes de qualquer palavra.",
      "A parábola termina com a resistência do irmão mais velho, ampliando o convite: a graça do pai se estende tanto ao que se perdeu longe quanto ao que resiste perto.",
    ],
    autor: "Profa. Marta Nascimento",
    dataOrigem: "2024-06-28",
    palavrasChave: ["filho pródigo", "graça", "arrependimento", "pai"],
    passagens: [{ livro: "lucas", capitulo: 15, versiculoInicio: 11, versiculoFim: 32, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "graca", peso: 3 }, { slug: "perdao", peso: 2 }],
    personagens: [{ slug: "jesus", papel: "narrador" }],
    serie: { slug: "parabolas-de-jesus", ordem: 2 },
  },
  {
    titulo: "O bom samaritano e o mandamento do amor",
    resumo:
      "Diante da pergunta 'quem é o meu próximo?', Jesus responde com a parábola do bom samaritano em Lucas 10.",
    conteudo: [
      "Um homem é espancado e deixado à beira do caminho; um sacerdote e um levita passam sem ajudar, mas um samaritano — figura desprezada pelos ouvintes judeus — para e cuida dele.",
      "Jesus inverte a pergunta original do intérprete da lei: em vez de definir quem é o próximo, ele pergunta quem agiu como próximo.",
      "A parábola redefine o amor ao próximo como uma prática que atravessa fronteiras étnicas e religiosas, fundada na compaixão concreta, não na proximidade social.",
    ],
    autor: "Equipe Editorial",
    dataOrigem: "2024-07-10",
    palavrasChave: ["bom samaritano", "próximo", "compaixão", "lei"],
    passagens: [{ livro: "lucas", capitulo: 10, versiculoInicio: 25, versiculoFim: 37, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "amor", peso: 3 }],
    personagens: [{ slug: "jesus", papel: "narrador" }],
    serie: { slug: "parabolas-de-jesus", ordem: 3 },
  },
  {
    titulo: "Nicodemos e o novo nascimento",
    resumo:
      "No diálogo noturno com Nicodemos, Jesus fala sobre nascer de novo e do amor de Deus revelado em João 3:16.",
    conteudo: [
      "Nicodemos, um mestre respeitado em Israel, procura Jesus à noite com perguntas sinceras sobre o Reino de Deus.",
      "Jesus responde com a necessidade de um novo nascimento, 'da água e do Espírito', deslocando a discussão do mérito religioso para uma obra de Deus.",
      "O diálogo culmina no versículo mais citado do Novo Testamento: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito...' (3:16), que resume o evangelho em uma frase.",
    ],
    autor: "Pr. José Ricardo Alves",
    dataOrigem: "2024-07-22",
    palavrasChave: ["novo nascimento", "Nicodemos", "João 3:16", "Espírito"],
    passagens: [{ livro: "joao", capitulo: 3, versiculoInicio: 1, versiculoFim: 21, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "fe", peso: 2 }, { slug: "graca", peso: 3 }],
    personagens: [{ slug: "jesus", papel: "protagonista" }],
  },
  {
    titulo: "Pedro restaurado à beira-mar",
    resumo:
      "Após negar Jesus três vezes, Pedro é restaurado à beira do mar da Galileia em João 21, com um chamado renovado a cuidar do rebanho.",
    conteudo: [
      "Depois da ressurreição, Jesus prepara um café da manhã na praia para os discípulos que voltaram a pescar, sem sucesso, durante a noite.",
      "Três vezes Jesus pergunta a Pedro se ele o ama, espelhando as três negações — não para humilhar, mas para restaurar publicamente o que havia sido quebrado.",
      "A cada resposta de Pedro, Jesus responde com uma missão: 'apascenta os meus cordeiros', 'pastoreia as minhas ovelhas' — transformando o fracasso em vocação renovada.",
    ],
    autor: "Profa. Marta Nascimento",
    dataOrigem: "2024-08-03",
    palavrasChave: ["restauração", "negação", "pastoreio", "mar da Galileia"],
    passagens: [{ livro: "joao", capitulo: 21, versiculoInicio: 15, versiculoFim: 19, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "perdao", peso: 2 }, { slug: "lideranca", peso: 2 }],
    personagens: [
      { slug: "pedro", papel: "protagonista" },
      { slug: "jesus", papel: "mencionado" },
    ],
  },
  {
    titulo: "Nenhuma condenação: Romanos 8",
    resumo:
      "Romanos 8 declara que não há condenação para os que estão em Cristo Jesus, e que nada pode separar o crente do amor de Deus.",
    conteudo: [
      "Paulo abre o capítulo com uma das afirmações mais libertadoras do Novo Testamento: 'não há, pois, agora, nenhuma condenação para os que estão em Cristo Jesus' (8:1).",
      "O capítulo descreve a obra do Espírito que habita no crente, intercede nos momentos de fraqueza e garante a adoção como filhos de Deus.",
      "O texto culmina em uma lista retórica de possíveis separações — tribulação, angústia, perseguição — todas respondidas pela certeza de que nada 'nos poderá separar do amor de Deus' (8:38-39).",
    ],
    autor: "Equipe Editorial",
    dataOrigem: "2024-08-15",
    palavrasChave: ["condenação", "Espírito Santo", "adoção", "amor de Deus"],
    passagens: [{ livro: "romanos", capitulo: 8, versiculoInicio: 28, versiculoFim: 39, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "esperanca", peso: 3 }, { slug: "graca", peso: 2 }],
    personagens: [{ slug: "paulo", papel: "autor" }],
  },
  {
    titulo: "A armadura de Deus",
    resumo:
      "Em Efésios 6, Paulo descreve a armadura espiritual necessária para resistir nos dias maus.",
    conteudo: [
      "Paulo encerra a carta aos Efésios convocando os crentes a se revestirem da armadura de Deus para resistir 'às astutas ciladas do diabo' (6:11).",
      "Cada peça da armadura — verdade, justiça, evangelho da paz, fé, salvação e a palavra de Deus — corresponde a uma virtude cultivada, não a um objeto mágico.",
      "A oração constante, mencionada por último, é o que sustenta o uso de toda a armadura: a luta espiritual é vivida em dependência, não em autossuficiência.",
    ],
    autor: "Pr. José Ricardo Alves",
    dataOrigem: "2024-08-29",
    palavrasChave: ["armadura", "luta espiritual", "oração", "resistir"],
    passagens: [{ livro: "efesios", capitulo: 6, versiculoInicio: 10, versiculoFim: 18, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "fe", peso: 2 }, { slug: "obediencia", peso: 2 }],
    personagens: [{ slug: "paulo", papel: "autor" }],
    serie: { slug: "cartas-de-paulo", ordem: 1 },
  },
  {
    titulo: "Fé que se prova nas provações",
    resumo:
      "Tiago 1 ensina que as provações produzem perseverança quando a fé é colocada à prova.",
    conteudo: [
      "Tiago instrui seus leitores a considerar 'tudo alegria' quando passam por diversas provações, pois a prova da fé produz perseverança (1:2-3).",
      "A perseverança, por sua vez, deve ter obra completa, para que os crentes cheguem a ser perfeitos e íntegros, sem nada faltar.",
      "O capítulo também conecta sabedoria e provação: quem enfrenta dificuldades e precisa de sabedoria deve pedi-la a Deus, que dá 'liberalmente e sem repreender'.",
    ],
    autor: "Profa. Marta Nascimento",
    dataOrigem: "2024-09-09",
    palavrasChave: ["provações", "perseverança", "sabedoria", "prova da fé"],
    passagens: [{ livro: "tiago", capitulo: 1, versiculoInicio: 2, versiculoFim: 12, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "sofrimento-e-confianca", peso: 3 }, { slug: "fe", peso: 2 }],
    personagens: [{ slug: "tiago", papel: "autor" }],
  },
  {
    titulo: "Um novo céu e uma nova terra",
    resumo:
      "Apocalipse 21 descreve a promessa final de restauração: um novo céu, uma nova terra e Deus habitando com o seu povo.",
    conteudo: [
      "A visão de João em Apocalipse 21 descreve a passagem do primeiro céu e da primeira terra para uma nova criação, onde 'não haverá mais morte, nem pranto, nem clamor, nem dor'.",
      "O centro da promessa não é apenas a ausência de sofrimento, mas a presença: 'eis que o tabernáculo de Deus está com os homens' (21:3).",
      "Este texto encerra a narrativa bíblica retomando temas do Éden — comunhão plena entre Deus e seu povo — agora numa cidade santa que desce do céu.",
    ],
    autor: "Equipe Editorial",
    dataOrigem: "2024-09-21",
    palavrasChave: ["nova criação", "restauração", "esperança escatológica", "cidade santa"],
    passagens: [{ livro: "apocalipse", capitulo: 21, versiculoInicio: 1, versiculoFim: 8, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "segunda-vinda", peso: 3 }, { slug: "esperanca", peso: 2 }],
    personagens: [{ slug: "joao", papel: "autor" }],
  },
  {
    titulo: "A mulher virtuosa: rascunho em revisão",
    resumo:
      "Rascunho ainda em revisão editorial sobre Provérbios 31 — não publicado; não deve aparecer na busca pública.",
    conteudo: [
      "Este é um estudo em fase de rascunho (status DRAFT), usado para validar que estudos não publicados não aparecem na navegação nem na busca pública, conforme docs/DATA_MODEL.md e docs/INGESTION_SPEC.md (revisão humana obrigatória antes da publicação).",
      "Conteúdo final pendente de revisão editorial.",
    ],
    status: "DRAFT",
    autor: "Equipe Editorial",
    dataOrigem: "2024-10-01",
    palavrasChave: ["mulher virtuosa", "rascunho"],
    passagens: [{ livro: "proverbios", capitulo: 31, versiculoInicio: 10, versiculoFim: 31, tipoRelacao: "principal", prioridade: 1 }],
    temas: [{ slug: "familia" }],
  },
];

function buildStudy(seed: StudySeed, index: number): Study {
  const id = `study-${index + 1}`;
  const slug = slugify(seed.titulo);
  const createdAt = `${seed.dataOrigem}T09:00:00.000Z`;

  const passagens = seed.passagens.map((p, pIndex) => {
    const book = getBookBySlug(p.livro);
    if (!book) {
      throw new Error(`Estudo "${seed.titulo}": livro desconhecido "${p.livro}"`);
    }
    return {
      book,
      passage: {
        id: `${id}-passage-${pIndex + 1}`,
        bookId: book.id,
        capitulo: p.capitulo,
        versiculoInicio: p.versiculoInicio,
        versiculoFim: p.versiculoFim,
        referenciaNormalizada: formatReference(book, p.capitulo, p.versiculoInicio, p.versiculoFim),
      },
      tipoRelacao: p.tipoRelacao ?? "principal",
      prioridade: p.prioridade ?? pIndex + 1,
    };
  });

  const temas = seed.temas.map(({ slug: topicSlug, peso }) => {
    const topic = getTopicBySlug(topicSlug);
    if (!topic) {
      throw new Error(`Estudo "${seed.titulo}": tema desconhecido "${topicSlug}"`);
    }
    return { topic, peso: peso ?? 1 };
  });

  const personagens = (seed.personagens ?? []).map(({ slug: characterSlug, papel }) => {
    const character = getCharacterBySlug(characterSlug);
    if (!character) {
      throw new Error(`Estudo "${seed.titulo}": personagem desconhecido "${characterSlug}"`);
    }
    return { character, papel: papel ?? "mencionado" };
  });

  const series = seed.serie
    ? (() => {
        const seriesEntity = getSeriesBySlug(seed.serie!.slug);
        if (!seriesEntity) {
          throw new Error(`Estudo "${seed.titulo}": série desconhecida "${seed.serie!.slug}"`);
        }
        return [{ series: seriesEntity, ordem: seed.serie!.ordem }];
      })()
    : [];

  return {
    id,
    titulo: seed.titulo,
    slug,
    resumo: seed.resumo,
    conteudo: seed.conteudo.join("\n\n"),
    status: seed.status ?? "PUBLISHED",
    visibilidade: "publico",
    autor: seed.autor,
    dataOrigem: seed.dataOrigem,
    createdAt,
    updatedAt: createdAt,
    palavrasChave: seed.palavrasChave,
    passagens,
    temas,
    personagens,
    series,
  };
}

export const allStudies: Study[] = STUDY_SEEDS.map(buildStudy);

/** Estudos publicados e visíveis publicamente (o que o site deve exibir e buscar). */
export const publishedStudies: Study[] = allStudies.filter(
  (study) => study.status === "PUBLISHED" && study.visibilidade === "publico",
);
