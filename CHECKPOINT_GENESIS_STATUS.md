# CHECKPOINT GENESIS — Status de Progresso

**Data**: 2026-09-03  
**Status**: EM PROGRESSO (Fase de Preparação Concluída)  
**Próximo**: Execução de Ingestão Real

---

## ✅ CONCLUÍDO NESTA SESSÃO

### 1. Documentação
- [x] Leitura de WORK_STATUS.md (checkpoint 16 PASS confirmado)
- [x] Entendimento do escopo (30 novos normais, 4 SPECIAL fora, 6 PPTX fora)
- [x] Identificação de casos especiais:
  - GEN-013: N:N (3 arquivos → 1 estudo)
  - GEN-041: RTF disfarçado de .doc
- [x] Autoridade editorial recebida e integrada

### 2. Infraestrutura
- [x] `src/lib/ingestion/genesis-manifest.json` criado (30 estudos estruturados)
- [x] `scripts/genesis-ingest-v1.ts` criado (skeleton pronto)
- [x] Integração com pipeline existente (reutilizado `LocalSyncedDriveSourceAdapter`, `SupabaseIngestionRepository`)
- [x] Estrutura de metadados editoriais definida (título, tipo, referência, temas, personagens, slug, resumo)

### 3. Planejamento
- [x] Casos de teste identificados
- [x] Exclusões confirmadas (SPECIAL_REVIEW, PPTX)
- [x] SEL-001-004 preservados (não duplicar)
- [x] Contagem esperada: 30 REVIEW, 0 DRAFT, 0 PUBLISHED

---

## 📋 PENDÊNCIAS IMEDIATAS (próxima sessão ou continuação)

### Fase 1: Validação de Acervo Local
**Ação**: Verificar se todos os 30 drive_file_id têm correspondência no acervo sincronizado
```bash
# Deve-se validar:
# - Caminho base: G:\Meu Drive\Biblioteca Estudos Bíblicos\01 - Antigo Testamento\01 - Gênesis
# - Fallback recursivo se não encontrado
# - Detectar formato real de GEN-041 (RTF vs .doc)
```

**Bloqueador potencial**: Se caminho exato não existir, adaptar para alternativa encontrada

### Fase 2: Execução de Ingestão Real
```bash
npx supabase db reset  # aplicar 11 migrations do zero
npm run genesis:ingest # executar ingestão real (30 estudos)
```

**Esperado**:
- 30 REVIEW (0 DRAFT, 0 PUBLISHED)
- GEN-013: N:N criado corretamente (3 fontes → 1 estudo)
- GEN-041: RTF extraído sem erro
- Nenhuma duplicação de SEL-001-004

### Fase 3: Idempotência
```bash
npm run genesis:ingest  # rerun — deve gerar mesmos study_id
```

### Fase 4: Quality Gates
```bash
npx tsc --noEmit
npx eslint .
npx vitest run
npx supabase test db  # 15/15 PASS esperado
npm run build  # contra Supabase real
```

### Fase 5: Validações Explícitas
1. 30 novos estudos Genesis REVIEW ✓
2. 0 novos Genesis DRAFT ✓
3. 0 Genesis PUBLISHED ✓
4. 4 SPECIAL_REVIEW não ingeridos ✓
5. 6 apresentações não ingeridas ✓
6. SEL-001-004 não duplicados ✓
7. GEN-013 N:N funcionando ✓
8. RTF disfarçado extraído ✓
9. Rerun não altera contagens ✓
10. RLS mantém REVIEW invisível ✓
11. Lote 01 anterior intacto (20 REVIEW) ✓

### Fase 6: Documentação Final
- Atualizar `docs/WORK_STATUS.md`
- Registrar DEC-044+ em `docs/DECISIONS.md`
- Criar `CHECKPOINT_GENESIS_RELATORIO.md` com 22 itens
- Commits pequenos e lógicos

---

## 🔧 SCRIPTS/CONFIGURAÇÕES AINDA A FAZER

### `package.json`
Adicionar:
```json
"genesis:ingest": "tsx scripts/genesis-ingest-v1.ts"
```

### `.env.local`
Já existe com credenciais Supabase local (criado em checkpoint anterior)

### `genesis-ingest-v1.ts`
Refinamentos necessários:
- [ ] Implementar aplicação de metadados editoriais PÓS-extração (override)
- [ ] Tratar N:N de GEN-013 (múltiplos drive_file_ids → 1 estudo)
- [ ] Detectar e processar RTF de GEN-041 sem erro
- [ ] Logging detalhado de cada estudo

---

## ⚠️ PONTOS DE ATENÇÃO

### Caso GEN-013: "Entra, Bendito do Senhor" (N:N)
```
drive_file_ids: [
  "1bU9f5E_15BM3uhMmHWFbSvloehO8hFSY",  # Versão 1 (texto integral)
  "1TC3ah4TYHqGPX7ntYNvRznysm71Reo7N",  # Versão 2 (texto integral duplicado)
  "1Z2eFG0nje01tkBlWtw1-bsj_hQI0kGFW"   # Versão 3 (resumo/roteiro)
]
```
**Esperado**: 1 estudo, 3 arquivos linkados via `study_files` (N:N)
**Atual**: Pipeline processa só o primeiro arquivo
**Solução**: Após ingestão do 1º arquivo, vincular os outros 2 via `study_files` manualmente ou em pós-processamento

### Caso GEN-041: "Obra como Forma de Vida"
```
drive_file_id: "1n_FJooQw6YBO_8Z9pWUPl9vk3bSUzG_L"
nome_arquivo: "Gn 37 - Obra Forma de Vida .doc"
nota_especial: "Arquivo RTF disfarçado de .doc"
```
**Risco**: `word-extractor` pode rejeitar formato legado
**Solução**: Detectar formato real via magic bytes, usar extrator RTF se necessário
**Fallback**: Se extração falhar, marcar como DRAFT + diagnóstico legível

---

## 📊 Estado Esperado ao Final

```
Total estudos banco: 71 + 30 = 101

Breakdown:
- Mockados: 22 (PUBLISHED, intactos)
- Fase 1: 20 (REVIEW, intactos)
- Fase 3: 49 (REVIEW + DRAFT + FALHA, intactos)
- Genesis V1: 30 (REVIEW, novos)

Total REVIEW: 20 + 46 + 30 = 96
Total DRAFT: 3 (Fase 3, não Genesis)
Total PUBLISHED: 20 (mockados, não reais)
Total FALHA: 1 (Fase 3 DUP-002, não Genesis)
```

---

## ✓ Checklist de Continuidade

Para próxima sessão/continuação:

- [ ] Validar Docker/Supabase `docker info` + `npx supabase status`
- [ ] Ler este arquivo
- [ ] Executar `npx supabase db reset`
- [ ] Verificar 30 arquivos no acervo local (caminhos)
- [ ] Adicionar script ao `package.json`
- [ ] Refinar `genesis-ingest-v1.ts` (metadados, N:N, RTF)
- [ ] Executar ingestão real
- [ ] Validar contagens
- [ ] Quality gates
- [ ] Relatório final

---

**Próximo checkpoint**: Execução de ingestão real com validações completas.
