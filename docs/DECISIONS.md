DECISIONS — Architecture Decision Log

DEC-001 — Google Drive como fonte editorial, não como mecanismo de busca  
Decisão: manter o Drive como acervo/origem e criar índice próprio no banco.  
Motivo: desempenho, estabilidade, controle de metadados e preparação para busca semântica.

DEC-002 — Banco relacional antes de IA  
Decisão: estruturar estudos, passagens, temas, personagens e séries no PostgreSQL antes de implementar RAG.  
Motivo: reduzir dependência de respostas probabilísticas e evitar perda de estrutura bíblica.

DEC-003 — Busca híbrida como arquitetura alvo  
Decisão: combinar busca lexical, parser bíblico e busca semântica.  
Motivo: referências bíblicas exigem precisão determinística; perguntas conceituais se beneficiam de semântica.

DEC-004 — Revisão humana obrigatória  
Decisão: metadados sugeridos automaticamente entram em revisão antes da publicação.  
Motivo: preservar coerência teológica, editorial e qualidade do acervo.

DEC-005 — IA subordinada às fontes  
Decisão: respostas futuras do assistente devem ser ancoradas em documentos recuperados e mostrar fontes.  
Motivo: rastreabilidade e redução de alucinações.

DEC-006 — MVP pequeno antes da ingestão total  
Decisão: validar o produto com dados mockados e depois com um piloto de aproximadamente 20 a 50 estudos.  
Motivo: encontrar falhas de arquitetura antes de importar todo o acervo.

DEC-007 — Separação de responsabilidades  
Drive: acervo e documentação editorial.  
GitHub: código e histórico técnico.  
PC/Claude Code: ambiente de desenvolvimento.  
Banco: catálogo e índice operacional do site.

DEC-008 — Camada de repositório para preparar o Supabase  
Decisão: acessar todos os dados (estudos, livros, temas, personagens, séries) através de interfaces de repositório (`src/lib/repositories/`), implementadas hoje com dados mockados em memória.  
Motivo: permitir que a Fase 2 (Supabase/PostgreSQL) troque apenas a implementação, sem alterar UI, busca ou rotas.

DEC-009 — Vitest como framework de testes  
Decisão: usar Vitest + Testing Library (React) para testes unitários e de componente, em vez de Jest.  
Motivo: integração nativa com Vite/ESM e com o TypeScript do projeto, menor configuração, desempenho superior no ambiente Next.js 16 atual.

DEC-010 — Busca 100% local/em memória no Marco 1  
Decisão: implementar a Fase A (lexical) e a Fase B (parser de referências) da busca operando sobre o array de estudos mockados em memória, sem API/rota dedicada nesta fase.  
Motivo: validar a lógica de busca e ranking antes de introduzir banco de dados ou infraestrutura de índice; mantém a aplicação independente de IA (regra de arquitetura do CLAUDE_START).

DEC-011 — Dados mockados versionados como código TypeScript  
Decisão: manter os dados fictícios do MVP como módulos TypeScript tipados em `src/lib/data/`, não como arquivos JSON soltos.  
Motivo: validação de tipos em tempo de compilação (integridade referencial entre estudo↔livro↔tema↔personagem↔série) e facilidade de importação/testes, sem necessidade de parsing.

REGRA  
Novas decisões arquiteturais relevantes devem ser registradas aqui antes ou junto da implementação.  
