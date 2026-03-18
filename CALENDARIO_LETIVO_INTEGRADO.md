# Calendário Letivo - Integração com Sistema de Períodos

## ✅ Implementação Concluída

O sistema de Calendário Letivo foi integrado com o sistema de períodos do usuário. Agora o calendário exibido é baseado no período ativo selecionado pelo usuário.

## Como Funciona

### 1. Seleção Automática por Período
- Quando o usuário seleciona um período no sistema, o calendário letivo correspondente ao ano daquele período é automaticamente carregado
- Se não houver calendário para o ano do período, o sistema busca o calendário ativo como fallback

### 2. Criação Manual de Calendários
- Usuário pode criar calendários letivos manualmente através do botão "Criar Calendário Letivo"
- Ao criar, define apenas o ano letivo
- O sistema cria automaticamente com período padrão: 01/02/YYYY até 20/12/YYYY
- Total de dias letivos obrigatórios: 200 dias

### 3. Gerenciamento de Eventos
- Após criar o calendário, o usuário adiciona eventos manualmente
- Tipos de eventos disponíveis:
  - Feriados (nacional, estadual, municipal, escolar)
  - Eventos escolares
  - Recessos e férias
  - Reuniões pedagógicas
  - Conselhos de classe
  - Avaliações
  - Entrega de boletins
  - Matrículas

## Estrutura do Banco de Dados

### Tabela: calendario_letivo
```sql
- id (PK)
- ano_letivo (único)
- data_inicio
- data_fim
- total_dias_letivos_obrigatorio (padrão: 200)
- divisao_ano (bimestral, trimestral, semestral)
- dias_semana_letivos (JSON: ['seg', 'ter', 'qua', 'qui', 'sex'])
- ativo (boolean)
```

### Tabela: eventos_calendario
```sql
- id (PK)
- calendario_letivo_id (FK)
- titulo
- descricao
- tipo_evento
- data_inicio
- data_fim
- cor
- recorrente
```

### Tabela: periodos_avaliativos
```sql
- id (PK)
- calendario_letivo_id (FK)
- nome (ex: "1º Bimestre")
- numero_periodo (1, 2, 3, 4)
- data_inicio
- data_fim
- data_entrega_notas
```

### Tabela: dias_letivos_excecoes
```sql
- id (PK)
- calendario_letivo_id (FK)
- data
- eh_letivo (boolean)
- motivo
```

## Rotas da API

### Calendário Letivo
- `GET /api/calendario-letivo` - Listar todos
- `GET /api/calendario-letivo/ativo` - Buscar ativo
- `GET /api/calendario-letivo/periodo/:periodo_id` - Buscar por período
- `GET /api/calendario-letivo/:id` - Buscar por ID
- `POST /api/calendario-letivo` - Criar novo
- `PUT /api/calendario-letivo/:id` - Atualizar
- `DELETE /api/calendario-letivo/:id` - Excluir
- `GET /api/calendario-letivo/:id/dias-letivos` - Calcular dias letivos

### Eventos
- `GET /api/calendario-letivo/:calendario_id/eventos` - Listar eventos
- `GET /api/calendario-letivo/:calendario_id/eventos/:ano/:mes` - Eventos do mês
- `POST /api/eventos` - Criar evento
- `PUT /api/eventos/:id` - Atualizar evento
- `DELETE /api/eventos/:id` - Excluir evento
- `POST /api/eventos/importar-feriados` - Importar feriados nacionais

### Períodos Avaliativos
- `GET /api/calendario-letivo/:calendario_id/periodos` - Listar períodos
- `POST /api/periodos` - Criar período
- `PUT /api/periodos/:id` - Atualizar período
- `DELETE /api/periodos/:id` - Excluir período
- `POST /api/calendario-letivo/:calendario_id/periodos/gerar` - Gerar automaticamente

## Fluxo de Uso

