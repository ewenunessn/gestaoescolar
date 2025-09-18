# Script de Criação da Tabela de Composição Nutricional

## Como executar a migração

### Opção 1: Executar via psql (recomendado)
```bash
# Conectar ao banco de dados
psql -h localhost -U postgres -d gestaoescolar

# Executar o script SQL
\i src/migrations/create_produto_composicao_nutricional.sql
```

### Opção 2: Executar via Node.js
```bash
# No diretório backend/
npm run migrate
```

### Opção 3: SQL direto
Copie e cole o conteúdo do arquivo `create_produto_composicao_nutricional.sql` diretamente em sua ferramenta de banco de dados favorita.

## Estrutura da Tabela

A tabela `produto_composicao_nutricional` inclui:

- **produto_id**: Chave primária referenciando produtos(id)
- **valor_energetico_kcal**: Valor energético em kcal
- **valor_energetico_kj**: Valor energético em kJ
- **carboidratos**: Carboidratos em gramas
- **proteinas**: Proteínas em gramas
- **gorduras_totais**: Gorduras totais em gramas
- **gorduras_saturadas**: Gorduras saturadas em gramas
- **gorduras_trans**: Gorduras trans em gramas
- **fibra_alimentar**: Fibra alimentar em gramas
- **sodio**: Sódio em miligramas
- **acucares_totais**: Açúcares totais em gramas
- **acucares_adicionados**: Açúcares adicionados em gramas
- **colesterol**: Colesterol em miligramas
- **calcio**: Cálcio em miligramas
- **ferro**: Ferro em miligramas
- **vitamina_c**: Vitamina C em miligramas
- **porcao_referencia**: Porção de referência em gramas (padrão: 100g)
- **unidade_porcao**: Unidade da porção (padrão: 'g')
- **created_at**: Timestamp de criação
- **updated_at**: Timestamp de atualização

## Verificação

Após executar a migração, você pode verificar se a tabela foi criada corretamente:

```sql
-- Verificar se a tabela existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'produto_composicao_nutricional';

-- Verificar estrutura
\d produto_composicao_nutricional
```