-- Fase 1: Adição de tipo de estudo (EXPOSITIVO, THEMATIC, PANORAMA, DOUTRINÁRIO)
-- Migration 11 / checkpoint 16

ALTER TABLE studies
ADD COLUMN tipo_estudo TEXT
CHECK (tipo_estudo IN ('EXPOSITIVO', 'THEMATIC', 'PANORAMA', 'DOUTRINÁRIO'))
DEFAULT 'EXPOSITIVO';

-- Índice para filtros por tipo
CREATE INDEX idx_studies_tipo_estudo
ON studies (tipo_estudo)
WHERE status = 'PUBLISHED' AND visibilidade = 'publico';

-- Comentário para documentação
COMMENT ON COLUMN studies.tipo_estudo IS
'Tipo de estudo: EXPOSITIVO (análise versículo-a-versículo), THEMATIC (tema transversal), PANORAMA (visão geral de livro/seção), DOUTRINÁRIO (doutrina/conceito). Padrão: EXPOSITIVO.';
