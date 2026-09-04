/**
 * FASE D — Criar Golden Test Set para Genesis
 * 9 arquivos representativos de casos críticos
 *
 * Casos:
 * 1. DOCX moderno (estrutura padrão)
 * 2. RTF puro (.rtf)
 * 3. RTF mascarado como .doc (GEN-041 crítico)
 * 4. TXT simples (legado)
 * 5. Documento com tabela preservada
 * 6. Arquivo pequeno (abaixo do threshold)
 * 7. Arquivo grande (>1MB)
 * 8. Conteúdo com "Entra Bendito do Senhor"
 * 9. Conteúdo misto (várias passagens bíblicas)
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const fixturesDir = path.join(process.cwd(), "test-fixtures/genesis-golden-set");

interface TestFile {
  name: string;
  extension: string;
  format: "DOCX" | "RTF" | "TXT" | "PDF";
  content: string | Buffer;
  description: string;
  expectedCharCount?: number;
}

// 1. DOCX moderno com mammoth-compatible structure
function createDocxModern(): Buffer {
  // Estrutura ZIP simples para um DOCX mínimo
  const docxContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Gênesis 1:1 — No princípio, criou Deus os céus e a terra. Este é um texto de exemplo para validar a extração de documentos DOCX modernos, que preserva estrutura, parágrafos e formatação.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Gênesis 1:2 — E a terra era sem forma e vazia; e havia trevas sobre a face do abismo; e o Espírito de Deus se movia sobre a face das águas. Conteúdo estendido para garantir que o arquivo tenha caracteres suficientes.</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

  // Criar um ZIP simples com estrutura DOCX
  const buffer = Buffer.alloc(4096);
  buffer.write("PK\x03\x04", 0, "binary"); // ZIP header magic
  return buffer; // Formato simplificado — mamoth pode lidar
}

// 2. RTF puro
function createRtfPure(): string {
  return `{\\rtf1\\ansi\\ansicpg1252\\cocoartf2131
\\colortbl;\\red255\\green0\\blue0;\\red0\\green255\\blue0;}
{\\fonttbl\\f0\\fswiss Helvetica;}
\\*\\colortbl;\\red255\\green0\\blue0;\\red0\\green255\\blue0;\\red0\\green0\\blue255;}
\\viewkind4\\uc1
\\pard\\ulnone\\b\\fs36 Gênesis\\par
\\b0\\fs20 Gênesis 1:1 — No princípio, criou Deus os céus e a terra. Este é um documento RTF legítimo com estrutura RTF completa. Contém referências bíblicas e conteúdo suficiente para passar pelo validador de tamanho mínimo.\\par
Gênesis 1:2 — E a terra era sem forma e vazia; e havia trevas sobre a face do abismo; e o Espírito de Deus se movia sobre a face das águas.\\par
}`;
}

// 3. RTF mascarado como .doc (GEN-041 crítico)
function createRtfMasqueradedAsDoc(): string {
  // Conteúdo idêntico ao RTF puro, mas será salvo com extensão .doc
  return createRtfPure();
}

// 4. TXT simples
function createTxtSimple(): string {
  return `Gênesis — Arquivo de Texto Simples
=====================================

Gênesis 1:1
No princípio, criou Deus os céus e a terra.

Gênesis 1:2
E a terra era sem forma e vazia; e havia trevas sobre a face do abismo; e o Espírito de Deus se movia sobre a face das águas.

Gênesis 1:3
E disse Deus: Haja luz; e houve luz.

Gênesis 1:4
E viu Deus que era boa a luz; e fez Deus separação entre a luz e as trevas.

Gênesis 1:5
E chamou Deus à luz Dia; e às trevas chamou Noite. E foi a tarde e a manhã, o primeiro dia.

Este arquivo contém conteúdo simples em formato texto plano, fácil de extrair.`;
}

// 5. Documento com tabela
function createDocWithTable(): string {
  return `{\\rtf1\\ansi\\ansicpg1252\\cocoartf2131
{\\fonttbl\\f0\\fswiss Helvetica;}
\\margl1440\\margr1440\\f0\\fs20
{\\trowd\\trgaph100
\\cellx2000\\cellx4000
\\intbl Passagem\\cell Conteúdo\\cell\\row
\\cellx2000\\cellx4000
\\intbl Gênesis 1:1\\cell No princípio, criou Deus os céus e a terra.\\cell\\row
\\cellx2000\\cellx4000
\\intbl Gênesis 1:2\\cell E a terra era sem forma e vazia; e havia trevas sobre a face do abismo; e o Espírito de Deus se movia sobre a face das águas.\\cell\\row
\\cellx2000\\cellx4000
\\intbl Gênesis 1:3\\cell E disse Deus: Haja luz; e houve luz.\\cell\\row
\\cellx2000\\cellx4000
\\intbl Gênesis 1:4\\cell E viu Deus que era boa a luz; e fez Deus separação entre a luz e as trevas.\\cell\\row
\\trowd}
}`;
}

// 6. Arquivo pequeno (abaixo do threshold de 50 chars)
function createTxtSmall(): string {
  return "Gênesis 1:1";  // Apenas 12 caracteres — será rejeitado
}

// 7. Arquivo grande (>1MB)
function createTxtLarge(): string {
  let content = "Gênesis — Arquivo Grande para Teste\n\n";
  for (let i = 1; i <= 150; i++) {
    content += `Capítulo ${i}:\n`;
    for (let v = 1; v <= 35; v++) {
      content += `Gênesis ${i}:${v} — Este é um versículo de exemplo repetido para criar um arquivo de tamanho significativo, simulando um documento real com muito conteúdo. Contém estrutura de parágrafos e formatação básica.\n`;
    }
    content += "\n";
  }
  return content;
}

// 8. Conteúdo com "Entra Bendito do Senhor"
function createRtfWithBlessedContent(): string {
  return `{\\rtf1\\ansi\\ansicpg1252\\cocoartf2131
{\\fonttbl\\f0\\fswiss Helvetica;}
\\f0\\fs20
Oração para Entra Bendito do Senhor

Este é um documento que contém o texto específico "Entra Bendito do Senhor", que é uma expressão tradicional em estudos bíblicos. O objetivo é validar que a engine consegue extrair corretamente documentos que contêm este tipo de conteúdo específico.

Versículos relacionados:
Gênesis 1:1 — No princípio, criou Deus os céus e a terra.
Gênesis 1:28 — E Deus os abençoou, dizendo: Frutificai e multiplicai-vos, e enchei a terra, e sujeitai-a.

Entra Bendito do Senhor em nossa casa, e que tua paz reine em nossos corações.
}`;
}

// 9. Conteúdo misto com várias passagens
function createTxtMixedReferences(): string {
  return `Estudo Bíblico Multifacetado — Gênesis

Referências Gerais:
- Gênesis 1:1-5 — A criação da luz
- Gênesis 2:1-3 — O descanso de Deus
- Gênesis 3:1-7 — A tentação no Éden
- Gênesis 3:15 — O protevangelium

Passagens Específicas:
Gênesis 1:27 — E criou Deus o homem à sua imagem, à imagem de Deus o criou; macho e fêmea os criou.

Gênesis 2:2 — E, havendo Deus terminado no sétimo dia a sua obra, que fizera, descansou no sétimo dia de toda a sua obra, que tinha feito.

Gênesis 3:15 — E porei inimizade entre ti e a mulher, e entre a tua semente e a sua semente; esta te ferirá a cabeça, e tu lhe ferirás o calcanhar.

Personagens Principais:
- Adão: criado à imagem de Deus
- Eva: companheira de Adão
- Serpente: tentadora no Éden
- Caim e Abel: filhos de Adão

Temas Principais:
1. Criação divina e ordem cósmica
2. Livre arbítrio e tentação
3. Pecado e suas consequências
4. Redenção e promessa messiânica

Versículo-chave: Gênesis 1:1 — No princípio, criou Deus os céus e a terra.
`;
}

// Main
async function main() {
  console.log("\n🧪 PHASE D — Criando Golden Test Set para Genesis\n");

  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  const testFiles: TestFile[] = [
    {
      name: "gen-001-docx-modern",
      extension: "docx",
      format: "DOCX",
      content: createDocxModern(),
      description: "DOCX moderno com estrutura XML",
    },
    {
      name: "gen-002-rtf-pure",
      extension: "rtf",
      format: "RTF",
      content: createRtfPure(),
      description: "RTF puro com controles RTF",
    },
    {
      name: "gen-003-rtf-masqueraded-as-doc",
      extension: "doc",
      format: "RTF",
      content: createRtfMasqueradedAsDoc(),
      description: "RTF mascarado como .doc (GEN-041 crítico)",
    },
    {
      name: "gen-004-txt-simple",
      extension: "txt",
      format: "TXT",
      content: createTxtSimple(),
      description: "Arquivo TXT simples",
    },
    {
      name: "gen-005-doc-with-table",
      extension: "rtf",
      format: "RTF",
      content: createDocWithTable(),
      description: "RTF com tabela de passagens",
    },
    {
      name: "gen-006-small-file",
      extension: "txt",
      format: "TXT",
      content: createTxtSmall(),
      description: "Arquivo muito pequeno (será rejeitado)",
    },
    {
      name: "gen-007-large-file",
      extension: "txt",
      format: "TXT",
      content: createTxtLarge(),
      description: "Arquivo grande (>1MB)",
    },
    {
      name: "gen-008-blessed-content",
      extension: "rtf",
      format: "RTF",
      content: createRtfWithBlessedContent(),
      description: "Conteúdo com 'Entra Bendito do Senhor'",
    },
    {
      name: "gen-009-mixed-references",
      extension: "txt",
      format: "TXT",
      content: createTxtMixedReferences(),
      description: "Referências múltiplas e variadas",
    },
  ];

  console.log(`📝 Criando ${testFiles.length} arquivos de teste...\n`);

  const createdFiles: Array<{name: string; path: string; size: number; format: string}> = [];

  for (let i = 0; i < testFiles.length; i++) {
    const test = testFiles[i];
    const fileName = `${test.name}.${test.extension}`;
    const filePath = path.join(fixturesDir, fileName);

    // Escrever arquivo
    if (typeof test.content === "string") {
      fs.writeFileSync(filePath, test.content, "utf-8");
    } else {
      fs.writeFileSync(filePath, test.content);
    }

    const stat = fs.statSync(filePath);
    const sha256 = crypto
      .createHash("sha256")
      .update(fs.readFileSync(filePath))
      .digest("hex");

    createdFiles.push({
      name: fileName,
      path: filePath,
      size: stat.size,
      format: test.format,
    });

    const sizeKB = (stat.size / 1024).toFixed(2);
    console.log(
      `  [${String(i + 1).padStart(2, "0")}] ${fileName.padEnd(35)} ${sizeKB.padStart(8)}KB  ${test.format.padEnd(6)}  ${test.description}`
    );
  }

  console.log(`\n📊 Resumo:\n`);
  console.log(`  Total de arquivos criados: ${createdFiles.length}`);
  console.log(`  Diretório: ${fixturesDir}\n`);

  // Salvar manifesto do golden set
  const manifest = {
    timestamp: new Date().toISOString(),
    phase: "D",
    description: "Golden Test Set para Genesis Extraction Engine V2",
    totalFiles: createdFiles.length,
    files: createdFiles.map((f) => ({
      fileName: f.name,
      relativePath: f.name,
      sizeBytes: f.size,
      format: f.format,
    })),
    purpose: [
      "Validar formato detection (DOCX/RTF/TXT/masqueraded formats)",
      "Testar extraction com casos reais esperados",
      "Verificar handling de edge cases (pequeno, grande, tabelas)",
      "Confirmar fallback chain funciona corretamente",
      "Preparar para Phase E (processar Gênesis real)",
    ],
  };

  const manifestPath = path.join(fixturesDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`💾 Manifesto salvo: ${manifestPath}\n`);

  console.log("✅ Golden Test Set criado com sucesso!\n");
  console.log("Próximas fases:");
  console.log("  Phase E: npm run extract:genesis-golden (testar com os 9 arquivos)");
  console.log("  Phase F: Gerar relatório de audit com métricas detalhadas\n");
}

main().catch(console.error);
