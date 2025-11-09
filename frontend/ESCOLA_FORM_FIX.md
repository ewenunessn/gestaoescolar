# Correção do Formulário de Criar Escola

## Problema Identificado
O formulário de **criar escola** estava faltando o campo `codigo_acesso` (código de acesso de 6 dígitos), enquanto o formulário de **editar escola** já tinha esse campo.

## Correções Aplicadas

### 1. Adicionado campo `codigo_acesso` no formulário de criação
```tsx
<Grid item xs={12} sm={6}>
  <TextField 
    name="codigo_acesso" 
    label="Código de Acesso (6 dígitos)" 
    value={formData.codigo_acesso} 
    onChange={handleFormChange} 
    fullWidth 
    required 
    inputProps={{ 
      maxLength: 6, 
      inputMode: 'numeric', 
      pattern: '[0-9]*' 
    }} 
    helperText="Código numérico de 6 dígitos para acesso da escola" 
  />
</Grid>
```

**Posição**: Entre o campo "Código INEP" e o campo "Administração"

### 2. Validação no `handleFormChange`
```tsx
const handleFormChange = (event) => {
  const { name, value } = event.target;
  
  // Validação especial para codigo_acesso: apenas números, máximo 6 dígitos
  if (name === 'codigo_acesso') {
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, [name!]: numericValue }));
    return;
  }
  
  setFormData(prev => ({ ...prev, [name!]: value as string }));
};
```

**Funcionalidade**:
- Remove caracteres não numéricos automaticamente
- Limita a 6 dígitos
- Teclado numérico no mobile (`inputMode: 'numeric'`)

### 3. Inicialização no `openModal`
```tsx
const openModal = () => {
  setFormData({ 
    nome: '', 
    codigo: '', 
    codigo_acesso: '', // ✅ Já estava inicializado
    endereco: '', 
    municipio: '', 
    endereco_maps: '', 
    telefone: '', 
    email: '', 
    nome_gestor: '', 
    administracao: '', 
    ativo: true 
  });
  setModalOpen(true);
};
```

### 4. Adicionada opção "Nenhuma" no select de Administração
```tsx
<Select name="administracao" value={formData.administracao} label="Administração" onChange={handleFormChange}>
  <MenuItem value=""><em>Nenhuma</em></MenuItem>
  <MenuItem value="municipal">Municipal</MenuItem>
  <MenuItem value="estadual">Estadual</MenuItem>
  <MenuItem value="federal">Federal</MenuItem>
  <MenuItem value="particular">Particular</MenuItem>
</Select>
```

## Comparação: Criar vs Editar

### Formulário de Criar (Agora)
✅ Nome da Escola
✅ Código INEP
✅ **Código de Acesso (6 dígitos)** ← ADICIONADO
✅ Administração
✅ Endereço Completo
✅ Município (com LocationSelector)
✅ Telefone
✅ Email
✅ Nome do Gestor
✅ Escola Ativa (Switch)

### Formulário de Editar (Agora)
✅ Nome da Escola
✅ **Código INEP** ← ADICIONADO
✅ Endereço
✅ Município
✅ **Código de Acesso (6 dígitos)**
✅ Telefone
✅ E-mail
✅ Nome do Gestor
✅ Administração
✅ Escola Ativa (Switch)

## Resultado

Agora ambos os formulários têm os mesmos campos essenciais, com o **código de acesso** presente em ambos.

---
**Arquivo**: `frontend/src/pages/Escolas.tsx`
**Status**: ✅ Corrigido
