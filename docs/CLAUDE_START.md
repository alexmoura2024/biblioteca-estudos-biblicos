CLAUDE\_START — Biblioteca Virtual de Estudos Bíblicos

MISSÃO  
Construir o primeiro MVP do site da Biblioteca Virtual de Estudos Bíblicos, preservando a arquitetura, o modelo de dados e as decisões já documentadas.

ANTES DE ESCREVER CÓDIGO  
Leia integralmente, nesta ordem:  
1\. docs/WORK\_STATUS.md  
2\. docs/ARCHITECTURE.md  
3\. docs/DATA\_MODEL.md  
4\. docs/SEARCH\_SPEC.md  
5\. docs/INGESTION\_SPEC.md  
6\. docs/DECISIONS.md  
7\. docs/ROADMAP.md

Depois inspecione o estado real do repositório. Não repita tarefas já concluídas.

PRIMEIRO MARCO  
Implemente uma aplicação web profissional e responsiva com Next.js, TypeScript e Tailwind CSS, usando dados mockados nesta fase.

O MVP deve conter:  
\- Home com campo principal de pesquisa.  
\- Busca por título, livro, referência, tema, personagem, resumo e palavras-chave.  
\- Navegação por Bíblia, temas, personagens e séries.  
\- Página individual de estudo.  
\- Entre 12 e 20 estudos fictícios distribuídos por diferentes livros bíblicos.  
\- Estrutura preparada para futura conexão com Supabase/PostgreSQL.  
\- Testes mínimos das rotas e busca.  
\- Build sem erros.

ROTAS ESPERADAS  
/  
/busca  
/biblia  
/biblia/\[livro\]  
/biblia/\[livro\]/\[capitulo\]  
/temas  
/temas/\[slug\]  
/personagens  
/personagens/\[slug\]  
/series  
/series/\[slug\]  
/estudo/\[slug\]  
/admin

NÃO IMPLEMENTAR AINDA  
\- RAG.  
\- Chatbot.  
\- Embeddings.  
\- pgvector operacional.  
\- Ingestão automática do Google Drive.  
\- Publicação automática.  
\- Pagamentos ou cadastro público.

REGRAS DE ARQUITETURA  
\- O Google Drive é fonte editorial, não mecanismo de busca em tempo real.  
\- A futura busca deverá permitir lexical \+ parser bíblico \+ semântica.  
\- A aplicação não deve depender de IA para funcionar.  
\- Um estudo poderá possuir múltiplas referências, temas, personagens e séries.  
\- A futura IA deverá responder somente com base em trechos recuperados do acervo e mostrar fontes.  
\- Qualquer mudança arquitetural relevante deve ser registrada em docs/DECISIONS.md.  
\- Não armazenar segredos no repositório.  
\- Criar .env.example quando necessário.

CONTINUIDADE E ECONOMIA DE CRÉDITOS  
Trabalhe incrementalmente. Após cada marco relevante atualize docs/WORK\_STATUS.md com:  
\- etapa atual;  
\- tarefas concluídas;  
\- pendências;  
\- arquivos alterados;  
\- erros encontrados;  
\- decisões tomadas;  
\- testes executados;  
\- próximo passo exato.

Se a sessão for interrompida por limite de créditos, contexto ou qualquer outro motivo, a próxima sessão deve começar lendo os arquivos de documentação e continuar da primeira tarefa pendente. Não reconstruir o projeto do zero.

CONTROLE DE QUALIDADE  
Após cada bloco de implementação:  
1\. execute lint;  
2\. execute testes;  
3\. execute build;  
4\. corrija falhas antes de avançar;  
5\. atualize WORK\_STATUS.md;  
6\. faça commit Git pequeno e descritivo.

Crie também um CLAUDE.md na raiz do repositório resumindo estas regras permanentes para futuras sessões.

Comece agora lendo a documentação, faça uma auditoria curta do estado inicial e execute o primeiro marco. Não conecte ainda o acervo bíblico real.