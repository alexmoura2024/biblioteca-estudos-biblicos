SEARCH\_SPEC — Biblioteca Virtual de Estudos Bíblicos

1\. Objetivo  
Permitir que o usuário encontre estudos mesmo sem conhecer o nome exato do arquivo.

2\. Tipos de consulta  
Referência bíblica: João 3:16; Jo 3.16; João 3 16; Lucas 22:47-52.  
Livro ou capítulo: João; João 3\.  
Tema: oração; misericórdia; segunda vinda.  
Personagem: Pedro; Davi; Paulo.  
Palavras-chave: espada servo sumo sacerdote.  
Pergunta natural futura: estudos sobre alguém que sofreu e continuou confiando em Deus.

3\. Estratégia de busca por fases  
Fase A: busca lexical em título, resumo, referências, temas, personagens e palavras-chave.  
Fase B: parser robusto de referências bíblicas.  
Fase C: filtros por livro, testamento, tema, personagem e série.  
Fase D: busca semântica por embeddings.  
Fase E: busca híbrida combinando ranking lexical e semântico.

4\. Parser bíblico  
Normalizar abreviações, acentos, espaços, ponto, dois-pontos, intervalos e variações de caixa.  
Nunca interpretar referência ambígua silenciosamente quando houver risco de livro incorreto.

5\. Ranking  
Prioridade sugerida: correspondência exata de referência; título; tema explícito; personagem; palavras-chave; resumo; similaridade semântica.

6\. Resultado  
Cada resultado deve mostrar título, referência principal, resumo curto, temas, série quando houver e acesso ao estudo completo.

7\. IA futura  
Respostas em linguagem natural devem ser geradas somente após recuperação de trechos do acervo e devem exibir as fontes utilizadas.

8\. Critério de qualidade  
Busca por referência bíblica deve ter precisão superior à busca semântica. IA nunca deve substituir a recuperação determinística quando a consulta contém uma referência clara.  
