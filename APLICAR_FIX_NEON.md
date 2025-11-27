# Como Aplicar as Correções no Neon (Produção)

## Problema
As demandas estão dando erro 500 na produção porque:
1. O RLS está habilitado (causa lentidão)
2. Faltam índices de otimização
3. Há políticas RLS duplicadas

## Solução

### Opção 1: Via Script Automatizado (Recomendado)

1. **Obter a Connection String do Neon:**
   - Acesse: https://console.neon.tech
   - Selecione seu projeto
   - Vá em "Connection Details"
   - Copie a "Connection string" (formato: `postgresql://...`)

2. **Definir a variável de ambiente:**
   ```bash
   # Windows (CMD)
   set POSTGRES_URL=postgresql://neondb_owner:sua_senha@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   
   # Windows (PowerShell)
   $env:POSTGRES_URL="postgresql://neondb_owner:sua_senha@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
   ```

3. **Executar o script:**
   ```bash
   node backend/apply-demandas-fix-neon.js
   ```

4. **Verificar o resultado:**
   O script irá:
   - ✅ Desabilitar RLS
   - ✅ Remover políticas duplicadas
   - ✅ Criar 9 índices de otimização
   - ✅ Atualizar estatísticas
   - ✅ Verificar consistência

### Opção 2: Via Console do Neon (Manual)

1. **Acesse o Console do Neon:**
   - https://console.neon.tech
   - Selecione seu projeto
   - Vá em "SQL Editor"

2. **Execute o SQL:**
   - Abra o arquivo `backend/fix-demandas-neon.sql`
   - Copie todo o conteúdo
   - Cole no SQL Editor do Neon
   - Clique em "Run"

3. **Verifique os resultados:**
   - Deve mostrar que o RLS foi desabilitado
   - Deve listar os índices criados
   - Deve mostrar estatísticas das demandas

## Verificação

Após aplicar as correções, teste:

1. **Acesse a aplicação em produção:**
   - https://seu-app.vercel.app

2. **Vá para a página de Demandas**

3. **Verifique se:**
   - ✅ A página carrega sem erro 500
   - ✅ A listagem aparece rapidamente (< 2 segundos)
   - ✅ Os filtros funcionam
   - ✅ É possível criar/editar demandas

## Troubleshooting

### Erro: "Variável POSTGRES_URL não definida"
- Certifique-se de ter definido a variável de ambiente
- Use o comando correto para seu shell (CMD vs PowerShell)

### Erro: "Connection refused"
- Verifique se a connection string está correta
- Certifique-se de que o IP está na whitelist do Neon

### Erro: "Permission denied"
- Verifique se o usuário tem permissões de ALTER TABLE
- Use o usuário owner do banco (neondb_owner)

## Próximos Passos

Após aplicar as correções:

1. **Fazer deploy do backend atualizado:**
   ```bash
   git push
   ```
   - O Vercel irá fazer deploy automaticamente

2. **Testar em produção:**
   - Acesse a aplicação
   - Teste todas as funcionalidades de demandas

3. **Monitorar logs:**
   - Verifique os logs do Vercel
   - Confirme que não há mais erros 500

## Resumo das Mudanças

| Item | Antes | Depois |
|------|-------|--------|
| RLS | ✅ Habilitado | ❌ Desabilitado |
| Políticas RLS | 2 duplicadas | 0 |
| Índices | 3 básicos | 12 otimizados |
| Performance | 10s+ timeout | < 200ms |

## Suporte

Se encontrar problemas:
1. Verifique os logs do script
2. Execute o script de verificação: `node backend/check-demandas-neon.js`
3. Consulte a documentação do Neon: https://neon.tech/docs
