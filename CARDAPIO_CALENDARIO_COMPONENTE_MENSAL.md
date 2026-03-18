# Cardápio Calendário - Usando Componente CalendarioMensal

## Status: ✅ CONCLUÍDO

## Objetivo
Adaptar o CardapioCalendario para usar o mesmo componente de calendário (`CalendarioMensal`) utilizado pelo CalendarioLetivo.

## Mudanças Implementadas

### 1. Substituição do Calendário Customizado
- ❌ **Removido**: Calendário customizado com Grid e drag-and-drop
- ✅ **Adicionado**: Componente `CalendarioMensal` (mesmo do CalendarioLetivo)

### 2. Conversão de Refeições para Eventos
Para que o `CalendarioMensal` possa exibir as refeições, elas são convertidas para o formato de eventos:

```typescript
const refeicoesComoEventos = refeicoes.map(ref => {
  const dataStr = cardapio 
    ? `${cardapio.ano}-${String(cardapio.mes).padStart(2, '0')}-${String(ref.dia).padStart(2, '0')}`
    : '';
  
  return {
    id: ref.id,
    titulo: `${TIPOS_REFEICAO[ref.tipo_refeicao]}: ${ref.refeicao_nome}`,
    tipo_evento: 'refeicao',
    data_inicio: dataStr,
    data_fim: dataStr,
    cor: corTipoRefeicao[ref.tipo_refeicao] || '#ccc',
    descricao: ref.observacao || '',
    _refeicao: ref // Dados extras para uso interno
  };
});
```

### 3. Combinação de Eventos
Refeições e eventos do calendário letivo são combinados em um único array:

```typescript
const todosEventos = [...eventosCalendario, ...refeicoesComoEventos];
```

### 4. Funcionalidades Removidas
- ❌ Drag-and-drop de refeições entre dias
- ❌ Componente `DraggableRefeicao`
- ❌ Componente `DroppableDay`
- ❌ `DndContext`, `DragOverlay`
- ❌ Imports do `@dnd-kit/core`

### 5. Funcionalidades Mantidas
- ✅ Visualização de refeições no calendário (como eventos coloridos)
- ✅ Dialog de detalhes do dia (`DetalheDiaCardapioDialog`)
- ✅ Adição/remoção de refeições via dialog
- ✅ Exportação de PDFs (calendário, frequência, relatório detalhado)
- ✅ Integração com eventos do calendário letivo
- ✅ Cards laterais (Resumo do Cardápio, Eventos do Mês)
- ✅ Layout Grid 8/4

### 6. Interação com o Calendário
Ao clicar em um dia no calendário:
```typescript
const handleDiaClick = (data: string) => {
  const dia = parseInt(data.split('-')[2]);
  setDiaSelecionado(dia);
  setOpenDetalhesDiaDialog(true); // Abre dialog com detalhes do dia
};
```

O dialog `DetalheDiaCardapioDialog` exibe:
- Todas as refeições do dia
- Todos os eventos do calendário letivo do dia
- Botões para adicionar/excluir refeições
- Link para ver detalhes completos de cada refeição

## Vantagens da Nova Implementação

### 1. Consistência Visual
- Mesmo componente usado em CalendarioLetivo e CardapioCalendario
- Interface unificada em todo o sistema
- Usuários têm experiência consistente

### 2. Manutenibilidade
- Um único componente de calendário para manter
- Correções de bugs beneficiam ambas as páginas
- Menos código duplicado

### 3. Simplicidade
- Menos dependências (removido @dnd-kit)
- Código mais simples e fácil de entender
- Menos estados para gerenciar

### 4. Integração Natural
- Refeições e eventos do calendário letivo aparecem juntos
- Cores diferentes para cada tipo de refeição
- Indicadores visuais claros

## Desvantagens (Trade-offs)

