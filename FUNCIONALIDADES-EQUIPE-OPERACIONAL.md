# Funcionalidades para Equipe Operacional
## Sistema de Gestão de Alimentação Escolar

> **Foco:** Nutricionista, Coordenador de Logística e Auxiliares
> **Objetivo:** Ferramentas práticas para o dia a dia operacional

---

## 👥 Perfis de Usuário

### 1. Nutricionista
- Elaborar e aprovar cardápios
- Criar fichas técnicas de preparação
- Validar informações nutricionais
- Realizar testes de aceitabilidade
- Gerenciar restrições alimentares

### 2. Coordenador de Logística
- Planejar compras e contratos
- Gerar guias de demanda
- Acompanhar entregas
- Controlar estoque
- Gerenciar fornecedores

### 3. Auxiliares
- Registrar recebimentos
- Atualizar estoque
- Confirmar entregas
- Registrar ocorrências

---

## ✅ O QUE JÁ ESTÁ FUNCIONANDO

### Gestão Básica
- ✅ Cadastro de escolas
- ✅ Cadastro de modalidades de ensino
- ✅ Cadastro de produtos (com informações nutricionais)
- ✅ Cadastro de refeições
- ✅ Gestão de estoque escolar
- ✅ Cardápios com calendário visual

### Compras e Fornecedores
- ✅ Cadastro de fornecedores
- ✅ Gestão de contratos
- ✅ Pedidos de compra
- ✅ Saldo de contratos por modalidade

### Logística
- ✅ Guias de demanda
- ✅ Romaneio de entrega
- ✅ Gestão de rotas
- ✅ Comprovantes de entrega
- ✅ App mobile para entregadores

---

## 🎯 MELHORIAS PRIORITÁRIAS

### 🔴 PRIORIDADE ALTA - Nutricionista

#### 1. Gestão de Nutricionistas ✅ IMPLEMENTADO
- ✅ Cadastro de nutricionistas (nome, CRN, região CRN, especialidade)
- ✅ Vincular nutricionista responsável aos cardápios
- ✅ Data de aprovação do nutricionista
- ✅ Observações do nutricionista no cardápio
- ✅ Página de gerenciamento completa
- ✅ Filtros e busca de nutricionistas

#### 2. Fichas Técnicas Completas ✅ IMPLEMENTADO
**O que existe:**
- ✅ Lista de ingredientes com per capita
- ✅ Modo de preparo detalhado
- ✅ Tempo de preparo (minutos)
- ✅ Rendimento (número de porções)
- ✅ Utensílios necessários
- ✅ Categoria da refeição
- ✅ Informações nutricionais completas (calorias, proteínas, carboidratos, lipídios, fibras, sódio)
- ✅ Custo por porção
- ✅ Observações técnicas do nutricionista
- ✅ Aba "Ficha Técnica" na página de refeições
- ✅ Formulário de edição completo

**O que pode melhorar:**
```
❌ Cálculo automático de valor nutricional (baseado nos ingredientes)
❌ Cálculo automático de custo (baseado nos produtos)
❌ Impressão/exportação da ficha em PDF
```

**Benefício:** Padronização das preparações nas escolas

#### 3. Per Capita por Modalidade ⚠️ EM IMPLEMENTAÇÃO
**Necessidade:** Crianças de diferentes idades precisam de porções diferentes

**Exemplo:**
- Creche (0-3 anos): 80g de arroz
- Pré-escola (4-5 anos): 100g de arroz
- Fundamental I (6-10 anos): 120g de arroz
- Fundamental II (11-14 anos): 150g de arroz

**Solução:**
- Toggle para ativar ajustes por modalidade
- Se desativado: usa per capita padrão para todas
- Se ativado: permite ajustar para cada modalidade

#### 4. Validação Nutricional Básica
```
❌ Cálculo automático de calorias por refeição
❌ Soma de macronutrientes (proteínas, carboidratos, lipídios)
❌ Alertas de valores fora do recomendado
❌ Resumo nutricional do dia
❌ Resumo nutricional da semana
```

**Benefício:** Garantir adequação nutricional dos cardápios

#### 5. Controle de Frutas e Hortaliças
```
❌ Identificar produtos como frutas/hortaliças
❌ Calcular total de frutas/hortaliças por semana
❌ Alerta se não atingir 200g/aluno/semana
❌ Relatório semanal de frutas e hortaliças
```

**Benefício:** Cumprir recomendação de 200g/semana

#### 6. Teste de Aceitabilidade
```
❌ Formulário de teste de aceitabilidade
❌ Registro de testes por escola/refeição
❌ Cálculo automático do índice (mínimo 85%)
❌ Histórico de testes realizados
❌ Aprovação/reprovação de novos alimentos
```

**Benefício:** Validar novos alimentos antes de incluir no cardápio

---

### 🟡 PRIORIDADE MÉDIA - Logística

#### 7. Controle de Estoque Avançado
**O que existe:**
- ✅ Entrada e saída de produtos
- ✅ Saldo atual por escola

