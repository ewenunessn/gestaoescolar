# 📜 Scripts de Atualização do GitHub

Este diretório contém scripts para facilitar a atualização do repositório no GitHub.

## 📁 Arquivos Disponíveis

### 1. `update-github.ps1` (PowerShell)
**Script principal com mensagem personalizada**

```powershell
# Uso:
.\update-github.ps1 "Sua mensagem de commit aqui"

# Exemplo:
.\update-github.ps1 "Adicionar nova funcionalidade de cardápios"
```

**Funcionalidades:**
- ✅ Verifica se é um repositório Git
- 📋 Mostra status do repositório
- 📁 Adiciona todos os arquivos modificados
- 💾 Faz commit com mensagem personalizada
- 🌐 Envia alterações para o GitHub
- 📝 Mostra o último commit realizado
- 🎨 Interface colorida e informativa

### 2. `update-github.bat` (Batch)
**Versão em batch para compatibilidade**

```batch
REM Uso:
update-github.bat "Sua mensagem de commit aqui"

REM Exemplo:
update-github.bat "Corrigir bug na página de produtos"
```

**Funcionalidades:**
- Mesmas funcionalidades do script PowerShell
- Compatível com sistemas mais antigos
- Interface com emojis e cores
- Pausa automática para visualizar resultados

### 3. `quick-update.ps1` (PowerShell)
**Script de atualização rápida com timestamp automático**

```powershell
# Uso:
.\quick-update.ps1
```

**Funcionalidades:**
- 🚀 Atualização com um único comando
- 📅 Mensagem de commit automática com timestamp
- ⚡ Ideal para atualizações frequentes
- 🔄 Processo automatizado completo

## 🚀 Como Usar

### Primeira Vez
1. Abra o PowerShell ou Prompt de Comando como Administrador
2. Navegue até o diretório do projeto:
   ```powershell
   cd "C:\Users\ewert\OneDrive\Área de Trabalho\gestaoescolar"
   ```

### Para PowerShell (.ps1)
```powershell
# Permitir execução de scripts (apenas na primeira vez)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Usar o script principal
.\update-github.ps1 "Minha mensagem de commit"

# Ou usar o script rápido
.\quick-update.ps1
```

### Para Batch (.bat)
```batch
# Simplesmente execute
update-github.bat "Minha mensagem de commit"
```

## 📋 Pré-requisitos

- ✅ Git instalado e configurado
- ✅ Repositório Git inicializado
- ✅ Repositório remoto configurado (origin)
- ✅ Credenciais do GitHub configuradas

## 🔧 Configuração do Git (se necessário)

```bash
# Configurar nome e email (apenas na primeira vez)
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@exemplo.com"

# Verificar repositório remoto
git remote -v

# Adicionar repositório remoto (se necessário)
git remote add origin https://github.com/seu-usuario/seu-repositorio.git
```

## 🎯 Exemplos de Uso

```powershell
# Commit específico
.\update-github.ps1 "Implementar sistema de autenticação"

# Correção de bug
.\update-github.ps1 "Corrigir erro na validação de formulários"

# Atualização rápida
.\quick-update.ps1

# Usando batch
update-github.bat "Adicionar documentação do projeto"
```

## ⚠️ Notas Importantes

- 🔒 **Segurança**: Nunca commite arquivos com senhas ou chaves de API
- 📝 **Mensagens**: Use mensagens de commit descritivas e claras
- 🔄 **Backup**: Sempre faça backup antes de grandes alterações
- 🌐 **Conexão**: Certifique-se de ter conexão com a internet

## 🆘 Solução de Problemas

### Erro de Execução de Script PowerShell
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Erro de Autenticação
- Verifique suas credenciais do GitHub
- Configure um Personal Access Token se necessário

### Erro "Not a git repository"
- Certifique-se de estar no diretório correto do projeto
- Inicialize o repositório Git se necessário: `git init`

---

**💡 Dica**: Para uso frequente, considere criar um alias ou atalho para os scripts!