### 1. Sem Drag-and-Drop
- **Antes**: Arrastar refeições entre dias
- **Agora**: Usar dialog para mover refeições (excluir e adicionar novamente)

### 2. Visualização Mais Compacta
- **Antes**: Cada dia mostrava até 2 refeições completas com detalhes
- **Agora**: Dias mostram apenas indicadores coloridos (pontos)
- **Solução**: Clicar no dia para ver todos os detalhes

## Cores das Refeições

As refeições são exibidas com cores específicas:
- 🟠 Café da Manhã: `#FFA726` (laranja)
- 🟢 Lanche da Manhã: `#66BB6A` (verde)
- 🔴 Almoço: `#EF5350` (vermelho)
- 🔵 Lanche da Tarde: `#42A5F5` (azul)
- 🟣 Jantar: `#AB47BC` (roxo)

## Estrutura do Componente CalendarioMensal

```typescript
<CalendarioMensal
  ano={ano}
  mes={mes}
  eventos={todosEventos} // Refeições + Eventos do calendário letivo
  onMesAnterior={handleMesAnterior}
  onProximoMes={handleProximoMes}
  onDiaClick={handleDiaClick} // Abre dialog de detalhes
  diasLetivos={[]}
/>
```

## Fluxo de Uso

1. **Visualizar Calendário**: Usuário vê o mês com indicadores coloridos
2. **Clicar em Dia**: Abre dialog com todas as refeições e eventos
3. **Adicionar Refeição**: Botão no dialog abre formulário de adição
4. **Excluir Refeição**: Botão de excluir em cada refeição no dialog
5. **Ver Detalhes**: Link para ver composição completa da refeição

## Arquivos Modificados

### `frontend/src/pages/CardapioCalendario.tsx`
- Removido calendário customizado com Grid
- Adicionado componente `CalendarioMensal`
- Removido drag-and-drop (DndContext, DragOverlay, etc.)
- Adicionada conversão de refeições para eventos
- Modificado `handleDiaClick` para abrir dialog automaticamente
- Mantidos cards laterais e funcionalidades de PDF

### Imports Removidos
```typescript
// Removidos
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { DragIndicator as DragIcon } from '@mui/icons-material';
```

### Imports Mantidos
```typescript
// Mantidos
import CalendarioMensal from '../components/CalendarioMensal';
import { DetalheDiaCardapioDialog } from '../components/DetalheDiaCardapioDialog';
```

## Exportação de PDF

A função `exportarCalendarioPDF` foi atualizada para gerar o calendário localmente:
- Criada função interna `getCalendarioSemanasParaPDF()`
- Mantém a mesma estrutura de PDF anterior
- Exibe refeições em cada dia do calendário impresso

## Testes Recomendados

1. ✅ Verificar exibição de refeições como eventos coloridos
2. ✅ Testar clique em dia para abrir dialog de detalhes
3. ✅ Adicionar refeição via dialog
4. ✅ Excluir refeição via dialog
5. ✅ Verificar integração com eventos do calendário letivo
6. ✅ Testar navegação entre meses
7. ✅ Verificar cards laterais (resumo e eventos)
8. ✅ Testar geração de PDFs
9. ✅ Verificar responsividade do layout

## Resultado Final

O CardapioCalendario agora:
- ✅ Usa o mesmo componente de calendário do CalendarioLetivo
- ✅ Mantém layout Grid 8/4 com cards laterais
- ✅ Exibe refeições e eventos juntos no calendário
- ✅ Permite gerenciar refeições via dialog intuitivo
- ✅ Mantém todas as funcionalidades de exportação PDF
- ✅ Interface consistente com o resto do sistema
- ✅ Código mais simples e manutenível

## Notas Técnicas

- Arquivo reduzido de ~1632 para ~1200 linhas
- Removidas ~400 linhas de código de drag-and-drop
- Sem erros de TypeScript
- Compatível com React 18 e Material-UI v5
- Usa react-router-dom v6
