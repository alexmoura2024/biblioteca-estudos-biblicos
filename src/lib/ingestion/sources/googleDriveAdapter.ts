import type { SourceAdapter, SourceFile } from "@/lib/ingestion/sources/types";

/**
 * Adaptador de origem real (Google Drive) — NÃO IMPLEMENTADO nesta
 * sessão. Bloqueio registrado explicitamente (mesmo espírito de
 * DEC-024 para o Docker da Fase 2): esta sessão não tem credenciais do
 * Google Drive (conta de serviço ou token OAuth) para baixar/exportar
 * os 50 arquivos reais do lote piloto — só o manifesto de METADADOS
 * (docs/fase3-piloto/PILOTO_FASE3_MANIFEST.csv), não o conteúdo.
 *
 * O que falta exatamente para implementar (ver docs/WORK_STATUS.md,
 * Fase 3, "PENDÊNCIAS IMEDIATAS"):
 * 1. Uma conta de serviço do Google Cloud com a Drive API habilitada e
 *    permissão de LEITURA na pasta `00_PILOTO_FASE3` (ou nos 50
 *    `drive_file_id` específicos do manifesto) — nunca escrita.
 * 2. A credencial (JSON da conta de serviço) disponibilizada via uma
 *    variável de ambiente server-only (nunca commitada — mesmo padrão
 *    de SUPABASE_SERVICE_ROLE_KEY, DEC-020), ex. GOOGLE_DRIVE_
 *    SERVICE_ACCOUNT_JSON.
 * 3. A dependência `googleapis` (ou `google-auth-library` + chamadas
 *    REST diretas) instalada quando essa implementação for escrita.
 * 4. Para `application/vnd.google-apps.document` (Google Docs nativos):
 *    `drive.files.export({ fileId, mimeType: "text/plain" })`.
 *    Para os demais formatos (DOCX/DOC/PDF/PPTX): `drive.files.get({
 *    fileId, alt: "media" })` para baixar os bytes originais, que então
 *    passam por `src/lib/ingestion/extract/`.
 *
 * Até isso existir, use `sources/inMemoryAdapter.ts` para testes e para
 * rodar a pipeline manualmente com arquivos exportados/baixados à mão.
 */
export class GoogleDriveSourceAdapter implements SourceAdapter {
  async fetchFile(driveFileId: string): Promise<SourceFile> {
    throw new Error(
      `GoogleDriveSourceAdapter.fetchFile("${driveFileId}"): não implementado nesta sessão — ` +
        "requer credenciais do Google Drive ainda não fornecidas. Ver o comentário deste arquivo " +
        "e docs/WORK_STATUS.md (Fase 3) para a lista exata do que falta.",
    );
  }
}
