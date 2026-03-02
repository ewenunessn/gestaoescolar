# Como Gerar Ícones para o PWA

## Opção 1: Usar um Gerador Online (Recomendado)

1. Acesse: https://www.pwabuilder.com/imageGenerator
2. Faça upload de uma imagem quadrada (512x512px ou maior)
3. Baixe o pacote de ícones gerado
4. Extraia os arquivos para `apps/entregador/public/`

## Opção 2: Usar Ferramenta de Linha de Comando

### Instalar sharp-cli
```bash
npm install -g sharp-cli
```

### Gerar ícones a partir de uma imagem base
```bash
# Criar imagem base (512x512)
# Salvar como apps/entregador/public/icon-base.png

# Gerar todos os tamanhos
cd apps/entregador/public

sharp -i icon-base.png -o icon-72.png resize 72 72
sharp -i icon-base.png -o icon-96.png resize 96 96
sharp -i icon-base.png -o icon-128.png resize 128 128
sharp -i icon-base.png -o icon-144.png resize 144 144
sharp -i icon-base.png -o icon-152.png resize 152 152
sharp -i icon-base.png -o icon-192.png resize 192 192
sharp -i icon-base.png -o icon-384.png resize 384 384
sharp -i icon-base.png -o icon-512.png resize 512 512
```

## Opção 3: Criar Ícones Temporários com Canvas (Node.js)

Crie um arquivo `generate-icons.js` na raiz do projeto:

```javascript
const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Fundo azul
  ctx.fillStyle = '#1976d2';
  ctx.fillRect(0, 0, size, size);
  
  // Texto branco
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.3}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📦', size / 2, size / 2);
  
  // Salvar
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`apps/entregador/public/icon-${size}.png`, buffer);
  console.log(`✓ Gerado icon-${size}.png`);
});

console.log('✅ Todos os ícones foram gerados!');
```

Execute:
```bash
npm install canvas
node generate-icons.js
```

## Opção 4: Usar ImageMagick

```bash
# Instalar ImageMagick primeiro
# Windows: https://imagemagick.org/script/download.php

cd apps/entregador/public

# Gerar ícones
magick convert -size 512x512 xc:#1976d2 -gravity center -pointsize 300 -fill white -annotate +0+0 "📦" icon-base.png

magick convert icon-base.png -resize 72x72 icon-72.png
magick convert icon-base.png -resize 96x96 icon-96.png
magick convert icon-base.png -resize 128x128 icon-128.png
magick convert icon-base.png -resize 144x144 icon-144.png
magick convert icon-base.png -resize 152x152 icon-152.png
magick convert icon-base.png -resize 192x192 icon-192.png
magick convert icon-base.png -resize 384x384 icon-384.png
magick convert icon-base.png -resize 512x512 icon-512.png
```

## Verificar Ícones

Após gerar, verifique se todos os arquivos existem:
- icon-72.png
- icon-96.png
- icon-128.png
- icon-144.png
- icon-152.png
- icon-192.png
- icon-384.png
- icon-512.png

## Testar PWA

1. Faça o build: `npm run build`
2. Sirva os arquivos: `npm run preview`
3. Acesse no celular via HTTPS ou localhost
4. Clique em "Adicionar à tela inicial"
