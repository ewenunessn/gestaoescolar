# Correção: Erro de MIME Type no Vercel

## Problema
Ao acessar o frontend na Vercel, os módulos JavaScript não carregavam com o erro:

```
Failed to load module script: Expected a JavaScript module script 
but the server responded with a MIME type of "text/html"
```

## Causa Raiz
O arquivo `frontend/vercel.json` tinha uma regra de rewrite muito ampla:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Essa regra capturava TODAS as requisições, incluindo arquivos JavaScript em `/assets/`, e redirecionava para `/index.html`. Resultado:
- Navegador pede: `/assets/Escolas-COwVcove.js`
- Vercel retorna: conteúdo do `index.html`
- Navegador espera JavaScript, recebe HTML → ERRO

## Solução Implementada

### 1. Corrigir Rewrite Rule
Mudamos a regra para excluir a pasta `/assets/`:

```json
{
  "rewrites": [
    {
      "source": "/((?!assets).*)",
      "destination": "/index.html"
    }
  ]
}
```

A regex `(?!assets)` é um negative lookahead que exclui qualquer path que contenha "assets".

### 2. Adicionar Header Content-Type
Garantimos que arquivos em `/assets/` tenham o Content-Type correto:

```json
{
  "source": "/assets/(.*)",
  "headers": [
    {
      "key": "Content-Type",
      "value": "application/javascript"
    }
  ]
}
```

### 3. Criar .vercelignore
Adicionamos arquivo para excluir arquivos desnecessários do deploy:
- node_modules
- arquivos de log
- arquivos de configuração do editor
- etc.

### 4. Configuração do Projeto
Criamos `.vercel/project.json` para garantir que o Vercel use as configurações corretas:
- Framework: vite
- Build command: npm run build
- Output directory: dist

## Como Funciona Agora

1. **Requisição para rota da aplicação** (ex: `/dashboard`)
   - Match: `/((?!assets).*)`
   - Ação: Retorna `index.html`
   - React Router cuida do roteamento

2. **Requisição para asset** (ex: `/assets/Escolas-COwVcove.js`)
   - Não match: `/((?!assets).*)`
   - Ação: Serve o arquivo JavaScript diretamente
   - Content-Type: `application/javascript`

## Testando a Correção

Após o deploy, verifique:

```bash
# Deve retornar HTML
curl -I https://nutriescola.vercel.app/dashboard

# Deve retornar JavaScript
curl -I https://nutriescola.vercel.app/assets/index-CV9g8ssy.js
```

## Referências
- [Vercel Rewrites Documentation](https://vercel.com/docs/projects/project-configuration#rewrites)
- [Vite Build Configuration](https://vitejs.dev/config/build-options.html)
- [MDN: JavaScript MIME Types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#javascript_types)
