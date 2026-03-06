# Fluxo de Cardápios - App Entregador Native

## Visão Geral

O módulo de cardápios segue o mesmo fluxo do sistema principal (frontend web), permitindo gerenciar cardápios mensais por modalidade.

## Fluxo de Navegação

```
Home
  └─> Nutrição
       ├─> Refeições
       │    └─> Refeição Detalhe (adicionar produtos/ingredientes)
       │
       └─> Cardápios Mensais
            └─> Calendário do Cardápio (adicionar refeições aos dias)
```

## Passo a Passo

### 1. Criar Cardápio Mensal

1. Acesse **Nutrição** > **Cardápios Mensais**
2. Toque no botão **+** (FAB verde)
3. Preencha:
   - Nome do Cardápio (ex: "Cardápio Creche Março 2026")
   - Mês (Janeiro a Dezembro)
   - Ano
   - Modalidade (Creche, Pré-escola, etc.)
   - Observação (opcional)
4. Toque em **Criar**

### 2. Adicionar Refeições ao Calendário

1. Na lista de cardápios, **toque no card do cardápio** desejado
2. Você verá o calendário do mês selecionado
3. **Toque em um dia** do calendário
4. Selecione:
   - Refeição (ex: "Arroz com Feijão")
   - Tipo (Café da Manhã, Lanche da Manhã, Almoço, Lanche da Tarde, Jantar)
   - Observação (opcional)
5. Toque em **Salvar**
6. Você pode adicionar múltiplas refeições no mesmo dia

### 3. Visualizar Refeições de um Dia

1. No calendário, dias com refeições aparecem com um **ponto verde**
2. **Toque em um dia marcado** para ver todas as refeições
3. Você pode:
   - Ver detalhes de cada refeição
   - Adicionar mais refeições ao dia
   - Excluir refeições

### 4. Gerenciar Refeições

1. Acesse **Nutrição** > **Refeições**
2. Toque em uma refeição para ver detalhes
3. Adicione produtos/ingredientes com quantidade per capita

## Estrutura de Dados

### Cardápio Mensal
- Nome
- Mês (1-12)
- Ano
- Modalidade
- Observação
- Status (Ativo/Inativo)

### Refeição do Dia
- Cardápio (referência)
- Dia do mês (1-31)
- Refeição (referência)
- Tipo de refeição (café_manha, lanche_manha, almoco, lanche_tarde, jantar)
- Observação

## Diferenças do Fluxo Antigo

### Antes (Incorreto)
- Cardápios eram criados por dia individual
- Não havia agrupamento por mês/modalidade
- Calendário era uma tela separada sem contexto

### Agora (Correto)
- Cardápios são mensais por modalidade
- Calendário é específico de cada cardápio
- Fluxo igual ao sistema principal (frontend web)

## API Endpoints Utilizados

```
GET    /api/cardapios                         # Listar cardápios mensais
POST   /api/cardapios                         # Criar cardápio mensal
GET    /api/cardapios/:id                     # Buscar cardápio específico
PUT    /api/cardapios/:id                     # Editar cardápio
DELETE /api/cardapios/:id                     # Excluir cardápio

GET    /api/cardapios/:id/refeicoes           # Listar refeições do cardápio
POST   /api/cardapios/:id/refeicoes           # Adicionar refeição ao dia
DELETE /api/cardapios/refeicoes/:id           # Remover refeição do dia

GET    /api/refeicoes                         # Listar refeições disponíveis
GET    /api/modalidades                       # Listar modalidades
```

## Telas Implementadas

1. **NutricaoScreen** - Menu principal do módulo
2. **RefeicoesScreen** - Lista de refeições
3. **RefeicaoDetalheScreen** - Detalhes e produtos da refeição
4. **CardapiosScreen** - Lista de cardápios mensais (NOVO)
5. **CardapioCalendarioScreen** - Calendário do cardápio (REFATORADO)

## Próximos Passos

- [ ] Implementar cópia de cardápio de um mês para outro
- [ ] Adicionar filtros por modalidade na lista de cardápios
- [ ] Exportar cardápio em PDF
- [ ] Visualização semanal no calendário
- [ ] Estatísticas de frequência de refeições
