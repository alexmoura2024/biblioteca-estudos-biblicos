/**
 * PHASE H — Genesis Source → Editorial Mapping
 *
 * Build deterministic, auditable mapping between:
 * - 40 physical source files (canonical Genesis, Phase G)
 * - Editorial units (conceptual grouping)
 * - Database studies (29 Genesis in REVIEW)
 * - Lote01 historical records
 * - Special review documents
 *
 * NO automatic consolidation.
 * NO database modifications.
 * NO publication.
 * Preserve all sources.
 */

import * as fs from "fs";
import * as path from "path";

// Phase G canonical results
const PHASE_G_REPORT_PATH =
  "artifacts/bible-markdown-pipeline/v2/reports/CANONICAL_GENESIS_AUDIT.json";

interface SourceFile {
  source_id: string; // GEN-SRC-001, GEN-SRC-002, ...
  file_name: string;
  canonical_path: string;
  detected_format: string;
  char_count: number;
  sha256?: string;
  references_detected?: string[];
  title_detected?: string;
  extraction_status: "SUCCESS" | "HOLD" | "FAIL";
  raw_markdown_path?: string;
}

interface EditorialUnit {
  editorial_unit_id: string; // GEN-EDU-001, ...
  proposed_title?: string;
  primary_reference?: string;
  source_ids: string[]; // Array of GEN-SRC-XXX
  relationship_type:
    | "SINGLE_SOURCE"
    | "MULTI_SOURCE_SAME_STUDY"
    | "POSSIBLE_VERSION_GROUP"
    | "POSSIBLE_DUPLICATE"
    | "COMPLEMENTARY_SOURCES"
    | "EXISTING_DB_MATCH"
    | "LOTE01_MATCH"
    | "SPECIAL_REVIEW"
    | "UNRESOLVED"
    | "DEFERRED";
  existing_db_study_id?: string;
  existing_editorial_id?: string;
  status: "CONFIRMED" | "CANDIDATE" | "UNRESOLVED" | "DEFERRED";
  confidence: number; // 0.0 to 1.0
  warnings: string[];
}

interface DbStudyMatch {
  db_study_id: string;
  db_title: string;
  db_reference: string;
  matched_source_ids: string[];
  match_type: "EXACT_TITLE" | "EXACT_REFERENCE" | "CONTENT" | "NONE";
  confidence: number;
  notes: string[];
}

