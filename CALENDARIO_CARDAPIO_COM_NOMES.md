# Calendário de Cardápio - Exibindo Nomes das Refeições

## Status: ✅ CONCLUÍDO

## Objetivo
Mostrar os nomes das refeições diretamente nos dias do calendário, não apenas indicadores coloridos.

## Solução Implementada

### Novo Componente: `CalendarioCardapio`

Criado um componente customizado especificamente para exibir cardápios, baseado no `CalendarioMensal` mas com visualização otimizada para refeições.

**Arquivo**: `frontend/src/components/CalendarioCardapio.tsx`

### Características do Novo Componente

#### 1. Exibição de Refeições
- ✅ Mostra o **nome da refeição** em cada dia
- ✅ Usa **cores de fundo** específicas por tipo de refeição
- ✅ Texto branco sobre fundo colorido para melhor legibilidade
- ✅ Até 3 refeições visíveis por dia
- ✅ Indicador "+X mais" quando há mais de 3 refeições

#### 2. Cores por Tipo de Refeição
- 🟠 Café da Manhã: `#FFA726` (laranja)
- 🟢 Lanche da Manhã: `#66BB6A` (verde)
- 🔴 Almoço: `#EF5350` (vermelho)
- 🔵 Lanche da Tarde: `#42A5F5` (azul)
- 🟣 Jantar: `#AB47BC` (roxo)

#### 3. Layout de Cada Dia
```
┌─────────────┐
│ 15          │ ← Número do dia
│             │
│ Arroz       │ ← Refeição 1 (fundo colorido)
│ Feijão      │ ← Refeição 2 (fundo colorido)
│ Frango      │ ← Refeição 3 (fundo colorido)
│ +2 mais     │ ← Indicador de mais refeições
│             │
│ • • •       │ ← Indicadores de eventos do calendário letivo
└─────────────┘
```

#### 4. Funcionalidades Mantidas
- ✅ Tooltip com lista completa ao passar o mouse
- ✅ Clique no dia abre dialog de detalhes
- ✅ Navegação entre meses
- ✅ Destaque do dia atual
- ✅ Indicadores de feriados e recessos (fundo colorido)
- ✅ Eventos do calendário letivo (pontos coloridos na parte inferior)

### Diferenças entre CalendarioMensal e CalendarioCardapio

| Característica | CalendarioMensal | CalendarioCardapio |
|----------------|------------------|-------------------|
| **Uso** | Calendário Letivo | Cardápio |
| **Eventos** | Pontos coloridos | Texto com fundo colorido |
| **Altura do dia** | 80px | 100px |
| **Informação visível** | Apenas indicadores | Nomes das refeições |
| **Tooltip** | Lista de eventos | Lista completa |
| **Foco** | Eventos gerais | Refeições |

### Código de Exibição de Refeições

```typescript
{refeicoesNoDia.slice(0, 3).map(refeicao => {
  // Extrair apenas o nome da refeição (depois do ":")
  const nomeRefeicao = refeicao.titulo.includes(':') 
    ? refeicao.titulo.split(':')[1].trim() 
    : refeicao.titulo;
  
  return (
    <Box
      key={refeicao.id}
      sx={{
        bgcolor: refeicao.cor,
        color: 'white',
        px: 0.5,
        py: 0.25,
        borderRadius: '3px',
        fontSize: '0.65rem',
        fontWeight: 600,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: 1.2
      }}
    >
      {nomeRefeicao}
    </Box>
  );
})}
```

### Integração com CardapioCalendario

**Antes**:
```typescript
import CalendarioMensal from '../components/CalendarioMensal';

<CalendarioMensal
  ano={ano}
  mes={mes}
  eventos={todosEventos}
  onMesAnterior={handleMesAnterior}
  onProximoMes={handleProximoMes}
  onDiaClick={handleDiaClick}
  diasLetivos={[]}
/>
```

**Depois**:
```typescript
import CalendarioCardapio from '../components/CalendarioCardapio';

<CalendarioCardapio
  ano={ano}
  mes={mes}
  eventos={todosEventos}
  onMesAnterior={handleMesAnterior}
  onProximoMes={handleProximoMes}
  onDiaClick={handleDiaClick}
/>
```

### Formato dos Eventos

As refeições são convertidas para o formato de eventos:

