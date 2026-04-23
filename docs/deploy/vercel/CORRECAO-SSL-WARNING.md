# Correção: Warning SSL PostgreSQL

## Problema
O backend estava exibindo warnings de segurança sobre modos SSL do PostgreSQL:

```
Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'. 
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, 
which have weaker security guarantees.
```

## Causa
O código estava usando `ssl: true` sem especificar explicitamente o modo SSL, fazendo com que o driver PostgreSQL usasse um modo que será alterado em versões futuras.

## Solução Implementada

### 1. Atualização do `backend/src/database.ts`
- Adicionado `sslmode=verify-full` à connection string automaticamente
- Configurado `ssl: { rejectUnauthorized: true }` no pool
- Isso garante a máxima segurança na conexão SSL

### 2. Documentação no `.env.example`
- Adicionado comentário explicando o uso de `sslmode=verify-full`
- Exemplo de connection string correta para produção

## Modos SSL PostgreSQL

- `disable`: Sem SSL (apenas para desenvolvimento local)
- `allow`: Tenta SSL, mas aceita sem SSL
- `prefer`: Prefere SSL, mas aceita sem SSL
- `require`: Requer SSL, mas não verifica certificado
- `verify-ca`: Verifica certificado CA
- `verify-full`: Verifica certificado CA e hostname (MAIS SEGURO) ✅

## Impacto
- ✅ Elimina o warning de segurança
- ✅ Garante conexão SSL segura em produção
- ✅ Mantém compatibilidade com versões futuras do driver pg
- ✅ Não afeta desenvolvimento local (detecta localhost automaticamente)

## Referências
- [PostgreSQL SSL Mode Documentation](https://www.postgresql.org/docs/current/libpq-ssl.html)
- [node-postgres SSL Configuration](https://node-postgres.com/features/ssl)