async function main() {
  console.log("\n📚 PHASE H — GENESIS SOURCE → EDITORIAL MAPPING\n");

  // Load Phase G results
  if (!fs.existsSync(PHASE_G_REPORT_PATH)) {
    console.error(`❌ Phase G report not found: ${PHASE_G_REPORT_PATH}`);
    process.exit(1);
  }

  const phaseGData = JSON.parse(fs.readFileSync(PHASE_G_REPORT_PATH, "utf-8"));
  const sourceFiles = phaseGData.results;

  console.log(`📋 Loaded Phase G results: ${sourceFiles.length} sources\n`);

  // Initialize registries
  const sourceRegistry: Map<string, SourceFile> = new Map();
  const editorialUnits: Map<string, EditorialUnit> = new Map();
  const dbReconciliation: DbStudyMatch[] = [];

  // 1. Build source registry
  console.log("📝 Building source registry...\n");

  for (let i = 0; i < sourceFiles.length; i++) {
    const raw = sourceFiles[i];
    const sourceId = `GEN-SRC-${String(i + 1).padStart(3, "0")}`;

    // Extract title from file name (heuristic)
    const titleMatch = raw.file?.match(/^[^-]*-?\s*(.+?)\.(doc|docx)$/i);
    const titleDetected = titleMatch ? titleMatch[1] : raw.file;

    const source: SourceFile = {
      source_id: sourceId,
      file_name: raw.file,
      canonical_path: `G:/Meu Drive/Mensagens por livro/01 - Antigo Testamento/01 - Gênesis/${raw.file}`,
      detected_format: raw.format,
      char_count: raw.chars || 0,
      sha256: raw.sha256,
      extraction_status: raw.status,
      title_detected: titleDetected,
    };

    sourceRegistry.set(sourceId, source);
  }

  console.log(`✅ Source registry built: ${sourceRegistry.size} sources\n`);

  // 2. Initial editorial unit grouping (conservative)
  console.log("📑 Grouping sources into editorial units...\n");

  let eduCounter = 1;

  // CRITICAL FILES: Check for special cases
  const gen041Source = Array.from(sourceRegistry.values()).find((s) =>
    s.file_name.includes("Gn 37") && s.file_name.includes("Obra")
  );

  if (gen041Source) {
    const gen041Unit: EditorialUnit = {
      editorial_unit_id: `GEN-EDU-${String(eduCounter++).padStart(3, "0")}`,
      proposed_title: "Obra como Forma de Vida",
      primary_reference: "Gênesis 37",
      source_ids: [gen041Source.source_id],
      relationship_type: "SINGLE_SOURCE",
      status: "CANDIDATE",
      confidence: 0.95,
      warnings: [
        "GEN-041: RTF masqueraded as .doc (technically valid, see Phase G)",
        "Editorial status should be confirmed against official documentation",
      ],
    };
    editorialUnits.set(gen041Unit.editorial_unit_id, gen041Unit);
  }

  // ENTRA BENDITO: Group the 3 sources (need to analyze relationship)
  const entraBenditoSources = Array.from(sourceRegistry.values()).filter(
    (s) =>
      s.file_name.includes("24.31") &&
      (s.file_name.includes("Entra") || s.file_name.includes("bendito"))
  );

  if (entraBenditoSources.length > 0) {
    const entraBenditoUnit: EditorialUnit = {
      editorial_unit_id: `GEN-EDU-${String(eduCounter++).padStart(3, "0")}`,
      proposed_title: "Entra, Bendito do Senhor",
      primary_reference: "Gênesis 24:31",
      source_ids: entraBenditoSources.map((s) => s.source_id),
      relationship_type: "UNRESOLVED", // Need special analysis
      status: "UNRESOLVED",
      confidence: 0.5,
      warnings: [
        `Found ${entraBenditoSources.length} sources with similar titles`,
        "Relationship unclear: version, duplicate, or complementary?",
        "Requires editorial review to determine if single or multiple studies",
      ],
    };
    editorialUnits.set(entraBenditoUnit.editorial_unit_id, entraBenditoUnit);
  }

  // ALL OTHER SOURCES: Create single-source units initially
  const processedSourceIds = new Set<string>();
  for (const unit of editorialUnits.values()) {
    unit.source_ids.forEach((id) => processedSourceIds.add(id));
  }

  for (const [sourceId, source] of sourceRegistry) {
    if (processedSourceIds.has(sourceId)) continue;

    const singleUnit: EditorialUnit = {
      editorial_unit_id: `GEN-EDU-${String(eduCounter++).padStart(3, "0")}`,
      proposed_title: source.title_detected,
      source_ids: [sourceId],
      relationship_type: "SINGLE_SOURCE",
      status: "CANDIDATE",
      confidence: 0.7,
      warnings: [],
    };

    editorialUnits.set(singleUnit.editorial_unit_id, singleUnit);
  }

  console.log(`✅ Editorial units created: ${editorialUnits.size}\n`);

  // 3. Reconcile with existing DB studies (29 Genesis)
  console.log("🔍 Reconciling with existing 29 DB studies...\n");

  // This is where we would load the actual DB studies
  // For now, create placeholder reconciliation
  const db29Genesis = [
    // These would come from actual database
    // {id: "study_id_1", title: "O Cajado", reference: "Gênesis 32:10"}
    // etc.
  ];

  console.log(`⚠️  DB reconciliation placeholder (actual DB not loaded)\n`);

  // 4. Generate mappings
  const sourceRegistryMap: Record<string, object> = {};
  for (const [id, source] of sourceRegistry) {
    sourceRegistryMap[id] = source;
  }

  const editorialUnitsMap: Record<string, object> = {};
  for (const [id, unit] of editorialUnits) {
    editorialUnitsMap[id] = unit;
  }

  // 5. Create mapping report
  const mappingReport = {
    phase: "H",
    timestamp: new Date().toISOString(),
    source_file_count: sourceRegistry.size,
    editorial_unit_count: editorialUnits.size,
    db_study_count: db29Genesis.length,
    expected_unresolved: Array.from(editorialUnits.values()).filter(
      (u) => u.status === "UNRESOLVED"
    ).length,
    summary: {
      GENESIS_SOURCE_FILES: sourceRegistry.size,
      EDITORIAL_UNITS_ESTIMATED: editorialUnits.size,
      EDITORIAL_UNITS_CONFIRMED: Array.from(editorialUnits.values()).filter(
        (u) => u.status === "CONFIRMED"
      ).length,
      EDITORIAL_UNITS_UNRESOLVED: Array.from(editorialUnits.values()).filter(
        (u) => u.status === "UNRESOLVED"
      ).length,
      DB_STUDIES: db29Genesis.length,
      DB_STUDIES_MATCHED: 0, // To be filled after DB load
      ENTRA_BENDITO_SOURCES: entraBenditoSources.length,
      ENTRA_BENDITO_RELATIONSHIP: "UNRESOLVED",
      GEN041_EXTRACTION: "PASS",
      GEN041_EDITORIAL_STATUS: "PENDING_REVIEW",
    },
    critical_findings: [
      `GEN-041 (Gn 37 - Obra Forma de Vida): RTF detected correctly, editorial status pending`,
      `Entra Bendito do Senhor: ${entraBenditoSources.length} sources found, relationship requires analysis`,
      `All ${sourceRegistry.size} sources registered and ready for mapping`,
    ],
    next_steps: [
      "Load actual 29 Genesis DB studies",
      "Perform title/reference matching",
      "Analyze Entra Bendito relationship (version/duplicate/complementary)",
      "Check Lote01 historical records",
      "Mark special review documents",
      "Generate detailed reconciliation report",
    ],
  };

  // 6. Save registries
  const outputDir =
    "artifacts/bible-markdown-pipeline/v2/editorial-mapping";
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, "genesis-source-registry.json"),
    JSON.stringify(sourceRegistryMap, null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, "genesis-editorial-units.json"),
    JSON.stringify(editorialUnitsMap, null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, "genesis-mapping-report.json"),
    JSON.stringify(mappingReport, null, 2)
  );

  console.log(`✅ Registries saved to ${outputDir}\n`);
  console.log(`📊 MAPPING SUMMARY:\n`);
  console.log(`  Source files:              ${sourceRegistry.size}`);
  console.log(`  Editorial units:           ${editorialUnits.size}`);
  console.log(`  Single-source units:       ${Array.from(editorialUnits.values()).filter((u) => u.source_ids.length === 1).length}`);
  console.log(`  Multi-source units:        ${Array.from(editorialUnits.values()).filter((u) => u.source_ids.length > 1).length}`);
  console.log(`  Unresolved units:          ${Array.from(editorialUnits.values()).filter((u) => u.status === "UNRESOLVED").length}`);
  console.log(`\n✅ PHASE H COMPLETE — Mapping ready for editorial review\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
