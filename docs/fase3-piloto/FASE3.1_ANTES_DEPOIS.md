# Fase 3.1 — Comparação ANTES/DEPOIS (checkpoint 14)

Gerado comparando a classificação do scanner de referências ANTES da Fase 3.1
(commit `b29b798`, o mesmo código que fechou o checkpoint 13) contra o
resultado real da re-ingestão DEPOIS das Tarefas 1-3 (DEC-038/DEC-039/DEC-040),
rodando os dois scanners sobre o MESMO `studies.conteudo` já extraído e salvo
no banco (a extração de texto não mudou nesta etapa, só a varredura de
referências e a seleção de MAIN) — não é uma reconstrução por memória, é uma
comparação determinística e reprodutível.

**Resumo agregado:** 48 estudos reais comparados. 41 `REVIEW` + 7 `DRAFT` →
**45 `REVIEW` + 3 `DRAFT`** (4 migraram de `DRAFT` para `REVIEW`). 4 estudos
mantiveram o status mas tiveram a referência **MAIN** recalculada para uma
mais precisa. `DUP-002` continua como a única falha de extração (inalterada
em status — ver diagnóstico em DEC-040).

## Destaques pedidos explicitamente

| pilot_id | status_antes | status_depois | main_antes | main_depois | motivo |
|---|---|---|---|---|---|
| **SEL-035** | DRAFT | REVIEW | (nenhuma) | Êxodo 15:17 | Abreviação tradicional "Ex." (sem acento, com ponto) agora reconhecida — DEC-038. 34 passagens válidas agora detectadas no conteúdo. |
| **SEL-022** | REVIEW | REVIEW | Gênesis 39:20-23 | **Atos 8:3** | MAIN recalculado: a ilustração de abertura (Gênesis 39, citada 1x) não vence mais só por vir primeiro — Atos (citado em 5 capítulos diferentes) vence pela Prioridade C (predominância por concentração) — DEC-039. Ainda flagado como divergência (título do manifesto diz "Atos 16", conteúdo aponta capítulo 8) — decisão humana continua necessária. |
| **DUP-002** | FALHA (EXTRACT) | FALHA (EXTRACT) | — | — | **Sem mudança de status** — continua falhando. O que mudou foi o DIAGNÓSTICO: confirmado por inspeção de bytes que é um `.doc` OLE genuíno em Word 6.0/95 (não corrompido, não MIME errado) — DEC-040. Recuperar o texto está fora do escopo desta etapa. |
| **SEL-009** | REVIEW | REVIEW | João 14:5 | João 14:5 | **Sem mudança** — divergência editorial REAL (título do manifesto diz "João 14:6", conteúdo sustenta "João 14:5") preservada, não resolvida automaticamente, como instruído. |
| **SEL-007** | REVIEW | REVIEW | João 8:12 | João 8:12 | **Sem mudança** — divergência editorial REAL (origem classificada como AT, referência do conteúdo é do NT) preservada, não resolvida automaticamente. |
| **REV-001** | REVIEW | REVIEW | Gálatas 1:11-12 | Gálatas 1:11-12 | Sem mudança de conteúdo — já funcionava desde a correção anterior (DEC-034, nome completo sem acento). Confirmado estável nesta etapa. |

## Tabela completa (48 estudos reais)

