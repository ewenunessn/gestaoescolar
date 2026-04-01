# Módulo de Tipos de Refeição Personalizados

## Visão Geral

Este módulo permite criar e gerenciar tipos de refeição personalizados no sistema, com nome e horário configuráveis. Substitui os tipos fixos anteriores por um sistema dinâmico e flexível.

## Funcionalidades

- ✅ Criar tipos de refeição personalizados (ex: Desjejum, Merenda, etc.)
- ✅ Definir horário para cada tipo
- ✅ Ordenar tipos de refeição
- ✅ Ativar/desativar tipos
- ✅ Integração automática com cardápios
- ✅ Geração de PDF adaptada aos tipos personalizados

## Como Usar

### 1. Executar a Migração

Primeiro, execute a migração para criar a tabela no banco de dados:

```bash
cd backend
node scripts/run-tipos-refeicao-migration.js
```

Isso criará a tabela `tipos_refeicao` e inserirá os tipos padrão:
- Café da Manhã (07:00)
- Lanche da Manhã (09:00)
- Almoço (12:00)
- Lanche da Tarde (15:00)
- Jantar (18:00)
- Ceia (21:00)

### 2. Acessar o Gerenciamento

No sistema, acesse:
**Menu > Cardápios > Tipos de Refeição**

### 3. Criar Novo Tipo

1. Clique em "Novo Tipo"
2. Preencha:
   - **Nome**: Nome exibido (ex: "Desjejum")
   - **Chave**: Identificador único (ex: "desjejum")
   - **Horário**: Horário da refeição (ex: "07:00")
   - **Ordem**: Ordem de exibição (menor aparece primeiro)
3. Clique em "Criar"

### 4. Usar nos Cardápios

Ao adicionar uma refeição no cardápio:
1. Selecione a preparação
2. Escolha o tipo de refeição (agora inclui seus tipos personalizados)
3. O horário será exibido automaticamente

### 5. Geração de PDF

Os PDFs de cardápio são gerados automaticamente com:
- Tipos personalizados
- Horários configurados
- Ordem definida

## API Endpoints

### Listar Tipos
```http
GET /api/tipos-refeicao?ativo=true
```

### Buscar Tipo
```http
GET /api/tipos-refeicao/:id
```

### Criar Tipo
```http
POST /api/tipos-refeicao
Content-Type: application/json

{
  "nome": "Desjejum",
  "chave": "desjejum",
  "horario": "07:00:00",
  "ordem": 1
}
```

### Atualizar Tipo
```http
PUT /api/tipos-refeicao/:id
Content-Type: application/json

{
  "nome": "Desjejum Matinal",
  "horario": "07:30:00",
  "ativo": true
}
```

### Deletar Tipo
```http
DELETE /api/tipos-refeicao/:id
```

## Estrutura do Banco de Dados

```sql
CREATE TABLE tipos_refeicao (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  chave VARCHAR(50) NOT NULL UNIQUE,
  horario TIME NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Validações

- ✅ Chave deve ser única
- ✅ Nome, chave e horário são obrigatórios
- ✅ Não é possível excluir tipo em uso em cardápios
- ✅ Horário deve estar no formato HH:MM

## Exemplos de Uso

### Criar "Desjejum" às 07:00
```javascript
await criarTipoRefeicao({
  nome: 'Desjejum',
  chave: 'desjejum',
  horario: '07:00:00',
  ordem: 1
});
```

### Criar "Merenda" às 10:00
```javascript
await criarTipoRefeicao({
  nome: 'Merenda',
  chave: 'merenda',
  horario: '10:00:00',
  ordem: 2
});
```

## Migração de Dados Existentes

Os tipos padrão são criados automaticamente na migração. Cardápios existentes continuarão funcionando normalmente, pois os tipos padrão incluem as chaves antigas:
- `cafe_manha`
- `lanche_manha`
- `almoco`
- `refeicao`
- `lanche_tarde`
- `lanche`
- `jantar`
- `ceia`

## Troubleshooting

### Erro: "Já existe um tipo de refeição com esta chave"
- A chave deve ser única no sistema
- Use uma chave diferente ou edite o tipo existente

### Erro: "Não é possível excluir este tipo de refeição"
- O tipo está sendo usado em cardápios
- Desative o tipo em vez de excluir, ou remova-o dos cardápios primeiro

### PDF não mostra tipos personalizados
- Verifique se os tipos estão ativos
- Limpe o cache do navegador
- Recarregue a página do cardápio

## Arquivos Modificados

### Backend
- `backend/src/modules/cardapios/routes/tipoRefeicaoRoutes.ts`
- `backend/src/modules/cardapios/controllers/tipoRefeicaoController.ts`
- `backend/src/index.ts` (registro da rota)
- `backend/migrations/0001_create_tipos_refeicao.sql`

### Frontend
- `frontend/src/services/tiposRefeicao.ts`
- `frontend/src/services/cardapiosModalidade.ts` (função `carregarTiposRefeicao`)
- `frontend/src/pages/TiposRefeicao.tsx`
- `frontend/src/pages/CardapioCalendario.tsx` (carregamento dinâmico)
- `frontend/src/utils/cardapioPdfTabela.ts` (PDF com tipos dinâmicos)
- `frontend/src/routes/AppRouter.tsx` (rota `/tipos-refeicao`)
- `frontend/src/components/LayoutModerno.tsx` (menu)

## Suporte

Para dúvidas ou problemas, consulte a documentação técnica ou entre em contato com a equipe de desenvolvimento.
