# Diagnóstico: Produtos em Múltiplos Contratos

## Status: ✅ IMPLEMENTADO - ⚠️ AGUARDANDO TESTE

## Problema Identificado

No banco Neon (produção), existe pelo menos 1 produto em múltiplos contratos:

### Alho (ID: 154)
- **Contrato 64/25** (Distribuidora Mesquita LTDA)
  - Preço: R$ 1,00/kg
  - Quantidade: 11 kg
  - Válido até: 30/06/2026

- **Contrato 64** (Distribuidora Mesquita LTDA)
  - Preço: R$ 14,20/kg
  - Quantidade: 2.240 kg
  - Válido até: 30/06/2026

## Comportamento Esperado

Quando você tentar gerar um pedido que inclua Alho:

1. ✅ Backend detecta que há 2 contratos disponíveis
2. ✅ Retorna `requer_selecao: true`
3. ✅ Frontend abre o dialog `SelecionarContratosDialog`
4. ✅ Você pode:
   - **Modo Simples**: Escolher apenas 1 contrato (ex: o de R$ 1,00)
   - **Modo Divisão**: Dividir entre os 2 contratos (ex: 5kg do primeiro + resto do segundo)

## Correções Aplicadas

### Backend
- ✅ Corrigido erro crítico: `pedido_item_id` → `pedido_id` no INSERT
- ✅ Query retorna TODOS os contratos ativos
- ✅ Detecta produtos com múltiplos contratos
- ✅ Suporta divisão de quantidade com campo `quantidade` opcional

### Frontend
- ✅ Dialog completo implementado
- ✅ Modo simples e modo divisão
- ✅ Botão "Dividir por Saldo Disponível"
- ✅ Validação de quantidade total
- ✅ Interface atualizada com campo `quantidade?: number`

## Como Testar

### Teste 1: Gerar Pedido com Alho
1. Acesse o Planejamento de Compras no Vercel
2. Selecione uma competência que inclua Alho
3. Clique em "Gerar Pedidos"
4. **Esperado**: Dialog de seleção deve abrir automaticamente

### Teste 2: Modo Simples
1. No dialog, deixe o checkbox "Dividir entre contratos" desmarcado
2. Selecione o contrato desejado (ex: R$ 1,00/kg)
3. Confirme
4. **Esperado**: Pedido criado com todo o Alho do contrato selecionado

### Teste 3: Modo Divisão
1. No dialog, marque o checkbox "Dividir entre contratos"
2. Adicione ambos os contratos
3. Especifique quantidades (ex: 5kg + 6kg = 11kg total)
4. Confirme
5. **Esperado**: Pedido criado com 2 itens de Alho, um para cada contrato

### Teste 4: Divisão Automática
1. No dialog, clique "Dividir por Saldo Disponível"
2. **Esperado**: Sistema distribui automaticamente priorizando maior saldo
3. Confirme
4. **Esperado**: Pedido criado com divisão automática

## Possíveis Problemas

### Se o dialog não abrir:
1. Verifique o console do navegador (F12)
2. Procure por erros de JavaScript
3. Verifique se o deploy do Vercel incluiu as alterações

### Se os itens não forem criados:
1. Verifique os logs do backend no Vercel
2. Procure por erros SQL
3. Verifique se o campo `pedido_id` está correto (não `pedido_item_id`)

### Se a validação não funcionar:
1. Verifique se o total alocado = quantidade necessária
2. O botão "Confirmar" só fica habilitado quando válido

## Arquivos Modificados

- `backend/src/controllers/planejamentoComprasController.ts` - Lógica de detecção e divisão
- `frontend/src/components/SelecionarContratosDialog.tsx` - Dialog de seleção (NOVO)
- `frontend/src/pages/PlanejamentoCompras.tsx` - Integração do dialog
- `frontend/src/services/planejamentoCompras.ts` - Interface com `quantidade?: number`

## Scripts de Teste

- `backend/migrations/testar-multiplos-contratos-neon.js` - Teste local
- `backend/migrations/testar-multiplos-contratos-producao.js` - Teste no Neon

## Próximos Passos

1. ✅ Código commitado e pushed
2. ⏳ Aguardando deploy do Vercel
3. ⏳ Teste manual no ambiente de produção
4. ⏳ Validação com produto "Alho"

## Observações

- O mesmo fornecedor (Distribuidora Mesquita) tem 2 contratos diferentes para Alho
- Preços muito diferentes: R$ 1,00 vs R$ 14,20
- Provavelmente o contrato de R$ 1,00 é um teste ou erro de cadastro
- Você pode usar isso para testar a funcionalidade de seleção
