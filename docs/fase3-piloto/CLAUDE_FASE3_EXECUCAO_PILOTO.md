# Claude — Fase 3 — Execução do piloto real

## Objetivo
Executar a Fase 3 da Biblioteca Virtual de Estudos Bíblicos com o lote piloto real auditado, preservando os arquivos originais e mantendo todo conteúdo novo em `DRAFT`/`REVIEW` até validação humana.

## Estado de entrada
- Fase 2 concluída contra Supabase/Postgres real.
- pgTAP: 15/15 PASS.
- Testes TypeScript: 155/155 PASS.
- `tsc`, lint e build limpos.
- Build: 124 páginas.

## Arquivos do piloto
Leia integralmente, antes de codificar:
- `docs/fase3-piloto/PILOTO_FASE3_MANIFEST.csv`
- `docs/fase3-piloto/PILOTO_FASE3_SELECIONADOS.csv`
- `docs/fase3-piloto/PILOTO_FASE3_REVISAR.csv`
- `docs/fase3-piloto/PILOTO_FASE3_DUPLICADOS_POSSIVEIS.csv`
- `docs/fase3-piloto/PILOTO_FASE3_README.txt`
- `docs/fase3-piloto/AUDITORIA_PREPARACAO_FASE3.txt`

O manifesto tem 50 candidatos: 37 selecionados, 1 em revisão editorial e 12 em grupos de possível duplicidade/versão.

## Regras invioláveis
1. Não apagar, mover, renomear ou modificar arquivos originais do Drive.
2. Não publicar automaticamente nenhum estudo real.
3. Todo estudo ingerido deve nascer como `DRAFT` ou `REVIEW`.
4. `PUBLISHED` só após aprovação humana explícita.
5. Preservar `drive_file_id`, título original, caminho original, MIME, data e origem.
6. Não inventar referência, tema, personagem, série, autor, resumo ou metadado ausente.
7. Inferências devem ser sugestões marcadas para revisão humana.
8. Reprocessamento deve ser idempotente.
9. Falha de extração nunca pode alterar o arquivo-fonte.
10. Os 12 possíveis duplicados ficam separados; não fazer merge/exclusão automática.

## Casos editoriais já resolvidos
- `4ª aula — PÃO E VINHO`: João 6, multi-passagem; João 6:51,54,55,57 e Gênesis 14:18–19.
- `Jesus, a Fonte da Salvação`: Juízes 15:18–19.
- `Êxodo 15:7 — A Eira de Araúna`: título original contém referência incorreta; conteúdo aponta para Êxodo 15:17. Preserve o título original e normalize a referência separadamente.
- `A Comunhão - At2.43-43`: conteúdo usa Atos 2:42–43.
- `Untitled document` em Apocalipse: conteúdo é Apocalipse 4:1; sugestão editorial de título `A Porta Aberta — Apocalipse 4:1`; não renomear original.
- `O evangelho eterno`: está fisicamente em Êxodo, mas texto-base é Gálatas 1:11–12. Deve permanecer `REVIEW`; não realocar/publicar automaticamente.

## Grupos de duplicidade que devem virar testes
- Êxodo: duas versões de `Êxodo 12:1–11 — Páscoa`.
- Juízes: `A Torre Forte` PDF/DOC e versões de Gideão/Trigo no Lagar.
- Lucas: versões de `E quem é o meu próximo`.
- Atos: `Êutico.doc` e `Êutico - At20.7-11.doc`.
- Romanos: versões de `O Sétimo Milênio`.

## Protocolo de execução

### 1. Reentrada e auditoria do repo
Leia primeiro:
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/SEARCH_SPEC.md`
- `docs/INGESTION_SPEC.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- `docs/WORK_STATUS.md`

Inspecione o código real antes de mudar arquitetura. Confirme working tree e o fechamento da Fase 2.

### 2. Validar o manifesto
- Exigir exatamente 50 candidatos.
- Exigir filas 37/1/12.
- Validar unicidade de `pilot_id` e `drive_file_id`.
- Criar teste automatizado para essas invariantes.