**O que falta:**
```
❌ Controle de lotes e validade
❌ Alertas de vencimento próximo (7, 15, 30 dias)
❌ Rastreabilidade (de onde veio, para onde foi)
❌ Registro de perdas e desperdícios
❌ Inventário periódico
❌ FIFO/FEFO automático (primeiro que vence, primeiro que sai)
```

**Benefício:** Reduzir desperdício e melhorar controle

#### 8. Planejamento de Compras Inteligente
```
❌ Sugestão automática de quantidades baseada em:
  - Histórico de consumo
  - Cardápios planejados
  - Estoque atual
  - Validade dos produtos
❌ Alertas de ruptura de estoque
❌ Previsão de demanda por período
```

**Benefício:** Comprar na quantidade certa, evitar faltas

#### 9. Gestão de Entregas Melhorada
**O que existe:**
- ✅ Romaneio de entrega
- ✅ Comprovante com assinatura

**O que falta:**
```
❌ Foto dos produtos entregues
❌ Registro de temperatura (produtos refrigerados)
❌ Registro de não conformidades na entrega
❌ Avaliação da qualidade dos produtos
❌ Devolução de produtos com problemas
```

**Benefício:** Garantir qualidade dos produtos entregues

---

### 🟢 PRIORIDADE BAIXA - Melhorias Gerais

#### 10. Restrições Alimentares
```
❌ Cadastro de alunos com restrições
❌ Tipos: alergia, intolerância, religião, vegetariano
❌ Alertas ao planejar cardápios
❌ Sugestões de substituições
❌ Relatório de alunos por tipo de restrição
```

**Benefício:** Atender necessidades especiais dos alunos

#### 11. Receitas e Banco de Preparações
```
❌ Biblioteca de receitas aprovadas
❌ Busca por ingredientes
❌ Filtros: tipo de refeição, tempo de preparo, custo
❌ Favoritos do nutricionista
❌ Compartilhamento entre nutricionistas
```

**Benefício:** Facilitar criação de novos cardápios

#### 12. Calendário Escolar
```
❌ Dias letivos por escola
❌ Feriados e recessos
❌ Eventos especiais
❌ Integração com cardápios
❌ Cálculo automático de dias de alimentação
```

**Benefício:** Planejamento mais preciso

---

## 📋 FUNCIONALIDADES QUE NÃO SÃO NECESSÁRIAS

### ❌ Removido do Escopo (Fiscalização/Prestação de Contas)

1. **Relatórios FNDE**
   - Demonstrativo Sintético Anual
   - Relatório de Execução Físico-Financeira
   - Exportação em formato FNDE

2. **Conselho de Alimentação Escolar (CAE)**
   - Portal do CAE
   - Registro de fiscalizações
   - Pareceres e atas

3. **Controle Financeiro Detalhado**
   - Repasses do FNDE
   - Conciliação bancária
   - Empenhos e liquidações

4. **Chamadas Públicas AF**
   - Gestão de chamadas públicas
   - Projetos de venda
   - Análise de propostas

5. **Certificações e Laudos**
   - Certificados sanitários
   - Análises laboratoriais
   - Laudos de qualidade

**Motivo:** Essas funcionalidades são para fiscalização externa e prestação de contas, não para operação do dia a dia.

---

## 🎯 ROADMAP OPERACIONAL

### Fase 1 - Nutrição (1-2 semanas)
1. ✅ Cadastro de nutricionistas
2. ✅ Fichas técnicas completas
3. ⚠️ Per capita por modalidade (em andamento)
4. ❌ Validação nutricional básica

### Fase 2 - Cardápios (2-3 semanas)
5. ❌ Controle de frutas e hortaliças
6. ❌ Teste de aceitabilidade
7. ❌ Restrições alimentares

### Fase 3 - Logística (3-4 semanas)
8. ❌ Estoque com lotes e validade
9. ❌ Planejamento de compras inteligente
10. ❌ Melhorias nas entregas

### Fase 4 - Extras (opcional)
11. ❌ Banco de receitas
12. ❌ Calendário escolar

---

## 💡 PRÓXIMOS PASSOS IMEDIATOS

### 1. Finalizar Per Capita por Modalidade
- Criar componente de ajuste por modalidade
- Integrar com página de refeições
- Atualizar cálculo de demanda

### 2. Completar Fichas Técnicas
- Adicionar campos: modo de preparo, tempo, rendimento, utensílios
- Melhorar layout da aba "Ficha Técnica"
- Permitir impressão da ficha

### 3. Validação Nutricional
- Calcular totais nutricionais por refeição
- Mostrar resumo do dia no calendário
- Alertas de valores inadequados

---

## ✅ CONCLUSÃO

**Foco da equipe operacional:**
- ✅ Planejar cardápios nutricionalmente adequados
- ✅ Gerenciar compras e estoque eficientemente
- ✅ Garantir entregas de qualidade
- ✅ Padronizar preparações nas escolas
- ✅ Atender necessidades especiais dos alunos

**Não é necessário:**
- ❌ Relatórios para FNDE
- ❌ Portal de fiscalização
- ❌ Controle financeiro detalhado
- ❌ Gestão de chamadas públicas

**Resultado:** Sistema mais simples, focado e eficiente para o dia a dia da equipe.
