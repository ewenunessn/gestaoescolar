# 📦 Guia: Como Cadastrar Lotes com Data de Validade

## 🎯 **Passo a Passo Completo:**

### **1. Acesso ao Sistema**
1. Abra o app **Estoque Escolar Mobile**
2. Faça login com seu **código de gestor**
3. Selecione sua **escola**

### **2. Cadastrar Novo Lote (Entrada)**

#### **Opção A: Produtos Perecíveis (Automático)**
- Produtos das categorias **"Perecível"** ou **"Medicamento"** abrem automaticamente o modal de lotes

#### **Opção B: Qualquer Produto (Manual)**
1. **Toque no produto** desejado na lista
2. **Toque em "Movimentar"** (ícone de setas ↔️)
3. **Escolha "Com Lotes"** quando aparecer a opção
4. **Selecione "Entrada"** no topo do modal

#### **Preenchimento dos Dados:**
```
┌─────────────────────────────────────┐
│ 📦 ENTRADA POR LOTES                │
├─────────────────────────────────────┤
│ Produto: Arroz Integral             │
│ Quantidade atual: 50 kg             │
├─────────────────────────────────────┤
│ [Entrada] [Saída] [Ajuste]          │
├─────────────────────────────────────┤
│ 🏷️ LOTE 1                           │
│                                     │
│ Nome do Lote: L001                  │
│ Quantidade: 25 kg                   │
│ Data Fabricação: 15/10/2024         │
│ Data Validade: 15/04/2025           │
│ Observações: Fornecedor ABC         │
│                                     │
│ [+ Adicionar Lote]                  │
│                                     │
│ [Salvar Movimento]                  │
└─────────────────────────────────────┘
```

### **3. Campos Obrigatórios vs Opcionais**

#### **✅ Obrigatórios:**
- **Nome do Lote**: Identificação única (ex: L001, Lote A, 230524)
- **Quantidade**: Quantidade a adicionar/retirar

#### **📝 Opcionais (mas recomendados):**
- **Data de Fabricação**: DD/MM/AAAA
- **Data de Validade**: DD/MM/AAAA
- **Observações**: Notas sobre fornecedor, qualidade, etc.

### **4. Exemplos Práticos**

#### **Exemplo 1: Entrada de Arroz**
```
Nome do Lote: ARR-001
Quantidade: 50 kg
Data Fabricação: 10/10/2024
Data Validade: 10/10/2025
Observações: Fornecedor XYZ - Nota Fiscal 12345
```

#### **Exemplo 2: Entrada de Medicamento**
```
Nome do Lote: MED-2024-001
Quantidade: 100 un
Data Fabricação: 01/09/2024
Data Validade: 01/09/2026
Observações: Laboratório ABC - Lote controlado
```

#### **Exemplo 3: Entrada de Leite**
```
Nome do Lote: LEITE-271024
Quantidade: 200 L
Data Fabricação: 25/10/2024
Data Validade: 01/11/2024
Observações: Refrigeração obrigatória
```

### **5. Indicadores Visuais**

Após cadastrar, os lotes aparecerão com cores indicativas:

- 🟢 **Verde**: Lote normal (mais de 7 dias para vencer)
- 🟠 **Laranja**: Próximo ao vencimento (7 dias ou menos)
- 🔴 **Vermelho**: Vencido
- ⚫ **Cinza**: Esgotado (quantidade zero)

### **6. Visualizar Lotes Cadastrados**

1. **Toque no produto** na lista principal
2. Verá a seção **"Lotes (X)"** com resumo
3. **Toque no produto novamente** para ver detalhes completos
4. Modal mostrará **todos os lotes** com:
   - Nome do lote
   - Quantidade disponível
   - Status de validade
   - Dias para vencimento

### **7. Saída por Lotes (FIFO)**

Para retirar produtos:
1. **Toque em "Movimentar"**
2. **Escolha "Com Lotes"**
3. **Selecione "Saída"**
4. Sistema mostrará **lotes disponíveis**
5. **Selecione quantidades** por lote
6. Sistema priorizará **lotes mais próximos do vencimento**

### **8. Dicas Importantes**

#### **✅ Boas Práticas:**
- Use **códigos padronizados** para lotes (ex: PRD-DDMMAA-001)
- **Sempre informe a data de validade** para produtos perecíveis
- Use **observações** para rastreabilidade
- **Confira as datas** antes de salvar

#### **⚠️ Atenção:**
- Datas devem estar no formato **DD/MM/AAAA**
- **Data de validade** deve ser posterior à fabricação
- **Nomes de lotes** devem ser únicos por produto
- Sistema impede **saída maior** que quantidade disponível

### **9. Resolução de Problemas**

#### **Erro: "Lote já existe"**
- Use um **nome diferente** para o lote
- Adicione **sufixo numérico** (ex: L001-A, L001-B)

#### **Erro: "Data inválida"**
- Verifique o **formato DD/MM/AAAA**
- Certifique-se que a **validade > fabricação**

#### **Não aparece opção de lotes**
- Produto pode não ser **perecível**
- Escolha **"Com Lotes"** manualmente
- Verifique se o **backend foi atualizado**

---

## 🎉 **Pronto!**

Agora você pode cadastrar lotes com controle completo de validade, garantindo:
- ✅ **Rastreabilidade** completa
- ✅ **Controle FIFO** automático  
- ✅ **Alertas de vencimento**
- ✅ **Histórico detalhado**

Para dúvidas, consulte a documentação técnica em `LOTES_README.md`