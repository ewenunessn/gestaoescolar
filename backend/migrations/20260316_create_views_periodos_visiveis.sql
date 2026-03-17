-- Criar views que filtram automaticamente dados de períodos ocultos
-- Isso permite que as queries existentes continuem funcionando sem modificação

-- View para pedidos visíveis (não ocultos)
CREATE OR REPLACE VIEW pedidos_visiveis AS
SELECT p.*
FROM pedidos p
LEFT JOIN periodos per ON p.periodo_id = per.id
WHERE per.ocultar_dados = false OR per.ocultar_dados IS NULL OR per.id IS NULL;

-- View para guias visíveis (não ocultas)
CREATE OR REPLACE VIEW guias_visiveis AS
SELECT g.*
FROM guias g
LEFT JOIN periodos per ON g.periodo_id = per.id
WHERE per.ocultar_dados = false OR per.ocultar_dados IS NULL OR per.id IS NULL;

-- View para cardápios visíveis (não ocultos)
CREATE OR REPLACE VIEW cardapios_visiveis AS
SELECT c.*
FROM cardapios c
LEFT JOIN periodos per ON c.periodo_id = per.id
WHERE per.ocultar_dados = false OR per.ocultar_dados IS NULL OR per.id IS NULL;

-- Comentários explicativos
COMMENT ON VIEW pedidos_visiveis IS 'Pedidos de períodos não ocultos';
COMMENT ON VIEW guias_visiveis IS 'Guias de períodos não ocultos';
COMMENT ON VIEW cardapios_visiveis IS 'Cardápios de períodos não ocultos';
