# Como Executar a Migração da Tabela Produtos

## Opção 1: Executar via Script Node.js (Recomendado)

Este método é mais seguro pois faz rollback automático em caso de erro.

### Pré-requisitos
- Node.js instalado
- Variável `DATABASE_URL` configurada no arquivo `.env`

### Passos

1. Navegue até a pasta do backend:
```bash
cd backend
```

2. Execute o script de migração:
```bash
node scripts/migrate-produtos-schema.js
```

3. O script irá:
   - ✅ Verificar se a tabela produtos existe
   - ✅ Listar colunas atuais
   - ✅ Adicionar novas colunas (se não existirem)
   - ✅ Verificar se colunas antigas foram removidas
   - ✅ Mostrar estrutura final da tabela
   - ✅ Fazer rollback automático em caso de erro

### Saída Esperada

```
🚀 Iniciando migração da tabela produtos...

✅ Tabela produtos encontrada

📋 Colunas atuais:
   - id (integer)
   - nome (character varying)
   - descricao (text)
   ...

➕ Adicionando coluna estoque_minimo...
✅ Coluna estoque_minimo adicionada

➕ Adicionando coluna fator_correcao...
✅ Coluna fator_correcao adicionada

...

✅ Migração concluída com sucesso!
```

---

## Opção 2: Executar SQL Diretamente no Neon

Se preferir executar manualmente no console do Neon.

### Passos

1. Acesse o console do Neon: https://console.neon.tech

2. Selecione seu projeto e banco de dados

3. Abra o SQL Editor

4. Copie e cole o conteúdo do arquivo:
   ```
   backend/migrations/20260323_refactor_produtos_final.sql
   ```

5. Execute o SQL

6. Verifique a estrutura final executando:
```sql
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'produtos'
ORDER BY ordinal_position;
```

---

## Verificação Pós-Migração

Após executar a migração, verifique se as seguintes colunas existem:

### Novas Colunas Adicionadas
- ✅ `estoque_minimo` (INTEGER DEFAULT 0)
- ✅ `fator_correcao` (NUMERIC(5,3) DEFAULT 1.000)
- ✅ `tipo_fator_correcao` (VARCHAR(20) DEFAULT 'perda')
- ✅ `unidade_distribuicao` (VARCHAR(50))
- ✅ `peso` (NUMERIC)
- ✅ `updated_at` (TIMESTAMP)

### Colunas que Devem Ter Sido Removidas (manualmente)
- ❌ `unidade` (removido - usar `unidade_distribuicao`)
- ❌ `fator_divisao` (removido)
- ❌ `marca` (removido - movido para `contrato_produtos`)

---

## Estrutura Final Esperada

```sql
CREATE TABLE produtos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  descricao TEXT,
  tipo_processamento VARCHAR(100),
  categoria VARCHAR(100),
  validade_minima INTEGER,
  imagem_url TEXT,
  perecivel BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estoque_minimo INTEGER DEFAULT 0,
  fator_correcao NUMERIC(5, 3) NOT NULL DEFAULT 1.000,
  tipo_fator_correcao VARCHAR(20) NOT NULL DEFAULT 'perda',
  unidade_distribuicao VARCHAR(50),
  peso NUMERIC
);
```

---

## Rollback (Se Necessário)

Se precisar reverter a migração:

```sql
BEGIN;

ALTER TABLE produtos DROP COLUMN IF EXISTS estoque_minimo;
ALTER TABLE produtos DROP COLUMN IF EXISTS fator_correcao;
ALTER TABLE produtos DROP COLUMN IF EXISTS tipo_fator_correcao;
ALTER TABLE produtos DROP COLUMN IF EXISTS unidade_distribuicao;
ALTER TABLE produtos DROP COLUMN IF EXISTS peso;
ALTER TABLE produtos DROP COLUMN IF EXISTS updated_at;

COMMIT;
```

⚠️ **ATENÇÃO**: Só execute o rollback se realmente necessário, pois você perderá os dados dessas colunas!

---

## Próximos Passos

Após a migração bem-sucedida:

1. ✅ Reinicie o servidor backend
2. ✅ Teste a criação de novos produtos
3. ✅ Teste a edição de produtos existentes
4. ✅ Verifique se os novos campos aparecem corretamente no frontend

---

## Suporte

Se encontrar problemas durante a migração:

1. Verifique os logs do script
2. Verifique se a variável `DATABASE_URL` está correta
3. Verifique se você tem permissões para alterar a tabela
4. Consulte o arquivo `backend/REFATORACAO_PRODUTOS.md` para mais detalhes
