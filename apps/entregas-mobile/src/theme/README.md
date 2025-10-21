# Tema do Aplicativo de Entregas

Este arquivo centraliza todas as configurações visuais do aplicativo para facilitar a personalização.

## Como Usar

### Importar o tema
```typescript
import { appTheme } from '../theme/appTheme';
```

### Usar cores
```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: appTheme.colors.background,
  },
  text: {
    color: appTheme.colors.text.primary,
  },
});
```

### Usar espaçamentos
```typescript
const styles = StyleSheet.create({
  card: {
    margin: appTheme.spacing.lg,
    padding: appTheme.spacing.md,
  },
});
```

### Criar cards padronizados
```typescript
const styles = StyleSheet.create({
  myCard: {
    ...appTheme.card,
    // Adicione customizações aqui se necessário
  },
});
```

### Usar nos componentes
```tsx
<Card style={styles.myCard} elevation={0}>
  <Card.Content>
    {/* Conteúdo */}
  </Card.Content>
</Card>
```

## Personalização

### Cores
Edite as cores em `appTheme.colors`:
- `primary`: Cor principal do app (#1976d2)
- `success`: Cor de sucesso (#4caf50)
- `warning`: Cor de aviso (#ff9800)
- `error`: Cor de erro (#f44336)
- `background`: Cor de fundo (#f5f5f5)
- `surface`: Cor de superfície/cards (#ffffff)
- `border`: Cor das bordas (#e0e0e0)

### Espaçamentos
Edite os espaçamentos em `appTheme.spacing`:
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 24px
- `xxl`: 32px

### Bordas
Edite os raios de borda em `appTheme.borderRadius`:
- `small`: 6px
- `medium`: 8px
- `large`: 12px

### Tipografia
Edite os estilos de texto em `appTheme.typography`:
- `title`: Títulos principais
- `subtitle`: Subtítulos
- `body`: Texto normal
- `caption`: Texto pequeno
- `number`: Números grandes

## Funções Helper

### getStatusColor(percentual)
Retorna a cor baseada no percentual de conclusão:
- 100%: Verde (concluído)
- > 0%: Laranja (em andamento)
- 0%: Vermelho (pendente)

### getStatusLabel(percentual)
Retorna o label do status baseado no percentual.

### getStatusIcon(percentual)
Retorna o ícone do status baseado no percentual.

## Exemplo Completo

```typescript
import { StyleSheet } from 'react-native';
import { appTheme, createCardStyle } from '../theme/appTheme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.colors.background,
    padding: appTheme.spacing.lg,
  },
  card: createCardStyle({
    marginBottom: appTheme.spacing.md,
  }),
  title: {
    ...appTheme.typography.title,
    marginBottom: appTheme.spacing.sm,
  },
  button: {
    ...appTheme.button,
    backgroundColor: appTheme.colors.primary,
  },
});
```
