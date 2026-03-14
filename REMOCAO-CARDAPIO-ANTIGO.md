# Remoção do Módulo de Cardápio Antigo

## Status: PARCIAL - Mantendo Módulo de Demanda

## Sistemas Identificados

### Sistema ANTIGO (a remover):
- Tabelas: `cardapios`, `cardapio_refeicoes`
- Modelo: `backend/src/modules/cardapios/models/Cardapio.ts`
- Usa frequência mensal

### Sistema NOVO (manter):
- Tabelas: `cardapios_modalidade`, `cardapio_refeicoes_dia`
- Controller: `backend/src/modules/cardapios/controllers/cardapioController.ts`
- Usa refeições por dia da semana

## Análise de Uso

### ✅ Planejamento de Compras
- Migrado para sistema NOVO
- Usa `cardapios_modalidade` e `cardapio_refeicoes_dia`
- Função antiga `calcularDemanda` removida
- Rota `/calcular-demanda` removida

### ⚠️ Módulo de Demanda/Estoque
- **AINDA EM USO** no frontend
- Páginas: GerarDemanda, DemandasLista, DemandaForm
- Backend: `backend/src/modules/estoque/controllers/demandaController.ts`
- Usa sistema ANTIGO de cardápios
- **NÃO PODE SER REMOVIDO** sem migração completa

## Decisão

**MANTER módulo de demanda antigo funcionando**

O módulo de demanda é usado ativamente no sistema. Remover as tabelas antigas quebraria funcionalidades em produção.

## Ações Realizadas

1. ✅ Removida função `calcularDemanda` antiga do planejamentoComprasController
2. ✅ Removido import de `calcularDemanda` de planejamentoComprasRoutes
3. ✅ Removida rota `/calcular-demanda` de planejamentoComprasRoutes

## Próximos Passos (Futuro)

Para remover completamente o sistema antigo:
1. Migrar `demandaController.ts` para usar sistema novo
2. Atualizar frontend (GerarDemanda.tsx, etc)
3. Testar todas as funcionalidades
4. Executar migration para dropar tabelas antigas
5. Remover `Cardapio.ts` (model antigo)
