# Sistema de Filtro de Entregas via QR Code

## Visão Geral

Sistema que permite ao gestor gerar QR Codes com informações de rota e período de entrega. O entregador escaneia o código no app para visualizar apenas os itens programados para aquela rota e período específico.

## Fluxo de Funcionamento

### 1. Geração do QR Code (Sistema Principal - Frontend)

**Localização:** `/entregas/gerar-qrcode`

**Acesso:** Menu lateral → Guias → Gerar QR Code

**Funcionalidades:**
- Seleção de rota
- Definição de período (data início e fim)
- Geração de QR Code offline usando biblioteca `qrcode`
- Opções: Baixar, Imprimir, Copiar dados

**Dados no QR Code:**
```typescript
{
  rotaId: number,
  rotaNome: string,
  dataInicio: string,      // ISO format
  dataFim: string,         // ISO format
  geradoEm: string,        // ISO format
  geradoPor?: string       // Nome do usuário
}
```

### 2. Leitura do QR Code (App Entregador)

**Localização:** Página de Rotas

**Componente:** `QRCodeScanner.tsx`

**Biblioteca:** `html5-qrcode`

**Funcionalidades:**
- Botão "📷 Escanear QR Code" na página de rotas
- Seleção de câmera (frontal/traseira)
- Leitura automática do QR Code
- Validação dos dados
- Salvamento no localStorage

### 3. Aplicação do Filtro

#### 3.1 Página de Rotas (`Rotas.tsx`)

**Comportamento:**
- Mostra apenas a rota especificada no QR Code
- Exibe indicador visual do filtro ativo
- Botão "✕ Limpar Filtro" para remover restrições

**Indicador Visual:**
```
🔍 Filtro Ativo
Rota: [Nome da Rota]
Período: DD/MM/AAAA até DD/MM/AAAA
Gerado por: [Nome]
[✕ Limpar Filtro]
```

#### 3.2 Página de Detalhes da Rota (`RotaDetalhe.tsx`)

**Comportamento:**
- Carrega filtro do localStorage
- Verifica se a rota atual corresponde ao filtro
- Exibe indicador de período ativo
- Passa filtro para as páginas de escola

#### 3.3 Página de Detalhes da Escola (`EscolaDetalhe.tsx`)

**Comportamento:**
- Recebe filtro via state ou localStorage
- Filtra itens pela `data_entrega`
- Mostra apenas itens dentro do período especificado
- Exibe indicador visual do filtro

**Lógica de Filtro:**
```typescript
const dataInicio = new Date(filtro.dataInicio)
dataInicio.setHours(0, 0, 0, 0)

const dataFim = new Date(filtro.dataFim)
dataFim.setHours(23, 59, 59, 999)

const dentroDoIntervalo = dataEntrega >= dataInicio && dataEntrega <= dataFim
```

## Armazenamento

**LocalStorage Key:** `filtro_qrcode`

**Formato:** JSON string do objeto FiltroQRCode

**Persistência:** Mantém-se até ser limpo manualmente ou ao escanear novo QR Code

## Arquivos Modificados

### Frontend (Sistema Principal)
- ✅ `frontend/src/pages/GerarQRCodeEntrega.tsx` - Página de geração
- ✅ `frontend/src/routes/AppRouter.tsx` - Rota configurada
- ✅ `frontend/src/components/LayoutModerno.tsx` - Link no menu

### App Entregador
- ✅ `apps/entregador/src/components/QRCodeScanner.tsx` - Componente de scanner
- ✅ `apps/entregador/src/pages/Rotas.tsx` - Botão e filtro de rotas
- ✅ `apps/entregador/src/pages/RotaDetalhe.tsx` - Indicador e propagação
- ✅ `apps/entregador/src/pages/EscolaDetalhe.tsx` - Filtro de itens por data

## Dependências

### Frontend
- `qrcode` - Geração de QR Code offline

### App Entregador
- `html5-qrcode` - Leitura de QR Code via câmera

## Casos de Uso

### Caso 1: Entrega Programada Semanal
1. Gestor gera QR Code para Rota A, período 03/03 a 07/03
2. Entregador escaneia na segunda-feira
3. App mostra apenas itens programados para aquela semana
4. Entregador realiza entregas sem confusão

### Caso 2: Múltiplas Rotas
1. Gestor gera QR Code para Rota B, período 10/03 a 14/03
2. Entregador escaneia novo código
3. Filtro anterior é substituído automaticamente
4. App mostra apenas Rota B e período especificado

### Caso 3: Remover Filtro
1. Entregador clica em "✕ Limpar Filtro"
2. Todas as rotas voltam a ser visíveis
3. Todos os itens (sem filtro de data) são mostrados

## Validações

### No Scanner
- ✅ Verifica estrutura do JSON
- ✅ Valida campos obrigatórios (rotaId, rotaNome, dataInicio, dataFim)
- ✅ Mostra mensagem de erro se QR Code inválido

### Na Aplicação do Filtro
- ✅ Verifica se rota existe
- ✅ Compara rotaId com rota atual
- ✅ Filtra apenas itens com data_entrega definida
- ✅ Itens sem data_entrega são incluídos por padrão

## Indicadores Visuais

### Filtro Ativo (Azul)
```
Cor: #1976d2 (azul Material Design)
Ícone: 🔍
Posição: Topo da página, abaixo do header
```

### Sem Filtro
- Nenhum indicador visual
- Todas as rotas e itens visíveis

## Melhorias Futuras

1. **Validação de Expiração**
   - Alertar se QR Code foi gerado há muito tempo
   - Sugerir gerar novo código

2. **Histórico de Filtros**
   - Salvar últimos 5 QR Codes escaneados
   - Permitir reativar filtros anteriores

3. **Filtro por Escola**
   - Adicionar campo de escolas específicas no QR Code
   - Filtrar também por escola além de rota e data

4. **Sincronização**
   - Sincronizar filtros entre dispositivos do mesmo usuário
   - Usar backend para armazenar preferências

## Troubleshooting

### QR Code não é reconhecido
- Verificar iluminação
- Manter QR Code centralizado
- Tentar câmera traseira
- Verificar se QR Code foi gerado pelo sistema

### Filtro não está sendo aplicado
- Verificar localStorage do navegador
- Limpar cache do app
- Escanear QR Code novamente

### Itens não aparecem
- Verificar se data_entrega está definida
- Confirmar que data está dentro do período
- Verificar se rota está correta

## Segurança

- ✅ QR Code contém apenas dados de filtro (não sensíveis)
- ✅ Não contém tokens ou credenciais
- ✅ Validação no cliente antes de aplicar
- ✅ Pode ser compartilhado sem riscos

## Testes Recomendados

1. Gerar QR Code e escanear
2. Verificar filtro de rotas
3. Verificar filtro de datas
4. Limpar filtro e verificar reset
5. Escanear múltiplos QR Codes
6. Testar com diferentes períodos
7. Testar com itens sem data_entrega
