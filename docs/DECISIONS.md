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

DEC-012 — Marco 1 usa apenas tema claro  
Decisão: remover a alternância automática para tema escuro via `prefers-color-scheme` no CSS global; a UI usa classes Tailwind fixas (ex.: `text-stone-900`, `bg-white`) desenhadas apenas para tema claro.  
Motivo: o template gerado pelo `create-next-app` trocava as variáveis `--background`/--foreground` no modo escuro do sistema, mas os componentes não usam essas variáveis — o resultado era texto escuro sobre fundo escuro (contraste quebrado), encontrado por inspeção visual no navegador. Suporte a tema escuro completo (com todas as classes adaptadas) fica para uma iteração futura de design, fora do escopo do Marco 1.

DEC-013 — Busca desacoplada de `listPublished()`: `SearchRepository`  
Decisão: criar uma interface própria `SearchRepository` (`src/lib/repositories/types.ts`), com um único método `search(query: SearchQuery): Promise<SearchOutcome>`, recebendo texto livre residual, referência bíblica já normalizada, filtros (livro/testamento/tema/personagem/série) e paginação (`page`/`limit`), e devolvendo itens com score + `total`. `/busca` para de chamar `studyRepository.listPublished()` e passar o array para uma função pura — agora chama `searchRepository.search(...)` diretamente. A implementação `MockSearchRepository` ainda opera em memória sobre `publishedStudies`, mas atrás da mesma interface que uma futura `SupabaseSearchRepository` vai preencher com uma consulta real (WHERE + full-text search + `LIMIT`/`OFFSET` no Postgres).  
Também: `StudyRepository.listPublished()` foi documentado explicitamente como não-definitivo para agregação/paginação (não deve ser usado para contagens ou "últimos estudos"); foi adicionado `listRecent(limit)` e a home page passou a usá-lo em vez de `listPublished()+sort+slice`. As contagens por tema/personagem/série em `/temas`, `/personagens` e `/series` continuam em memória por ora (aceitável para ~20 estudos mockados) mas foram marcadas com `TODO(Fase 2, DEC-013)` nos três arquivos, para não serem esquecidas nem tratadas como arquitetura definitiva.  
Motivo: auditoria externa do Marco 1 apontou que a arquitetura de busca "carregar tudo e filtrar em memória" não deve virar o padrão da Fase 2 — precisava de uma fronteira própria antes de existir código real de Supabase/Postgres.

DEC-014 — Parser de referências rejeita referências estruturalmente impossíveis; ranking de referência em três níveis  
Decisão: `parseReference` (`src/lib/search/referenceParser.ts`) passa a validar capítulo (inteiro, `1 <= capitulo <= book.totalCapitulos`) e versículo (`versiculoInicio >= 1`, `versiculoFim >= versiculoInicio` quando presente), retornando `{ type: "invalid", reason, ... }` em vez de um resultado "válido" sem sentido. `src/lib/search/queryParsing.ts` traduz isso para a UI como um aviso explícito (nunca "Referência reconhecida: João 999:999"), mas ainda tenta a busca lexical com o texto integral como fallback, em vez de um beco sem saída.  
O ranking de referência bíblica (`src/lib/search/search.ts`) passou de dois para três níveis, do mais específico ao menos específico: `referenceExactVerse` (1000, sobreposição real de versículo) > `referenceChapter` (700, mesmo livro+capítulo sem sobreposição exata de versículo — inclui o caso de uma passagem classificada só no nível de capítulo, sem versículo informado) > `referenceBook` (500, só o livro bate). Isso corrige um vazio do Marco 1: uma busca por "João 3:16" não recuperava um estudo cuja passagem era classificada genericamente como "João 3" (sem versículo) — agora recupera, com score menor que um match exato, e nunca recupera um estudo sem nenhuma passagem relacionada.  
Motivo: auditoria externa do Marco 1 apontou que uma referência estruturalmente impossível não podia ser aceita silenciosamente, e que o ranking precisava diferenciar capítulo de versículo em vez de tratá-los como uma única faixa.

DEC-015 — Dados mockados devem espelhar fielmente as relações N:N do domínio  
Decisão: o campo de série nos seeds de `src/lib/data/studies.ts` mudou de `serie?: { slug, ordem }` (singular) para `series?: Array<{ slug, ordem }>` — a mesma forma N:N que `docs/DATA_MODEL.md` sempre definiu para `study_series`. Um estudo fictício ("Fé que atravessa as Escrituras: de Abraão a Paulo") foi criado especificamente para provar as relações N:N do domínio: 4 passagens em livros diferentes (Romanos, Gênesis, Habacuque, João) com uma principal, uma secundária e duas citadas (uma delas classificada só no nível de capítulo); 2 temas; 2 personagens; e 2 séries (Fundamentos da Fé + Cartas de Paulo). Testes em `src/lib/repositories/search.test.ts` provam que esse estudo aparece na navegação de todos os livros relacionados, em buscas por qualquer uma das quatro referências, com todas as referências visíveis na página do estudo, e com uma referência principal previsível.  
Motivo: os 20 estudos mockados originais tinham sempre 0 ou 1 série e no máximo 1 passagem "principal" sem secundária/citada — o modelo de domínio já suportava N:N, mas nada nos dados ou nos testes provava isso, então um erro de simplificação (`serie` singular) passou despercebido. Nunca voltar a simplificar o mock para 1:1 sem atualizar `Study.series`/`StudyPassage` em `src/lib/types.ts` primeiro.

DEC-016 — Fonte de verdade da documentação técnica  
Decisão: `docs/` dentro deste repositório Git é a documentação técnica ativa e a única fonte de verdade para desenvolvimento (arquitetura, modelo de dados, especificação de busca, decisões, roadmap, estado do trabalho). O Google Drive permanece como acervo editorial e documentação de negócio/teologia (DEC-001, DEC-007) — nunca como uma segunda fonte de especificação técnica concorrente. O Drive pode receber snapshots/backups periódicos dos documentos técnicos ao final de cada marco (cópia de leitura, não o inverso); nenhuma sessão de desenvolvimento deve ler ou escrever especificação técnica a partir do Drive.  
Motivo: evitar duas fontes técnicas divergentes — se `docs/` e uma cópia no Drive pudessem ambas ser editadas independentemente, elas divergiriam silenciosamente e uma sessão futura poderia trabalhar a partir da versão errada.

DEC-017 — `StudySummary` como DTO de listagem, separado de `Study` completo  
Decisão: criar `StudySummary` (`src/lib/types.ts`) — id, slug, título, resumo, autor, dataOrigem, referência principal já resolvida, temas e séries — e usá-lo em todo método de listagem (`listRecent`, `listByBookSlug`, `listByTopicSlug`, `listByCharacterSlug`, `listBySeriesSlug`, e em `SearchResultItem.study`). `Study` completo (com `conteudo` integral, `palavrasChave`, `personagens` e o array inteiro de `passagens`) fica reservado para `getPublishedBySlug()`, a única consulta que a página de detalhe do estudo realmente precisa. `StudyCard` e as páginas de listagem passaram a receber `StudySummary`.  
Motivo: auditoria externa do Marco 1.1 apontou que listagens e resultados de busca carregavam o `Study` inteiro (conteúdo completo, todas as relações) só para mostrar um card — isso não escala para o acervo real, onde `conteudo` pode ser um texto longo. Em Postgres, `StudySummary` é literalmente um `SELECT` com menos colunas e menos joins, não um recorte feito depois de buscar tudo.

DEC-018 — Remoção de `listPublished()`; contratos dedicados de contagem e de slugs  
Decisão: `StudyRepository.listPublished()` foi removido da interface pública (não sobrou nenhum consumidor legítimo depois desta mudança). Em seu lugar: `TopicRepository`, `CharacterRepository` e `SeriesRepository` ganharam `countPublishedStudies(): Promise<Record<string, number>>` (contagem por id, o equivalente a `SELECT <fk>, COUNT(DISTINCT study_id) ... GROUP BY <fk>` em Postgres), usado por `/temas`, `/personagens` e `/series` em vez de carregar todos os estudos e filtrar em memória. `StudyRepository` ganhou `listPublishedSlugs(): Promise<string[]>` (só slugs, `SELECT slug FROM studies WHERE status='PUBLISHED'`), usado por `generateStaticParams()` de `/estudo/[slug]` em vez de carregar cada estudo completo só para ler o slug.  
Motivo: auditoria externa do Marco 1.2 apontou que `/temas`, `/personagens`, `/series` e `generateStaticParams()` de `/estudo/[slug]` — apesar dos `TODO(Fase 2, DEC-013)` já registrados no Marco 1.1 — continuavam usando `listPublished()` como atalho para agregação e para geração de slugs. Isso precisava de contratos próprios antes de escrever os repositórios Supabase, não apenas de um comentário prometendo consertar depois.

DEC-019 — Validação canônica (parcial e documentada) de limite de versículos por capítulo  
Decisão: `src/lib/data/bibleVerseLimits.ts` traz uma tabela `VERSE_LIMITS` com o último versículo válido de um conjunto de capítulos — os citados pelos estudos mockados mais alguns capítulos de referência muito conhecidos (~11 capítulos, não os ~1189 da Bíblia inteira) — e `parseReference` passa a rejeitar (`{ type: "invalid", reason: "versiculo_acima_do_maximo_do_capitulo" }`) uma referência cujo versículo exceda esse limite quando o capítulo está documentado. Quando o capítulo NÃO está na tabela, nenhum limite de versículo é aplicado (comportamento idêntico ao anterior) — a ausência de dado nunca vira uma rejeição nem uma aprovação inventadas.  
Motivo: o parser validava capítulo e "versículo >= 1", mas não o limite superior real de cada capítulo, permitindo algo como "João 3:999". A tabela completa de versificação da Bíblia (~1189 capítulos) não foi transcrita de memória de propósito — isso seria exatamente o tipo de dado que a instrução do Marco 1.2 pede para não inventar. A tabela é explicitamente parcial e versionada (v1); antes da Fase 3 (importação do acervo real) deve ser substituída/completada a partir de uma fonte verificável (dados de versificação USFM/OSIS de um projeto auditável, ou exportação de uma API bíblica licenciada), nunca por mais transcrição manual.

DEC-020 — Política de segurança do Supabase, registrada antes da conexão  
Decisão: antes de qualquer código de conexão real ao Supabase (Fase 2), este projeto se compromete com a seguinte política de segurança. Nenhum destes itens está implementado ainda — nenhuma tabela, nenhuma RLS, nenhuma chave — isto é a especificação que a Fase 2 deve seguir, não um relato do que já existe.

1. **Row Level Security (RLS) obrigatória e ligada por padrão.** Toda tabela exposta a qualquer cliente (`studies`, `passages`, `study_passages`, `topics`, `study_topics`, `characters`, `study_characters`, `series`, `study_series`, `books`) deve ter `ENABLE ROW LEVEL SECURITY` desde a migration que a cria. Uma tabela sem RLS habilitada não entra em produção — nunca "habilito depois".
2. **Leitura pública só de estudos `PUBLISHED` e `visibilidade = 'publico'`.** A policy de `SELECT` para o papel anônimo (`anon`) em `studies` filtra por `status = 'PUBLISHED' AND visibilidade = 'publico'` na própria policy (não como um `WHERE` que a aplicação promete sempre lembrar de adicionar). `DRAFT`, `REVIEW` e `ARCHIVED` nunca são visíveis para `anon`, mesmo que a aplicação tenha um bug e esqueça um filtro.
3. **Nenhuma operação pública de escrita.** Nenhuma policy de `INSERT`, `UPDATE` ou `DELETE` existe para o papel `anon` em nenhuma tabela do acervo. Toda escrita (edição editorial, publicação, ingestão) passa por um papel autenticado/de serviço, nunca pelo cliente público — não há formulário público de "sugerir estudo" ou similar nesta arquitetura.
4. **`SUPABASE_SERVICE_ROLE_KEY` é exclusivamente server-side.** Essa chave ignora RLS por definição — só pode existir em código que roda no servidor (Route Handlers, Server Actions, jobs de ingestão), nunca em uma variável `NEXT_PUBLIC_*`, nunca serializada para o cliente, nunca em um Client Component. Só `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ambas já documentadas em `.env.example`) podem chegar ao navegador.
5. **Nenhuma chave privilegiada em Client Component.** Qualquer componente marcado `"use client"` só pode usar o cliente Supabase criado com a chave `anon` (sujeita a RLS). Consultas que precisam de mais privilégio (ingestão, moderação) ficam inteiramente em código server-only, chamado via Server Action/Route Handler — o Client Component nunca importa `getSupabaseClient` com a service role.
6. **Tabelas de relacionamento não podem revelar `DRAFT`/`REVIEW`/`ARCHIVED` por um caminho indireto.** `study_passages`, `study_topics`, `study_characters` e `study_series` guardam apenas `study_id`, não o status do estudo — a policy de `SELECT` nessas tabelas para `anon` precisa fazer join/`EXISTS` contra `studies` e aplicar o mesmo filtro do item 2, para que listar "estudos de um tema" nunca vaze um estudo não publicado através da tabela de junção mesmo que a policy de `studies` esteja correta isoladamente.
7. **Separação entre leitura pública e ingestão/administração.** O cliente usado pelas páginas públicas (`anon`) e o cliente usado pelo futuro pipeline de ingestão/painel administrativo (service role ou um papel autenticado com policies próprias) são instâncias diferentes, criadas em módulos diferentes (`src/lib/supabase/client.ts` para o público; um `src/lib/supabase/adminClient.ts` ou equivalente, server-only, para ingestão/administração, a ser criado só quando essa camada existir — DEC vigente: nenhum código de administração pública ainda, ver CLAUDE_START).
8. **As policies precisam ser testadas antes de produção**, não assumidas corretas por leitura do SQL. Estratégia mínima exigida antes de ligar RLS em produção: (a) um script/teste de integração que autentica como `anon` (ou sem sessão) contra um projeto Supabase de desenvolvimento/staging e confirma que um estudo `DRAFT` semeado de propósito NÃO aparece em nenhuma query pública (direta ou via tabela de junção); (b) o mesmo teste confirma que `INSERT`/`UPDATE`/`DELETE` como `anon` falham; (c) esses testes rodam no CI antes de qualquer deploy que toque migrations ou policies, não só uma vez manualmente.

Motivo: a auditoria externa do Marco 1.2 exigiu que a política de segurança do banco fosse decidida e registrada ANTES do código de conexão existir, para que a primeira migration real já nasça com RLS correta em vez de ser corrigida depois que dados sensíveis (estudos em revisão) já estiverem expostos. Isso é a aplicação direta de DEC-004 (revisão humana obrigatória) e DEC-007 (separação de responsabilidades) na camada de banco.

REGRA  
Novas decisões arquiteturais relevantes devem ser registradas aqui antes ou junto da implementação.  
