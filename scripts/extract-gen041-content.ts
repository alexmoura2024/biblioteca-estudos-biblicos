/**
 * Extração de conteúdo RTF de GEN-041
 * Remove controles RTF, extrai texto limpo, persiste no banco
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const GENESIS_DIR = "G:\\Meu Drive\\Biblioteca Estudos Bíblicos\\00_BIBLIOTECA_VIRTUAL\\06_EDITORIAL\\04_BACKLOG_EDITORIAL\\01_GENESIS\\01_ARQUIVOS_DE_TEXTO";

function extractRTFText(buffer: Buffer): string {
  let text = buffer.toString("utf8");

  // Remove controles RTF comuns
  text = text.replace(/\\\*[a-z]+[\d]*\s*/gi, ""); // \*comando
  text = text.replace(/\\[a-z]+[\d]*\s*/gi, ""); // \comando
  text = text.replace(/[{}]/g, ""); // Chaves

  // Remove sequências de espaços
  text = text.replace(/\s+/g, " ");

  // Remove caracteres de controle
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // Limpa linhas vazias e normaliza
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 10); // Linhas com conteúdo significativo

  return lines.join("\n").trim();
}

async function main() {
  console.log("\n📝 EXTRAÇÃO E PERSISTÊNCIA: GEN-041 (RTF → BD)\n");

  const filepath = `${GENESIS_DIR}\\Gn 37 -  Obra Forma de Vida .doc`;
  const buffer = readFileSync(filepath);

  console.log(`1. Leitura de arquivo:`);
  console.log(`   Bytes: ${buffer.length}`);

  const extractedText = extractRTFText(buffer);
  console.log(`\n2. Extração RTF:`);
  console.log(`   Caracteres (limpo): ${extractedText.length}`);
  console.log(`   Linhas: ${extractedText.split("\n").length}`);
  console.log(`\n3. Prévia (primeiros 300 chars):`);
  console.log(`   ${extractedText.substring(0, 300)}...\n`);

  const supabase = createClient(
    "http://127.0.0.1:54321",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
  );

  // Buscar estudo GEN-041
  const { data: study, error: fetchError } = await supabase
    .from("studies")
    .select("id, conteudo")
    .eq("slug", "obra-como-forma-de-vida-genesis-37")
    .single();

  if (fetchError) {
    console.error(`❌ Erro ao buscar estudo: ${fetchError.message}`);
    process.exit(1);
  }

  if (!study) {
    console.error(`❌ Estudo GEN-041 não encontrado`);
    process.exit(1);
  }

  console.log(`4. Estudo encontrado:`);
  console.log(`   ID: ${study.id}`);
  console.log(`   Conteúdo atual: ${study.conteudo?.substring(0, 50)}...`);

  // Atualizar com conteúdo extraído
  const { error: updateError } = await supabase
    .from("studies")
    .update({ conteudo: extractedText })
    .eq("id", study.id);

  if (updateError) {
    console.error(`❌ Erro ao atualizar estudo: ${updateError.message}`);
    process.exit(1);
  }

  console.log(`\n5. Atualização no banco:`);
  console.log(`   ✓ Conteúdo RTF persistido`);
  console.log(`   Tamanho: ${extractedText.length} caracteres\n`);

  // Verificação final
  const { data: updated } = await supabase
    .from("studies")
    .select("id, conteudo")
    .eq("id", study.id)
    .single();

  if (updated?.conteudo?.length === extractedText.length) {
    console.log(`✅ VERIFICAÇÃO OK`);
    console.log(`   GEN041_CONTENT_EMPTY = false`);
    console.log(`   GEN041_CONTENT_CHARS = ${extractedText.length}`);
    console.log(`\n✓ GEN-041 agora possui conteúdo integral extraído do RTF\n`);
  } else {
    console.error(`❌ Falha na verificação`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
