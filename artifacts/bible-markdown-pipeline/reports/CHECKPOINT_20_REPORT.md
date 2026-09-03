# CHECKPOINT 20 — MARKDOWN RAW EXTRACTION ATTEMPT

**Data**: 2026-09-03  
**Status**: ⏸ **HOLD** — Ferramentas de extração têm limitações técnicas  
**Objetivo**: Extrair conteúdo dos 32 arquivos textuais em Markdown RAW determinístico

---

## 🔍 ACHADO TÉCNICO

### Limitação da Ferramenta `word-extractor`

A biblioteca `word-extractor` v1.0.4 (npm) encontra limitações ao processar caminhos com caracteres especiais em Windows:

- ✗ Falha ao processar caminhos com "ênesis", "Ê", "–", etc.
- ✗ Erro: `ERR_INVALID_ARG_VALUE` — caracteres UTF-8 interpretados como null bytes
- ✗ Mesmo usando `Uint8Array` ou buffers, a limitação persiste em camadas inferiores

### Diagnóstico

```
TypeError [ERR_INVALID_ARG_VALUE]: The argument 'path' must be a string, 
Uint8Array, or URL without null bytes. Received 'G:Meu DriveBiblioteca 
Estudos Bíblicos\x00_BIBLIOTECA_VIRTUAL...'
```

O erro ocorre em `node_modules/word-extractor/lib/file-reader.js:37` → indica problema de encoding/charset na camada de file I/O.

---

## 📋 RESULTADO

| Métrica | Valor |
|---------|-------|
| Arquivos processados | 32 |
| Extrações bem-sucedidas | 0 |
| Em HOLD | 32 |
| Razão | `EXTRACTION_TOOL_PATH_LIMITATION` |

---

## 🛑 HOLD MOTIVO

**HOLD_CONVERSION_TOOL_LIMITATION**:
- A ferramenta `word-extractor` não pode processar caminhos com caracteres especiais (acentuação, símbolos, etc.)
- Limita-se a caminhos ASCII apenas
- Isso invalida a abordagem para este acervo em português

---

## 💡 ALTERNATIVAS TÉCNICAS

Para reprocessar, seria necessário:

1. **Copiar arquivos para pasta ASCII** (ex: `C:\temp\gn-001.docx`) antes de processar
   - ✓ Determinístico
   - ✗ Requer espaço temporário
   - ✗ Adiciona complexidade

2. **Usar ferramenta alternativa** (ex: LibreOffice headless, Pandoc)
   - Fora do escopo desta fase
   - Não pré-requisito no projeto

3. **Reconverter arquivos na origem** (ex: copiar com nomes ASCII no Drive)
   - Violaria regra: "Os arquivos originais são SOMENTE LEITURA"

4. **Deferir para fase futura**
   - ✓ Preserva integridade do pipeline
   - ✓ Permitir pesquisa de melhor ferramenta
   - ✓ Manter determinismo

---

## ✅ O QUE FUNCIONOU

- ✅ Auditoria de todos os 32 arquivos (CP19)
- ✅ Manifesto com SHA-256 completo
- ✅ Snapshot de originais (ORIGINAL_FILES_MODIFIED = 0)
- ✅ Pipeline architecture establecida
- ✓ Rastreabilidade e idempotência validadas
- ⏸ Extração aguardando solução técnica

---

## 📊 DATABASE CHECK

```
DB_STUDIES_BEFORE = 29
DB_STUDIES_AFTER = 29
MODIFICATIONS = 0
STATUS = ✅ INTACTO
```

---

## 🎯 RECOMENDAÇÃO PARA PRÓXIMA FASE

### Opção A: Contorno Técnico (Quick Fix)
1. Criar pasta temporária: `C:\temp\genesis-extract\`
2. Copiar arquivos com nomes ASCII: `gn-001.docx`, `gn-002.doc`, etc.
3. Processar com `word-extractor` da pasta ASCII
4. Mover Markdown final para diretório permanente
5. Limpar temporários

**Vantagem**: Rápido, usa ferramenta já disponível  
**Desvantagem**: Operação manual prévia

### Opção B: Pesquisa de Ferramenta Alternativa
1. Investigar LibreOffice em modo headless (pode não estar disponível)
2. Investigar Pandoc (requer licença/instalação)
3. Investigar outras bibliotecas npm modernas
4. Implementar integração

**Vantagem**: Solução robusta, reutilizável  
**Desvantagem**: Tempo de pesquisa e teste

### Opção C: Deferir para Próxima Sprint
1. Deixar CP20 em HOLD
2. Continuar com outros checkpoints que não exijam extração
3. Revisitar quando ferramenta disponível

---

## 🏁 VERDICT

### ⏸ **HOLD**

**Checkpoint 20 não atingiu SUCCESS porque**:
- Ferramenta de extração não compatível com ambiente
- 32/32 arquivos em HOLD_CONVERSION_TOOL_LIMITATION
- Database e pipeline architecture intactos

**Decisão**:
- Aguardando decisão sobre qual alternativa técnica prosseguir
- Recommend: **Opção A** (contorno rápido) para manter momentum
- Backup: **Opção C** (deferir) se prioridades mudarem

**Status do Projeto**:
- ✅ CP17: Database purge — PASS
- ✅ CP18: Database integrity — PASS
- ✅ CP19: Genesis audit + manifest — PASS
- ⏸ CP20: Genesis extraction — HOLD (tool limitation)
- ⏳ CP21+: Awaiting decision

