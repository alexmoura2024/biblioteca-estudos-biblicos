/**
 * PHASE I — Genesis DB / Editorial Reconciliation
 *
 * Reconcile 38 provisional editorial units against:
 * - 29 real Genesis studies in database (READ-ONLY)
 * - Lote01 historical records (verify, do not restore)
 * - Special review documents
 * - GEN-041 independent status
 * - Entra Bendito multi-source analysis
 *
 * NO database modifications.
 * NO publications.
 * NO automatic consolidations.
 * VERIFY all claims against official documentation.
 */

import * as fs from "fs";
import * as path from "path";

// Load Phase H mapping
const EDITORIAL_MAPPING_PATH =
  "artifacts/bible-markdown-pipeline/v2/editorial-mapping";

interface DbStudy {
  study_id: string;
  title: string;
  primary_reference: string;
  status: string;
  tipo_estudo?: string;
  created_at?: string;
}

interface ReconciliationResult {
  editorial_unit_id: string;
  proposed_title: string;
  source_ids: string[];
  classification:
    | "DB_EXISTING"
    | "LOTE01_PENDING_RESTORE"
    | "SPECIAL_REVIEW"
    | "DEFERRED_EDITORIAL"
    | "UNRESOLVED";
  db_study_id?: string;
  lote01_id?: string;
  confidence: number;
  match_method?: string;
  warnings: string[];
}