### 3. Pipeline de ingestão
Para cada arquivo:
1. identificar por `drive_file_id`;
2. obter fonte por adaptador de origem;
3. detectar MIME;
4. extrair texto quando suportado;
5. normalizar sem destruir original;
6. preservar metadados de origem;
7. detectar referências bíblicas deterministicamente quando possível;
8. tratar tema/personagem/série inferidos apenas como sugestões;
9. criar/atualizar `study` idempotentemente;
10. criar relações `study_passages`/`files` necessárias;
11. registrar `ingestion_job` e erro por estágio;
12. terminar em `DRAFT`/`REVIEW`, nunca `PUBLISHED`.

### 4. Formatos
Cobrir progressivamente Google Docs/texto exportado, DOC/DOCX, RTF, PDF e PPT/PPTX. Se um formato não puder ser extraído com segurança, registrar falha recuperável/unsupported e continuar. Não simular sucesso.

### 5. Duplicidade
Diagnóstico somente. Para os 12 candidatos, comparar hash quando aplicável, texto normalizado, título normalizado e referência bíblica. Registrar similaridade e motivo. Produzir grupos de candidatos. Nenhuma fusão/exclusão automática.

### 6. Validação do banco
Comprovar:
- zero estudos reais `PUBLISHED`;
- zero `drive_file_id` duplicado;
- relações many-to-many preservadas;
- PÃO E VINHO multi-passagem correto;
- A Eira de Araúna com referência normalizada correta sem alterar título original;
- A Comunhão usando Atos 2:42–43;
- O evangelho eterno em `REVIEW` e com divergência de pasta registrada;
- possíveis duplicados continuam distintos.

### 7. Qualidade
Rodar testes existentes + novos testes de ingestão, idempotência e duplicidade; `tsc`; lint; build; testes do banco quando Docker/Supabase estiver disponível. Não remover/relaxar testes para obter PASS.

### 8. Visualização
Depois da ingestão técnica, permitir visualizar `DRAFT`/`REVIEW` apenas em ambiente administrativo/local. A área pública continua mostrando somente `PUBLISHED`.

### 9. Checkpoint obrigatório
Atualizar `docs/WORK_STATUS.md` com data/hora, commits, arquivos alterados, itens lidos, extrações completas/parciais/falhas, DRAFT/REVIEW, grupos de duplicidade, testes, decisões, riscos, primeira pendência e comando exato de retomada. Registrar decisões arquiteturais novas em `docs/DECISIONS.md`.

## Critério de GO da Fase 3
GO somente com manifesto 50/50 validado, pipeline idempotente, originais intactos, zero publicação automática, erros rastreáveis, duplicidade apenas diagnosticada, origem/relações preservadas, testes/tsc/lint/build verdes e WORK_STATUS atualizado.

## Protocolo de créditos/retomada
Se sessão/créditos forem interrompidos: não repetir etapas; salvar estado em WORK_STATUS quando possível; na retomada ler WORK_STATUS/ARCHITECTURE/DECISIONS/este protocolo; rodar sanidade mínima e continuar da primeira tarefa pendente.

## Ordem de trabalho agora
1. Auditar repo.
2. Ler manifesto real.
3. Escrever plano técnico curto aderente ao código existente.
4. Implementar ingestão em etapas pequenas.
5. Testar a cada etapa.
6. Ingerir primeiro os 37 selecionados.
7. Processar o item REVISAR sem publicar.
8. Diagnosticar os 12 possíveis duplicados.
9. Validar banco e área administrativa/local.
10. Atualizar WORK_STATUS/DECISIONS e fazer commits pequenos/descritivos.

## Entrega esperada
Relatório final: processados dos 50; extração completa/parcial/falha; DRAFT/REVIEW; grupos de duplicidade; divergências nome/pasta/conteúdo; testes/build; commits; riscos; próxima ação.

**COMECE AGORA. Não implemente RAG, embeddings, chatbot, publicação automática ou ingestão de todo o acervo. Esta execução é exclusivamente o piloto controlado da Fase 3.**
