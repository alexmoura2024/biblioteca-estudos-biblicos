/**
 * Fase 3.1 (checkpoint 15) — DECISÃO EDITORIAL HUMANA: SEL-017
 * ("Aniquilará a morte para sempre - Is25.8-9.doc") contém, de fato,
 * duas mensagens independentes concatenadas no mesmo arquivo:
 *
 *   1. "A Promessa e a Esperança em Jesus" — Isaías 25:8-9
 *   2. "O Homem Não Tem Dado Lugar em Sua Vida para Jesus" — Lucas 24:18
 *
 * Este script é um ONE-OFF (não parte da pipeline determinística,
 * nunca decide sozinho onde cortar um documento — CLAUDE.md §3, DEC-028)
 * que aplica a divisão exatamente como decidida por um humano, via
 * `src/lib/ingestion/manualSplit.ts` (DEC-042). O texto de cada parte
 * abaixo é uma cópia EXATA do conteúdo já extraído e salvo em
 * `studies.conteudo` (confirmado por leitura direta do banco antes de
 * escrever este script — nunca reconstruído de memória), só cortado no
 * ponto onde a segunda mensagem começa ("Tema: O homem não tem dado
 * lugar..."). Idempotente: rodar de novo não recria os dois estudos
 * (ver `splitFileIntoStudies`/`manualSplit.test.ts`).
 *
 * Uso: npx tsx scripts/fase3-split-sel017.ts
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // pode já estar carregado
}

import { loadManifest } from "../src/lib/ingestion/manifest";
import { splitFileIntoStudies } from "../src/lib/ingestion/manualSplit";
import { suggestCharacterIds, suggestTopicIds } from "../src/lib/ingestion/pipeline";
import { suggestKeywords, suggestSummary } from "../src/lib/ingestion/metadataSuggestion";
import { SupabaseIngestionRepository } from "../src/lib/ingestion/supabaseIngestionRepository";
import { SupabaseCharacterRepository } from "../src/lib/repositories/supabase/characters";
import { SupabaseTopicRepository } from "../src/lib/repositories/supabase/topics";

const PILOT_ID = "SEL-017";

const CONTEUDO_MSG1 =
  `Tema: A promessa e a esperança em Jesus\n` +
  `Is 25:8-9\n` +
  `Aniquilará a morte para sempre, e assim enxugará o Senhor JEOVÁ as lágrimas de todos os rostos, e tirará o opróbrio do seu povo de toda a terra; porque o SENHOR o disse.\n` +
  `E, naquele dia, se dirá: Eis que este é o nosso Deus, a quem aguardávamos, e ele nos salvará; este é o SENHOR, a quem aguardávamos; na sua salvação, exultaremos e nos alegraremos.\n\n` +
  `O texto fala de uma promessa por parte de Deus para com o homem e a esperança do homem para com Deus.\n` +
  `Temos visto que mesmo com toda a tecnologia, mesmo com tudo que o homem tem conquistado existem coisas que o homem jamais irá conquistar sozinho. O homem com as suas próprias forças, com os seus conhecimentos jamais poderá vencer ou obter êxito sobre:\n\n` +
  `A morte;\n` +
  `A sede da alma;\n` +
  `O julgo do pecado;\n\n` +
  `Aniquilará a morte para sempre, e assim enxugará o Senhor JEOVÁ as lágrimas de todos os rostos, e tirará o opróbrio do seu povo de toda a terra; porque o SENHOR o disse.\n\n` +
  `Este versículo fala de uma promessa para dar ao homem a vitória sobre estas coisas. O Senhor Jesus quando deu a sua vida na cruz do calvário, quando derramou o seu sangue pelas as nossas vidas e ressuscitou ao terceiro dia conquistou cada uma destas coisas para o homem.\n` +
  `Ele venceu a morte e tem nos dado à condição de também vencê-la;\n` +
  `Ele tem derramado sobre nós o Espírito Santo para saciar a sede da nossa alma.\n` +
  `Ele tem nos ensinado que através do clamor pelo seu sangue nós somos purificados de todo o pecado.\n` +
  `Esta é a promessa que Deus tem feito a cada um de nós a cada dia neste lugar. Às vezes chegamos tristes, desesperados, mas nós ouvimos do Senhor: "Eu venci a morte" e nos alegramos por que sabemos que nós também a venceremos.\n` +
  `A igreja a cada dia tem vivido esta promessa, tem vivido debaixo de uma esperança e esta esperança é à volta de Jesus.\n\n` +
  `E, naquele dia, se dirá: Eis que este é o nosso Deus, a quem aguardávamos, e ele nos salvará; este é o SENHOR, a quem aguardávamos; na sua salvação, exultaremos e nos alegraremos.\n\n` +
  `As pessoas às vezes questionam da nossa convicção da volta de Jesus, às vezes se assustam com a certeza que temos que Ele voltará. Mas podemos dizer que esta certeza vem daquilo que Ele tem feito as nossas vidas.\n` +
  `Porque um dia Jesus aniquilou a morte que estava sobre nós, enxugou as nossas lagrimas e tirou o fardo pesado do pecado que estava sobre nós. É por isso que cada um de nós diz com toda certeza:\n` +
  `"Maranata ora vem Senhor Jesus".`;

const CONTEUDO_MSG2 =
  `Tema: O homem não tem dado lugar em sua vida para Jesus\n\n` +
  `Lucas 24:18 E, respondendo um, cujo nome era Cleopas, disse-lhe: És tu só peregrino em Jerusalém e não sabes as coisas que nela têm sucedido nestes dias?\n\n` +
  `O texto que lemos nos fala a respeito de uma experiência que dois discípulos de Jesus tiveram após a sua morte. Jesus já havia ido à cruz do Calvário para ali cumprir o projeto de Deus para com a vida do homem, ou seja, através do seu sacrifício todo homem que nele crê terá vida e vida em abundância.\n` +
  `Mas em especial nesta noite Deus nos chama a atenção para o comportamento destes dois discípulos, estes homens, conviveram com Jesus, ouviram de sua boca todas as promessas relativas a nossa salvação, viram os milagres operados por Ele, ouviram a respeito de sua morte e também de como Ele iria vence-la. Mas mesmo assim diante das provas e lutas, o medo de serem perseguidos. Eles resolvem deixar Jerusalém e voltar para a sua aldeia chamada Emaus.\n` +
  `Isto nos mostra que muitos tem vindo a este lugar, a Casa do Senhor, e aqui ouvido que Jesus tem curado neste lugar, tem ouvido que o senhor tem libertado os corações aflitos e o mais tem nos oferecido a vida eterna. Mas no momento em que saem por aquela porta e voltam para as suas velhas vidas se esquecem de toda a experiência que passaram aqui. Como aqueles dois discípulos, que se esqueceram de tudo o que o Senhor havia feito e resolveram voltar para as suas velhas vidas (voltar Emaus).\n` +
  `Mas naquele processo de volta, o Senhor tenta dar mas uma chance para aqueles homens. A palavra nos fala que Jesus vai`;

async function main() {
  const manifest = loadManifest();
  const manifestRow = manifest.find((r) => r.pilotId === PILOT_ID);
  if (!manifestRow) throw new Error(`${PILOT_ID} não encontrado no manifesto.`);

  const repository = new SupabaseIngestionRepository();
  const topics = await new SupabaseTopicRepository().listAll();
  const characters = await new SupabaseCharacterRepository().listAll();

  // `upsertFile` é idempotente por drive_file_id — reaproveita a linha
  // `files` já existente (criada pela ingestão normal), nunca cria uma
  // segunda. Devolve o estado ATUAL, incluindo `study_id`/status, que é
  // exatamente o que `splitFileIntoStudies` precisa para decidir se o
  // arquivo já foi dividido antes.
  const file = await repository.upsertFile({
    driveFileId: manifestRow.driveFileId,
    nomeOriginal: manifestRow.title,
    mimeType: manifestRow.mimeType,
    driveUrl: manifestRow.sourceUrl,
  });

  const resumo1 = suggestSummary(CONTEUDO_MSG1);
  const resumo2 = suggestSummary(CONTEUDO_MSG2);

  const result = await splitFileIntoStudies(repository, file, {
    autor: "Autor não identificado",
    dataOrigem: "1970-01-01",
    motivo:
      "SEL-017 contém duas mensagens independentes concatenadas no mesmo documento — 'A Promessa e a Esperança em Jesus' (Isaías 25:8-9) e 'O Homem Não Tem Dado Lugar em Sua Vida para Jesus' (Lucas 24:18). Decisão explícita do usuário, registrada em docs/DECISIONS.md DEC-042.",
    partes: [
      {
        titulo: "A Promessa e a Esperança em Jesus",
        conteudo: CONTEUDO_MSG1,
        resumo: resumo1,
        palavrasChave: suggestKeywords(CONTEUDO_MSG1),
        passagens: [{ bookSlug: "isaias", capitulo: 25, versiculoInicio: 8, versiculoFim: 9, referenciaNormalizada: "Isaías 25:8-9", tipoRelacao: "principal", prioridade: 1 }],
        topicIds: suggestTopicIds(CONTEUDO_MSG1, topics),
        characterIds: suggestCharacterIds(CONTEUDO_MSG1, characters),
      },
      {
        titulo: "O Homem Não Tem Dado Lugar em Sua Vida para Jesus",
        conteudo: CONTEUDO_MSG2,
        resumo: resumo2,
        palavrasChave: suggestKeywords(CONTEUDO_MSG2),
        passagens: [{ bookSlug: "lucas", capitulo: 24, versiculoInicio: 18, referenciaNormalizada: "Lucas 24:18", tipoRelacao: "principal", prioridade: 1 }],
        topicIds: suggestTopicIds(CONTEUDO_MSG2, topics),
        characterIds: suggestCharacterIds(CONTEUDO_MSG2, characters),
      },
    ],
  });

  console.log(`jaDividido: ${result.jaDividido}`);
  console.log(`study_ids: ${result.studyIds.join(", ")}`);
}

main().catch((error) => {
  console.error("Erro ao dividir SEL-017:", error);
  process.exit(1);
});
