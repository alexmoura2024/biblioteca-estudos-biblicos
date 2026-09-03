# CHECKPOINT GENESIS — Ingestão Textual V1
**Início**: 2026-09-03  
**Estado anterior**: Checkpoint 16 PASS (Lote 01 Fase 1 com 20 estudos)  
**Objetivo**: Ingerir 30 novos estudos textuais de Gênesis em REVIEW

---

## 📊 ESCOPO GÊNESIS TEXTUAL V1

### Arquivo/Unidades
- **46 arquivos físicos totais**
- **40 arquivos textuais** → **38 unidades editoriais**
  - 4 já no piloto (SEL-001, 002, 003, 004): apenas relacionar, NÃO duplicar
  - 34 novos:
    - **30 REVIEW normais** ← INGERIR AGORA
    - 4 SPECIAL_REVIEW ← NÃO INGERIR

- **6 apresentações** (PPTX) ← NÃO INGERIR (Fase 2)

### Status Esperado ao Final
```
REVIEW: 30 novos (0 DRAFT reais)
PUBLISHED: 0 (reais)
SEL-001 a 004: relacionadas via study_files, não duplicadas
Lote 01: intacto (20 REVIEW anterior)
```

---

## 🎯 AUTORIDADES EDITORIAIS (Google Drive)

Usar como fonte de verdade:
1. **MATRIZ_EDITORIAL_GENESIS_30_TEXTOS_V1** — metadados estruturados
2. **RESUMOS_PUBLICOS_GENESIS_30_TEXTOS_V1** — resumos aprovados
3. **REVISAO_ESPECIAL_GENESIS_4_TEXTOS_V1** — contexto dos 4 SPECIAL_REVIEW
4. **CATALOGO_FASE2_APRESENTACOES_GENESIS_V1** — contexto das 6 PPTX
5. **TAXONOMIA_EDITORIAL_V1** — categorias finais

Metadados humanos → precedência sobre heurísticas.
Resumos: usar dados editoriais, NÃO reescrever.

---

## ⚙️ CASOS TÉCNICOS ESPECIAIS

### Caso 1: "Gn 37 - Obra Forma de Vida .doc"
- Arquivo: `.doc` de nome, mas **conteúdo RTF real**
- Detector: checar formato real, não confia na extensão
- Comportamento esperado: extração correta sem modificar original

### Caso 2: "Entra, Bendito do Senhor" (N:N)
- 3 arquivos textuais → 1 estudo canônico
- Arquivo (1) e (2): texto integral **duplicado** (usar só 1)
- Arquivo (3): versão resumida/roteiro (conteúdo diferente, contexto útil)
- **Resultado**: study N:N com múltiplas sources
- **Garantia**: nenhum estudo duplicado

---

## 📋 PRÓXIMAS AÇÕES

### Fase 1: Preparação
- [ ] Ler documentação do Google Drive (MATRIZ_EDITORIAL, RESUMOS, TAXONOMIA)
- [ ] Listar 30 IDs oficiais de Gênesis
- [ ] Validar 4 exclusões (SPECIAL_REVIEW)
- [ ] Validar 6 exclusões (PPTX)

### Fase 2: Implementação
- [ ] Criar `genesis-manifest.json` com 30 estudos oficiais
- [ ] Estender `pipeline.ts` com regras editoriais (prioridade metadados humanos)
- [ ] Implementar `scripts/genesis-ingest-v1.ts` (filtrando apenas os 30)
- [ ] Testar detecção de RTF (Caso 1)
- [ ] Validar deduplicação de "Entra, Bendito do Senhor" (Caso 2)

### Fase 3: Validação
- [ ] `npx supabase db reset`
- [ ] Ingestão real dos 30 estudos
- [ ] Idempotência (rerun = mesmos study_id)
- [ ] pgTAP 15/15 ✓
- [ ] tsc/eslint/vitest/build ✓
- [ ] Verificações explícitas (22 itens)

### Fase 4: Documentação
- [ ] Atualizar `docs/WORK_STATUS.md`
- [ ] Decisões em `docs/DECISIONS.md` (DEC-044+)
- [ ] Criar CHECKPOINT_GENESIS_RELATORIO.md
- [ ] Commits pequenos e lógicos

---

## 🔄 ESTADO DO BANCO ANTES DE COMEÇAR

```
Total estudos: 71
  - Mockados: 22 (PUBLISHED, intactos)
  - Fase 1: 20 (REVIEW, intactos)
  - Fase 3: 29 (REVIEW+DRAFT+FALHA, intactos)
```

**Garantias a manter**:
- ✅ Nenhum estudo PUBLISHED nesta sessão
- ✅ Lote 01 anterior intacto (verificar contagem)
- ✅ Fase 3 anterior intacto (49 fontes)

---

## ✓ Checklist Inicial

- [x] Git status clean
- [x] Docker/Supabase funcionando
- [x] WORK_STATUS.md lido
- [x] Escopo claro (30 normais, 4 special, 6 pptx)
- [x] Autoridades editoriais identificadas
- [x] Casos especiais documentados
- [ ] Próximo: Ler MATRIZ_EDITORIAL + RESUMOS do Drive
