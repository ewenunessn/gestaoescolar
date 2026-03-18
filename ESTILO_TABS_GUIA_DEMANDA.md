# Atualização: Estilo das Tabs na Guia de Demanda

## Resumo
Substituído o componente padrão `Tabs` do Material-UI pelo componente customizado `ViewTabs` na página de detalhes da guia de demanda, mantendo consistência visual com a página de detalhes de refeição.

## Mudanças Implementadas

### 1. Componente ViewTabs
O componente `ViewTabs` oferece um estilo mais moderno e consistente:
- **Design**: Tabs com fundo cinza claro (#f1f3f5) e tab ativa com fundo branco
- **Bordas arredondadas**: 8px no container, 6px nas tabs
- **Transições suaves**: Animação de 0.15s ao mudar de tab
- **Ícones**: Suporte para ícones ao lado do texto
- **Hover**: Feedback visual ao passar o mouse

### 2. Arquivo Modificado

#### `frontend/src/pages/GuiaDemandaDetalhe.tsx`
- **Import adicionado**: `ViewTabs` do componente customizado
- **Import removido**: `Tabs, Tab` do Material-UI
- **Substituição das tabs**:
  ```tsx
  // ANTES
  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
    <Tabs value={tabAtiva} onChange={(_, v) => { setTabAtiva(v); setSearchTerm(''); }}>
      <Tab label="Por Produto" icon={<InventoryIcon />} iconPosition="start" />
      <Tab label="Por Escola" icon={<SchoolIcon />} iconPosition="start" />
    </Tabs>
  </Box>

  // DEPOIS
  <Box sx={{ mb: 1.5 }}>
    <ViewTabs
      value={tabAtiva}
      onChange={(v) => { setTabAtiva(v); setSearchTerm(''); }}
      tabs={[
        { value: 0, label: 'Por Produto', icon: <InventoryIcon sx={{ fontSize: 16 }} /> },
        { value: 1, label: 'Por Escola', icon: <SchoolIcon sx={{ fontSize: 16 }} /> },
      ]}
    />
  </Box>
  ```

### 3. Características do ViewTabs

#### Estilo Visual
- **Container**: Fundo cinza claro com padding de 3px
- **Tab Inativa**: 
  - Fundo transparente
  - Texto cinza secundário
  - Peso da fonte: 500
- **Tab Ativa**:
  - Fundo branco
  - Borda cinza clara (1px solid #dee2e6)
  - Texto preto
  - Peso da fonte: 600
- **Hover**: Fundo levemente escurecido

#### Funcionalidades
- Ícones opcionais ao lado do texto
- Transições suaves entre estados
- Responsivo e adaptável
- Cursor pointer para indicar interatividade
- Texto não selecionável (userSelect: 'none')

### 4. Benefícios da Mudança

1. **Consistência Visual**: Mesmo estilo usado em outras páginas do sistema
2. **Melhor UX**: Feedback visual mais claro sobre qual tab está ativa
3. **Design Moderno**: Estilo mais limpo e profissional
4. **Manutenibilidade**: Componente reutilizável em todo o sistema

### 5. Páginas que Usam ViewTabs

- ✅ `RefeicaoDetalhe.tsx` - Ingredientes / Ficha Técnica
- ✅ `GuiaDemandaDetalhe.tsx` - Por Produto / Por Escola
- ✅ `Romaneio.tsx` - Agrupamento de dados

## Comparação Visual

### Antes (Material-UI Tabs)
- Linha inferior para indicar tab ativa
- Estilo mais tradicional
- Menos destaque visual

### Depois (ViewTabs)
- Tab ativa com fundo branco destacado
- Container com fundo cinza
- Bordas arredondadas
- Mais moderno e intuitivo

## Próximos Passos Sugeridos
- [ ] Aplicar ViewTabs em outras páginas com tabs
- [ ] Padronizar tamanho dos ícones (16px)
- [ ] Documentar padrão de uso do ViewTabs