| pilot_id | status_antes | status_depois | main_antes | main_depois | motivo |
|---|---|---|---|---|---|
| DUP-001 | DRAFT | **REVIEW** | (nenhuma) | Êxodo 12:1-11 | Abreviação tradicional agora reconhecida — DEC-038 |
| DUP-003 | REVIEW | REVIEW | Juízes 9:50 | Juízes 9:50 | sem mudança |
| DUP-004 | REVIEW | REVIEW | Juízes 9:50 | Juízes 9:50 | sem mudança |
| DUP-005 | REVIEW | REVIEW | Juízes 6:11 | Juízes 6:11 | sem mudança |
| DUP-006 | REVIEW | REVIEW | Juízes 6 | Juízes 6 | sem mudança |
| DUP-007 | REVIEW | REVIEW | Lucas 10:25-29 | Lucas 10:25-29 | sem mudança |
| DUP-008 | REVIEW | REVIEW | Lucas 10:25-29 | Lucas 10:25-29 | sem mudança |
| DUP-009 | REVIEW | REVIEW | Atos 20:7-11 | Atos 20:7-11 | sem mudança |
| DUP-011 | REVIEW | REVIEW | Romanos 8:22 | Romanos 8:22 | sem mudança |
| DUP-012 | DRAFT | **REVIEW** | (nenhuma) | Romanos 8:22 | Abreviação tradicional agora reconhecida — DEC-038 |
| REV-001 | REVIEW | REVIEW | Gálatas 1:11-12 | Gálatas 1:11-12 | sem mudança |
| SEL-001 | REVIEW | REVIEW | Gênesis 32:10 | Gênesis 32:10 | sem mudança |
| SEL-002 | REVIEW | REVIEW | Gênesis 4:21 | Gênesis 4:21 | sem mudança |
| SEL-003 | REVIEW | REVIEW | Gênesis 6:13-15 | Gênesis 6:13-15 | sem mudança |
| SEL-004 | REVIEW | REVIEW | Gênesis 32:22 | Gênesis 32:22 | sem mudança |
| SEL-005 | DRAFT | DRAFT | (nenhuma) | (nenhuma) | sem mudança — continua sem nenhuma referência reconhecida no conteúdo |
| SEL-006 | DRAFT | DRAFT | (nenhuma) | (nenhuma) | sem mudança |
| SEL-007 | REVIEW | REVIEW | João 8:12 | João 8:12 | sem mudança — divergência editorial real preservada |
| SEL-008 | REVIEW | REVIEW | João 20:19-31 | João 20:19-31 | sem mudança |
| SEL-009 | REVIEW | REVIEW | João 14:5 | João 14:5 | sem mudança — divergência editorial real preservada |
| SEL-010 | REVIEW | REVIEW | Êxodo 12:21 | Êxodo 12:21 | sem mudança |
| SEL-011 | REVIEW | REVIEW | Êxodo 25:8-9 | Êxodo 25:8-9 | sem mudança |
| SEL-012 | REVIEW | REVIEW | Êxodo 28:2 | Êxodo 28:2 | sem mudança |
| SEL-013 | DRAFT | **REVIEW** | (nenhuma) | Êxodo 28:12 | Abreviação tradicional agora reconhecida — DEC-038 |
| SEL-014 | REVIEW | REVIEW | Juízes 13:1-12 | Juízes 13:1-12 | sem mudança |
| SEL-015 | REVIEW | REVIEW | Juízes 16:16-21 | Juízes 16:16-21 | sem mudança |
| SEL-016 | REVIEW | REVIEW | Isaías 9:6 | Isaías 9:6 | sem mudança |
| SEL-017 | REVIEW | REVIEW | Isaías 25:8-9 | Isaías 25:8-9 | sem mudança |
| SEL-018 | REVIEW | REVIEW | Isaías 40:11 | Isaías 40:11 | sem mudança |
| SEL-019 | REVIEW | REVIEW | Lucas 7:11-17 | Lucas 7:11-17 | sem mudança |
| SEL-020 | REVIEW | REVIEW | Lucas 15:1-7 | Lucas 15:1-7 | sem mudança (mesma referência já era predominante) |
| SEL-021 | REVIEW | REVIEW | Atos 14:23 | Atos 14:23 | sem mudança |
| SEL-022 | REVIEW | REVIEW | Gênesis 39:20-23 | **Atos 8:3** | MAIN recalculado por predominância — DEC-039 (ver destaque acima) |
| SEL-023 | REVIEW | REVIEW | Atos 20:7-11 | Atos 20:7-11 | sem mudança |
| SEL-024 | REVIEW | REVIEW | Romanos 6:23 | Romanos 6:23 | sem mudança |
| SEL-025 | REVIEW | REVIEW | Romanos 14:12 | Romanos 14:12 | sem mudança |
| SEL-026 | REVIEW | REVIEW | Mateus 13 | **Apocalipse 2:5** | MAIN recalculado por predominância — DEC-039; agora no mesmo livro que o título do manifesto sugere ("Apocalipse 2–3") |
| SEL-027 | REVIEW | REVIEW | Apocalipse 4:1 | Apocalipse 4:1 | sem mudança |
| SEL-028 | REVIEW | REVIEW | Apocalipse 1:1 | Apocalipse 1:1 | sem mudança |
| SEL-029 | REVIEW | REVIEW | Isaías 11:2 | **Apocalipse 2:1-7** | MAIN recalculado por predominância — DEC-039; agora no mesmo livro que o título sugere ("Apocalipse 2") |
| SEL-030 | REVIEW | REVIEW | João 1:7 | **Hebreus 2:3** | MAIN recalculado por predominância — DEC-039 |
| SEL-031 | REVIEW | REVIEW | Gênesis 4:3 | Gênesis 4:3 | sem mudança — ainda `MAIN_REFERENCE_AMBIGUOUS` (ver relatório de divergências) |
| SEL-032 | DRAFT | DRAFT | (nenhuma) | (nenhuma) | sem mudança |
| SEL-033 | REVIEW | REVIEW | João 6:51 | João 6:51 | sem mudança — caso "Pão e Vinho", sem regressão (5 passagens preservadas) |
| SEL-034 | REVIEW | REVIEW | Juízes 15:18-19 | Juízes 15:18-19 | sem mudança |
| SEL-035 | DRAFT | **REVIEW** | (nenhuma) | Êxodo 15:17 | Abreviação tradicional agora reconhecida — DEC-038 (ver destaque acima) |
| SEL-036 | REVIEW | REVIEW | Atos 2:42-43 | Atos 2:42-43 | sem mudança |
| SEL-037 | REVIEW | REVIEW | Apocalipse 4:1 | Apocalipse 4:1 | sem mudança |

**Nota sobre `DUP-002`:** não aparece na tabela acima porque nunca chegou a
virar um `study` (a extração falha antes da classificação de referências) —
ver a linha dedicada nos "Destaques" acima.

## O que NÃO foi "resolvido" automaticamente (por design)

- A divergência editorial genuína que permanece em aberto é **SEL-009**
  (título x conteúdo) e **SEL-007** (testamento da origem x testamento do
  conteúdo) — `REV-001` não tem divergência real neste momento (só a
  correção de acento já aplicada numa etapa anterior, DEC-034). Nenhuma das
  duas foi "resolvida" pela Fase 3.1 — continuam exigindo decisão humana.
- **SEL-023 / DUP-009** (par Êutico) continuam com passagens idênticas —
  candidato a fusão, decisão humana, nunca automática.
- Nenhuma duplicata foi excluída/fundida; nenhum estudo foi publicado.
