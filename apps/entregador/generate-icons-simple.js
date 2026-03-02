// Script simples para gerar ícones SVG que podem ser convertidos para PNG
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = path.join(__dirname, 'public');

// Criar diretório public se não existir
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

sizes.forEach(size => {
  const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1976d2"/>
  <text x="50%" y="50%" font-size="${size * 0.5}" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">📦</text>
</svg>
  `.trim();
  
  const filename = path.join(publicDir, `icon-${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`✓ Gerado icon-${size}.svg`);
});

// Criar um HTML para converter SVG para PNG manualmente
const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Converter SVG para PNG</title>
  <style>
    body { font-family: Arial; padding: 20px; }
    .icon { margin: 10px; display: inline-block; text-align: center; }
    img { border: 1px solid #ccc; }
    button { margin-top: 5px; padding: 5px 10px; }
  </style>
</head>
<body>
  <h1>Converter Ícones SVG para PNG</h1>
  <p>Clique com botão direito em cada imagem e selecione "Salvar imagem como..." para salvar como PNG</p>
  ${sizes.map(size => `
    <div class="icon">
      <img src="icon-${size}.svg" width="${size}" height="${size}" />
      <br>
      <small>${size}x${size}</small>
    </div>
  `).join('')}
  
  <script>
    // Converter SVG para PNG automaticamente
    document.querySelectorAll('img').forEach(img => {
      const size = parseInt(img.width);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      const svgImg = new Image();
      svgImg.onload = function() {
        ctx.drawImage(svgImg, 0, 0);
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = \`icon-\${size}.png\`;
          console.log(\`Pronto para download: icon-\${size}.png\`);
        });
      };
      svgImg.src = img.src;
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(publicDir, 'convert-icons.html'), html);
console.log('\n✅ Ícones SVG gerados!');
console.log('\n📝 Para converter para PNG:');
console.log('1. Abra apps/entregador/public/convert-icons.html no navegador');
console.log('2. Clique com botão direito em cada imagem');
console.log('3. Selecione "Salvar imagem como..." e salve como PNG');
console.log('\nOu use uma ferramenta online como https://www.pwabuilder.com/imageGenerator');
