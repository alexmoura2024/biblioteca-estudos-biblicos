INGESTION\_SPEC — Biblioteca Virtual de Estudos Bíblicos

1\. Objetivo  
Definir como documentos do Google Drive serão transformados em registros pesquisáveis sem publicar automaticamente conteúdo não revisado.

2\. Pipeline futuro  
Google Drive → detecção de arquivo novo ou alterado → leitura/extracao → normalização → identificação de título → detecção de referências bíblicas → sugestão de temas e personagens → resumo → chunking → embeddings → revisão humana → publicação → indexação.

3\. Fonte editorial  
O Drive permanece como repositório editorial. O banco mantém os dados normalizados e o índice de pesquisa.

4\. Extração  
Suportar progressivamente Google Docs, DOCX, PDF, PPTX e outros formatos relevantes do acervo. Preservar sempre o vínculo com o arquivo original.

5\. Identificação  
Registrar drive\_file\_id, nome, MIME type, hash, versão, data de modificação e estudo relacionado.

6\. Classificação automática  
A automação pode sugerir livro, capítulo, versículos, tema principal, temas secundários, personagens, série, resumo e palavras-chave. Sugestões não devem virar publicação automaticamente.

7\. Revisão humana  
Toda ingestão deve entrar inicialmente em DRAFT ou REVIEW. A publicação exige validação editorial.

8\. Duplicações  
Usar hash, similaridade textual, nome e metadados para sinalizar possíveis duplicatas. Não excluir automaticamente estudos parecidos.

9\. Reindexação  
Mudança de conteúdo ou metadados deve permitir reprocessamento idempotente, sem gerar duplicatas.

10\. Logs  
Cada ingestion\_job deve registrar etapa atual, status, falha, tentativa e mensagem de erro suficiente para retomada.

11\. Princípio de segurança  
Falha de IA, parser ou extração nunca deve alterar ou excluir o documento original do Drive.  