```typescript
{
  id: 123,
  titulo: "Almoço: Arroz com Feijão", // Formato: "Tipo: Nome"
  tipo_evento: "refeicao",
  data_inicio: "2026-03-15",
  data_fim: "2026-03-15",
  cor: "#EF5350", // Cor do tipo de refeição
  descricao: "Observação da refeição",
  _refeicao: { /* dados completos */ }
}
```

O componente extrai apenas o nome (parte depois do ":") para exibição:
- "Almoço: Arroz com Feijão" → exibe "Arroz com Feijão"

### Responsividade

O componente se adapta ao tamanho da tela:
- **Desktop**: Grade 7 colunas (semana completa)
- **Tablet/Mobile**: Mesma grade, mas com scroll horizontal se necessário
- **Texto**: Truncado com ellipsis (...) se muito longo

### Interação do Usuário

1. **Visualizar**: Usuário vê os nomes das refeições diretamente no calendário
2. **Hover**: Tooltip mostra lista completa de refeições e eventos
3. **Clicar**: Abre dialog `DetalheDiaCardapioDialog` com todos os detalhes
4. **Navegar**: Setas para mudar de mês

### Vantagens da Nova Visualização

#### 1. Informação Imediata
- Não precisa clicar para ver o que tem no dia
- Visão geral rápida do mês inteiro
- Facilita planejamento e revisão

#### 2. Visual Atrativo
- Cores chamam atenção
- Fácil identificar tipos de refeição
- Layout limpo e organizado

#### 3. Eficiência
- Menos cliques para obter informação
- Mais produtivo para nutricionistas
- Melhor para apresentações e impressões

#### 4. Consistência
- Mantém padrão visual do sistema
- Cores consistentes em todo o módulo
- Fácil de entender

## Arquivos Criados/Modificados

### Criados
- ✅ `frontend/src/components/CalendarioCardapio.tsx` - Novo componente de calendário

### Modificados
- ✅ `frontend/src/pages/CardapioCalendario.tsx` - Usa novo componente

## Exemplo Visual

```
┌─────────────────────────────────────────────────────────┐
│  ←  Março 2026  →                                       │
├─────┬─────┬─────┬─────┬─────┬─────┬─────────────────────┤
│ Dom │ Seg │ Ter │ Qua │ Qui │ Sex │ Sáb                 │
├─────┼─────┼─────┼─────┼─────┼─────┼─────────────────────┤
│  1  │  2  │  3  │  4  │  5  │  6  │  7                  │
│     │     │     │     │     │     │                     │
│     │Arroz│Arroz│Arroz│Arroz│Arroz│                     │
│     │Feijão│Feijão│Feijão│Feijão│Feijão│                     │
│     │Frango│Peixe│Carne│Frango│Peixe│                     │
├─────┼─────┼─────┼─────┼─────┼─────┼─────────────────────┤
│  8  │  9  │ 10  │ 11  │ 12  │ 13  │ 14                  │
│     │     │     │     │     │     │                     │
│     │Arroz│Arroz│Arroz│Arroz│Arroz│                     │
│     │Feijão│Feijão│Feijão│Feijão│Feijão│                     │
│     │Carne│Frango│Peixe│Carne│Frango│                     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────────────────────┘
```

## Testes Recomendados

1. ✅ Verificar exibição de nomes de refeições
2. ✅ Testar com 1, 2, 3 e mais de 3 refeições por dia
3. ✅ Verificar cores por tipo de refeição
4. ✅ Testar tooltip ao passar o mouse
5. ✅ Testar clique para abrir dialog
6. ✅ Verificar navegação entre meses
7. ✅ Testar com nomes longos (truncamento)
8. ✅ Verificar responsividade em diferentes telas
9. ✅ Testar integração com eventos do calendário letivo
10. ✅ Verificar destaque do dia atual

## Notas Técnicas

- Componente usa TypeScript com React
- Integra com Material-UI (MUI)
- Altura mínima de 100px por dia para acomodar 3 refeições
- Fonte de 0.65rem para caber mais texto
- Truncamento automático com ellipsis
- Tooltip mostra informação completa

## Resultado Final

O CardapioCalendario agora exibe:
- ✅ Nomes das refeições diretamente nos dias
- ✅ Cores específicas por tipo de refeição
- ✅ Até 3 refeições visíveis por dia
- ✅ Indicador de mais refeições quando necessário
- ✅ Eventos do calendário letivo como pontos coloridos
- ✅ Interface intuitiva e informativa
- ✅ Melhor experiência para nutricionistas
