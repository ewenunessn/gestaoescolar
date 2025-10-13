# Assets

Esta pasta contém os assets do aplicativo móvel de entregas.

## Arquivos Necessários

### Ícones
- `icon.png` - Ícone principal do app (1024x1024)
- `adaptive-icon.png` - Ícone adaptativo Android (1024x1024)
- `favicon.png` - Favicon para web (32x32)

### Splash Screen
- `splash.png` - Tela de carregamento (1284x2778)

### Logo
- `logo.png` - Logo do sistema (512x512)

## Especificações

### icon.png
- Tamanho: 1024x1024 pixels
- Formato: PNG com transparência
- Uso: Ícone principal em todas as plataformas

### adaptive-icon.png
- Tamanho: 1024x1024 pixels
- Formato: PNG com transparência
- Uso: Ícone adaptativo no Android
- Área segura: círculo central de 768x768

### splash.png
- Tamanho: 1284x2778 pixels (iPhone 12 Pro Max)
- Formato: PNG
- Fundo: Branco (#FFFFFF)
- Conteúdo: Logo centralizado

### favicon.png
- Tamanho: 32x32 pixels
- Formato: PNG
- Uso: Favicon para versão web

## Criação dos Assets

Para criar os assets, você pode:

1. **Usar o Figma/Adobe XD** para design
2. **Expo Asset Generator** para gerar tamanhos
3. **Online Tools** como makeappicon.com

## Comandos Úteis

```bash
# Gerar ícones automaticamente
npx expo install expo-splash-screen
npx expo configure

# Otimizar imagens
npx expo optimize
```