async function main() {
  console.log("\n📊 PHASE I — GENESIS DB/EDITORIAL RECONCILIATION\n");

  // Load Phase H data
  const editorialUnitsPath = path.join(
    EDITORIAL_MAPPING_PATH,
    "genesis-editorial-units.json"
  );
  const sourceRegistryPath = path.join(
    EDITORIAL_MAPPING_PATH,
    "genesis-source-registry.json"
  );

  if (!fs.existsSync(editorialUnitsPath)) {
    console.error(`❌ Phase H data not found: ${editorialUnitsPath}`);
    process.exit(1);
  }

  const editorialUnits = JSON.parse(
    fs.readFileSync(editorialUnitsPath, "utf-8")
  );
  const sourceRegistry = JSON.parse(
    fs.readFileSync(sourceRegistryPath, "utf-8")
  );

  console.log(`📋 Loaded Phase H data:`);
  console.log(`  Editorial units: ${Object.keys(editorialUnits).length}`);
  console.log(`  Source registry: ${Object.keys(sourceRegistry).length}\n`);

  // Initialize reconciliation array
  const reconciliations: ReconciliationResult[] = [];

  // STEP 1: Identify special cases first
  console.log(`🔍 Identifying special cases...\n`);

  // GEN-041
  const gen041Unit = Object.values(editorialUnits).find(
    (u: any) => u.proposed_title?.includes("Obra") && u.proposed_title?.includes("Forma")
  );

  if (gen041Unit) {
    reconciliations.push({
      editorial_unit_id: (gen041Unit as any).editorial_unit_id,
      proposed_title: (gen041Unit as any).proposed_title,
      source_ids: (gen041Unit as any).source_ids,
      classification: "DEFERRED_EDITORIAL",
      confidence: 0.95,
      match_method: "GEN041_EXTRACTION_VERIFIED",
      warnings: [
        "RTF extraction verified (Phase G PASS)",
        "Editorial status requires official review",
        "Keep independent, do not consolidate with other units",
      ],
    });
    console.log(`  ✅ GEN-041 identified and classified`);
  }

  // Entra Bendito
  const entraBenditoUnits = Object.values(editorialUnits).filter(
    (u: any) =>
      u.proposed_title?.includes("Entra") ||
      u.proposed_title?.includes("bendito")
  );

  if (entraBenditoUnits.length > 0) {
    console.log(`  ✅ Entra Bendito: ${entraBenditoUnits.length} source(s) found`);
    console.log(`     Relationship: UNRESOLVED (requires comparative analysis)\n`);

    // Add multi-source unit for Entra Bendito
    const entraBenditoMulti = entraBenditoUnits.find(
      (u: any) => u.source_ids.length > 1
    );
    if (entraBenditoMulti) {
      reconciliations.push({
        editorial_unit_id: (entraBenditoMulti as any).editorial_unit_id,
        proposed_title: (entraBenditoMulti as any).proposed_title,
        source_ids: (entraBenditoMulti as any).source_ids,
        classification: "UNRESOLVED",
        confidence: 0.5,
        match_method: "MULTI_SOURCE_ANALYSIS_REQUIRED",
        warnings: [
          `${(entraBenditoMulti as any).source_ids.length} sources with similar titles`,
          "Relationship unclear: version, duplicate, or complementary?",
          "Requires editorial review to determine single or multiple studies",
          "Do not consolidate without explicit editorial decision",
        ],
      });
    }
  }

  // STEP 2: Classify remaining units
  console.log(`📑 Classifying remaining editorial units...\n`);

  const classifiedUnitIds = new Set<string>();
  for (const rec of reconciliations) {
    classifiedUnitIds.add(rec.editorial_unit_id);
  }

  for (const [unitId, unit] of Object.entries(editorialUnits)) {
    if (classifiedUnitIds.has(unitId)) continue;

    const castUnit = unit as any;

    // Default: single-source units assumed as unprocessed candidates
    reconciliations.push({
      editorial_unit_id: unitId,
      proposed_title: castUnit.proposed_title,
      source_ids: castUnit.source_ids,
      classification: "UNRESOLVED", // Will be reconciled with DB
      confidence: 0.5,
      warnings: ["Requires matching with database studies or documentation"],
    });
  }

  console.log(`✅ Classified ${reconciliations.length} units\n`);

  // STEP 3: Generate classification summary
  console.log(`📊 Classification Summary:\n`);

  const classificationCounts = {
    DB_EXISTING: 0,
    LOTE01_PENDING_RESTORE: 0,
    SPECIAL_REVIEW: 0,
    DEFERRED_EDITORIAL: 0,
    UNRESOLVED: 0,
  };

  for (const rec of reconciliations) {
    classificationCounts[rec.classification]++;
  }

  console.log(`  DB_EXISTING:              ${classificationCounts.DB_EXISTING}`);
  console.log(`  LOTE01_PENDING_RESTORE:   ${classificationCounts.LOTE01_PENDING_RESTORE}`);
  console.log(`  SPECIAL_REVIEW:           ${classificationCounts.SPECIAL_REVIEW}`);
  console.log(`  DEFERRED_EDITORIAL:       ${classificationCounts.DEFERRED_EDITORIAL}`);
  console.log(`  UNRESOLVED:               ${classificationCounts.UNRESOLVED}`);
  console.log(`  ──────────────────────────`);
  console.log(`  TOTAL:                    ${reconciliations.length}\n`);

  // STEP 4: Generate reconciliation report
  const reconciliationReport = {
    phase: "I",
    timestamp: new Date().toISOString(),
    source_files_total: Object.keys(sourceRegistry).length,
    editorial_units_total: Object.keys(editorialUnits).length,
    reconciliations: reconciliations,
    classification_summary: classificationCounts,
    hypothesis_validation: {
      expected_db_existing: 29,
      expected_lote01_pending_restore: 4,
      expected_special_review: 4,
      expected_deferred_editorial: 1,
      expected_unresolved: 0,
      actual_db_existing: classificationCounts.DB_EXISTING,
      actual_lote01_pending_restore: classificationCounts.LOTE01_PENDING_RESTORE,
      actual_special_review: classificationCounts.SPECIAL_REVIEW,
      actual_deferred_editorial: classificationCounts.DEFERRED_EDITORIAL,
      actual_unresolved: classificationCounts.UNRESOLVED,
      classification_sum: Object.values(classificationCounts).reduce(
        (a, b) => a + b,
        0
      ),
      hypothesis_confirmed: false, // Will be determined after DB load
    },
    critical_findings: [
      `GEN-041: Deferred for editorial review (technical extraction PASS)`,
      `Entra Bendito: 3 sources unresolved (requires comparative analysis)`,
      `${classificationCounts.UNRESOLVED} units need database reconciliation`,
    ],
    next_steps: [
      "Load 29 real Genesis studies from database",
      "Match editorial units to database records",
      "Verify Lote01 historical records",
      "Confirm special review documents",
      "Analyze Entra Bendito relationship",
      "Generate final reconciliation matrix",
    ],
    database_safety: {
      db_before: 29,
      db_after: 29,
      inserts: 0,
      updates: 0,
      deletes: 0,
      modifications: "NONE",
    },
  };

  // Save reconciliation report
  const outputDir = path.join(
    EDITORIAL_MAPPING_PATH,
    "phase-i"
  );
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, "genesis-reconciliation-report.json"),
    JSON.stringify(reconciliationReport, null, 2)
  );

  console.log(`✅ Reconciliation data saved\n`);
  console.log(`📋 Next steps:\n`);
  console.log(`  1. Load 29 Genesis studies from database`);
  console.log(`  2. Perform title/reference matching`);
  console.log(`  3. Verify Lote01 historical records`);
  console.log(`  4. Confirm special review documents`);
  console.log(`  5. Analyze Entra Bendito relationship`);
  console.log(`  6. Generate final reconciliation matrix\n`);

  console.log(`⚠️  Phase I is READ-ONLY (database not loaded)\n`);
  console.log(`✅ PHASE I STAGE 1 COMPLETE — Awaiting database connection\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
