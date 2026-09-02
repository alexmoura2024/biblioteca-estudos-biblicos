DATA\_MODEL — Biblioteca Virtual de Estudos Bíblicos

1\. Objetivo  
Definir o modelo lógico do acervo e permitir múltiplas relações entre estudos, passagens, temas, personagens, séries e arquivos.

2\. Entidades principais  
studies: id, titulo, slug, resumo, conteudo, status, visibilidade, autor, data\_origem, arquivo\_principal\_id, created\_at, updated\_at.  
books: id, nome, abreviacao, testamento, ordem\_canonica.  
passages: id, book\_id, capitulo, versiculo\_inicio, versiculo\_fim, referencia\_normalizada.  
study\_passages: study\_id, passage\_id, tipo\_relacao, prioridade.  
topics: id, nome, slug, descricao.  
study\_topics: study\_id, topic\_id, peso.  
characters: id, nome, slug, descricao.  
study\_characters: study\_id, character\_id, papel.  
series: id, nome, slug, descricao.  
study\_series: study\_id, series\_id, ordem.  
files: id, study\_id, drive\_file\_id, nome, mime\_type, url\_origem, hash, versao.  
chunks: id, study\_id, ordem, texto, referencia\_contextual.  
embeddings: id, chunk\_id, modelo, vetor, versao.  
ingestion\_jobs: id, drive\_file\_id, status, etapa, erro, tentativa.

3\. Estados editoriais  
DRAFT: rascunho.  
REVIEW: aguardando revisão.  
PUBLISHED: publicado e pesquisável.  
ARCHIVED: preservado, porém fora da busca pública.

4\. Regras essenciais  
Um estudo pode ter várias passagens, temas, personagens e séries.  
Uma passagem pode estar associada a vários estudos.  
O arquivo do Drive não é a entidade principal; ele é uma fonte/origem de um estudo.  
Duplicações devem ser controladas por hash, metadados e revisão humana.

5\. Metadados mínimos de cada estudo  
Título; testamento; livro principal; referências; tema principal; temas secundários; personagens; série; resumo; palavras-chave; arquivo original; status editorial.

6\. Requisito futuro  
O modelo deve aceitar chunks e embeddings sem obrigar a aplicação pública a depender de IA.  
