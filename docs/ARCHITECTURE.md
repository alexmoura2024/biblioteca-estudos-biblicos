ARCHITECTURE — Biblioteca Virtual de Estudos Bíblicos

1\. Objetivo  
Construir uma biblioteca digital para localizar, ler e relacionar estudos bíblicos do acervo por livro, capítulo, versículo, tema, personagem, série, palavras-chave e pergunta em linguagem natural.

2\. Princípio editorial  
A Bíblia é o eixo de indexação. Os estudos aprovados do acervo são a fonte editorial. A IA será apenas uma camada de descoberta, síntese e navegação, sempre com rastreabilidade das fontes.

3\. Arquitetura alvo  
Frontend: Next.js \+ TypeScript \+ React \+ Tailwind CSS.  
Banco: Supabase/PostgreSQL.  
Busca: lexical \+ parser de referências bíblicas \+ busca temática \+ busca semântica futura com pgvector.  
IA futura: RAG sobre trechos recuperados do próprio acervo.  
Hospedagem: Vercel.  
Acervo editorial: Google Drive.  
Código: GitHub.

4\. Fluxo de dados  
Google Drive → ingestão → extração de texto → normalização → metadados → revisão humana → publicação → indexação → busca no site.

5\. Regra de desempenho  
O site não deve consultar o Google Drive a cada pesquisa do usuário. O Drive é a origem editorial; o site consulta um índice próprio no banco.

6\. Camadas  
Camada 1: interface pública.  
Camada 2: API e serviços de busca.  
Camada 3: banco relacional e índices.  
Camada 4: pipeline de ingestão.  
Camada 5: IA/RAG futura.  
Camada 6: administração e revisão editorial.

7\. Princípios técnicos  
Código modular; TypeScript estrito; mobile-first; acessibilidade; SEO; migrations; segredos fora do repositório; logs; testes; documentação contínua.

8\. Estado inicial  
Primeiro marco: site com dados mockados, busca local, navegação por Bíblia, temas, personagens e séries, páginas individuais de estudo e base preparada para Supabase.  