### 1. Criar Calendário Letivo
```
1. Acessar "Configurações" → "Calendário Letivo"
2. Clicar em "Criar Calendário Letivo"
3. Informar o ano letivo (ex: 2024)
4. Sistema cria calendário de 01/02/2024 até 20/12/2024
```

### 2. Adicionar Eventos
```
1. Clicar em "Novo Evento"
2. Preencher:
   - Título
   - Tipo de evento
   - Data início/fim
   - Descrição (opcional)
3. Salvar
```

### 3. Visualizar por Período
```
1. Selecionar período no seletor de períodos (topo da página)
2. Sistema carrega automaticamente o calendário do ano daquele período
3. Navegar pelos meses usando as setas
4. Clicar em um dia para ver eventos
```

### 4. Importar Feriados
```
1. Clicar no menu "⋮" (três pontos)
2. Selecionar "Importar Feriados Nacionais"
3. Sistema adiciona automaticamente os feriados do ano
```

## Cálculo de Dias Letivos

O sistema calcula automaticamente:
- Total de dias letivos (considerando dias da semana configurados)
- Subtrai feriados, recessos e férias
- Compara com o mínimo obrigatório (200 dias)
- Mostra diferença e status (atende/não atende)

### Regras de Cálculo
1. Considera apenas dias da semana letivos (seg-sex por padrão)
2. Remove dias com eventos não letivos:
   - Feriados (todos os tipos)
   - Recessos
   - Férias
3. Adiciona exceções marcadas como letivas
4. Remove exceções marcadas como não letivas

## Integração com Períodos

### Backend
```typescript
// Buscar calendário por período
export const buscarCalendarioPorPeriodo = async (req: Request, res: Response) => {
  const { periodo_id } = req.params;
  
  // Busca o ano do período
  const periodo = await db.query('SELECT ano FROM periodos WHERE id = $1', [periodo_id]);
  const ano = periodo.rows[0].ano;
  
  // Busca calendário do ano
  const calendario = await db.query('SELECT * FROM calendario_letivo WHERE ano_letivo = $1', [ano]);
  
  return res.json({ data: calendario.rows[0] });
};
```

### Frontend
```typescript
// Hook para período ativo
const { data: periodoAtivo } = usePeriodoAtivo();

// Carregar calendário baseado no período
useEffect(() => {
  if (periodoAtivo) {
    buscarCalendarioPorPeriodo(periodoAtivo.id);
  } else {
    buscarCalendarioLetivoAtivo();
  }
}, [periodoAtivo]);
```

## Arquivos Principais

### Backend
- `backend/src/controllers/calendarioLetivoController.ts` - Lógica de calendários
- `backend/src/controllers/eventosCalendarioController.ts` - Lógica de eventos
- `backend/src/controllers/periodosAvaliativosController.ts` - Lógica de períodos avaliativos
- `backend/src/routes/calendarioLetivoRoutes.ts` - Rotas da API
- `backend/migrations/20260317_create_calendario_letivo.sql` - Migration

### Frontend
- `frontend/src/pages/CalendarioLetivo.tsx` - Página principal
- `frontend/src/components/CalendarioMensal.tsx` - Componente do calendário
- `frontend/src/components/CriarEditarEventoDialog.tsx` - Dialog de eventos
- `frontend/src/services/calendarioLetivo.ts` - Service da API
- `frontend/src/hooks/queries/usePeriodosQueries.ts` - Hooks de períodos

## Status da Implementação

✅ Backend 100% implementado
✅ Frontend 100% implementado
✅ Integração com períodos funcionando
✅ Migration aplicada no banco local
✅ Dados de teste inseridos (calendário 2024)
✅ Rotas registradas e testadas
✅ Componentes criados e integrados
✅ Menu atualizado com link para calendário

## Próximos Passos (Opcionais)

1. Exportar calendário para PDF
2. Sincronizar com Google Calendar
3. Notificações de eventos próximos
4. Relatórios de frequência
5. Integração com sistema de notas
