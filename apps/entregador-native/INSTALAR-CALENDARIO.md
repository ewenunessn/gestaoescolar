# Instalação do Calendário de Cardápios

## Dependência Necessária

Para usar o calendário de cardápios, você precisa instalar a biblioteca `react-native-calendars`:

```bash
cd apps/entregador-native
npm install react-native-calendars
```

## Funcionalidades

O calendário de cardápios oferece:

1. **Visualização Mensal**: Veja todos os cardápios do mês em formato de calendário
2. **Marcação Visual**: Dias com cardápios são marcados com um ponto verde
3. **Criação Rápida**: Toque em um dia vazio para criar um novo cardápio
4. **Detalhes do Dia**: Toque em um dia com cardápios para ver todos os cardápios daquele dia
5. **Múltiplos Cardápios**: Adicione vários cardápios no mesmo dia (diferentes refeições/modalidades)

## Como Usar

### Acessar o Calendário

1. Abra o app
2. Vá em "🥗 Nutrição"
3. Clique em "📆 Calendário de Cardápios"

### Criar Cardápio

1. Toque em um dia vazio no calendário
2. Selecione a refeição (café, almoço, etc.)
3. Selecione a modalidade (creche, pré-escola, etc.)
4. Adicione observações (opcional)
5. Clique em "Salvar"

### Ver Cardápios do Dia

1. Toque em um dia marcado (com ponto verde)
2. Veja todos os cardápios daquele dia
3. Clique em "Adicionar Outro" para adicionar mais cardápios
4. Clique no ícone de lixeira para excluir um cardápio

## Navegação

- **Lista de Cardápios**: Ver todos os cardápios em formato de lista
- **Calendário**: Ver cardápios em formato de calendário mensal

## Cores e Tema

- Verde (#4caf50): Cor principal do módulo de nutrição
- Ponto verde: Indica dia com cardápio
- Dia selecionado: Fundo verde

## Localização

O calendário está configurado em português brasileiro:
- Nomes dos meses em português
- Nomes dos dias da semana em português
- Formato de data: DD/MM/YYYY

## Troubleshooting

### Erro ao instalar

Se houver erro ao instalar, tente:

```bash
cd apps/entregador-native
rm -rf node_modules package-lock.json
npm install
npm install react-native-calendars
```

### Calendário não aparece

1. Verifique se a dependência foi instalada
2. Reinicie o Metro bundler
3. Limpe o cache: `npm start -- --reset-cache`

### Datas não aparecem

Verifique se a API está retornando as datas no formato correto: `YYYY-MM-DD`

## Estrutura de Dados

### Cardápio

```typescript
{
  id: number;
  data: string; // YYYY-MM-DD
  refeicao_id: number;
  refeicao_nome: string;
  modalidade_id: number;
  modalidade_nome: string;
  observacoes?: string;
}
```

## API Endpoints

- `GET /api/cardapios` - Listar todos os cardápios
- `POST /api/cardapios` - Criar novo cardápio
- `DELETE /api/cardapios/:id` - Deletar cardápio
- `GET /api/refeicoes` - Listar refeições
- `GET /api/modalidades` - Listar modalidades

## Próximas Melhorias

- [ ] Filtro por modalidade
- [ ] Copiar cardápio de um dia para outro
- [ ] Visualização semanal
- [ ] Exportar cardápio do mês em PDF
- [ ] Notificações de cardápios pendentes
