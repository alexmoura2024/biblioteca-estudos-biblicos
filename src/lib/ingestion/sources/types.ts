/** Um arquivo obtido da origem (Drive), antes de qualquer extração de texto. */
export interface SourceFile {
  buffer: Buffer;
  mimeType: string;
  nomeOriginal: string;
  modifiedTime?: string;
  tamanhoBytes?: number;
}

/**
 * Fronteira entre a pipeline de ingestão e "onde o arquivo realmente
 * mora" (Fase 3, Etapa 4 item 2 "obter fonte por adaptador de origem").
 * `pipeline.ts` só conhece esta interface — nunca faz uma chamada HTTP/
 * Drive diretamente, o que permite testar toda a orquestração com
 * `sources/inMemoryAdapter.ts` sem depender de rede ou credenciais.
 */
export interface SourceAdapter {
  fetchFile(driveFileId: string): Promise<SourceFile>;
}
