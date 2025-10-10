-- Adicionar status 'consumido' à constraint de faturamentos
ALTER TABLE faturamentos 
DROP CONSTRAINT IF EXISTS faturamentos_status_check;

ALTER TABLE faturamentos 
ADD CONSTRAINT faturamentos_status_check 
CHECK (status IN ('gerado', 'processado', 'cancelado', 'consumido'));
