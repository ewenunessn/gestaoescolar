# Integração com Open Food Facts - Banco de Dados Global de Alimentos

## ✅ Implementado

### Backend
- ✅ Serviço Open Food Facts (`backend/src/services/tacoService.ts`)
- ✅ Controller (`backend/src/controllers/tacoController.ts`)
- ✅ Rotas (`backend/src/routes/tacoRoutes.ts`)
- ✅ Cache de 1 hora para otimizar requisições
- ✅ Transformação de dados para formato do sistema

### Frontend
- ✅ Serviço de API (`frontend/src/services/taco.ts`)
- ✅ Componente Autocomplete (`frontend/src/components/TacoAutocomplete.tsx`)
- ✅ Debounce de 500ms para otimizar buscas
- ✅ Loading states e feedback visual
- ✅ Integrado no formulário de produtos

---

## 🌟 Por que Open Food Facts?

### Vantagens sobre TACO
- ✅ **2.5 milhões+** de produtos (vs ~600 da TACO)
- ✅ **Produtos brasileiros reais** com marcas
- ✅ **Totalmente gratuita** e open source
- ✅ **API estável** e bem mantida
- ✅ **Sem necessidade de API key**
- ✅ **Dados em português** do Brasil
- ✅ **Produtos industrializados** incluídos
- ✅ **Dados nutricionais completos**
- ✅ **Comunidade ativa** atualizando dados

### Exemplos de Produtos
- Arroz Camil, Tio João, Urbano
- Feijão Kicaldo, Camil
- Leite Nestlé, Parmalat, Itambé
- Biscoitos, massas, enlatados
- Produtos frescos e in natura

---

## 🎯 Como Usar

### 1. No Dialog de Criação de Produtos

O componente já está integrado! Basta:

1. Clicar em "Novo Produto"
2. Digitar o nome no campo de busca verde
3. Selecionar o produto da lista
4. Os campos são preenchidos automaticamente
5. Editar o que precisar
6. Salvar

```tsx
<TacoAutocomplete 
  onSelect={(food: TacoFood) => {
    setFormData({
      ...formData,
      nome: food.nome,
      categoria: food.categoria,
      descricao: `${food.nome} - Fonte: Open Food Facts`,
      unidade: 'Quilograma'
    });
  }}
  label="Buscar alimento (Open Food Facts)"
  placeholder="Digite o nome do alimento ou produto"
/>
```

---

## 📊 Dados Disponíveis

Cada alimento retornado contém:

```typescript
interface TacoFood {
  id: number;
  nome: string;              // Nome + Marca
  categoria: string;         // Categoria do produto
  energia_kcal: number;      // Calorias por 100g
  proteinas: number;         // Proteínas (g/100g)
  lipidios: number;          // Gorduras (g/100g)
  carboidratos: number;      // Carboidratos (g/100g)
  fibras: number;            // Fibras (g/100g)
  calcio: number;            // Cálcio (mg/100g)
  magnesio: number;          // Magnésio (mg/100g)
  fosforo: number;           // Fósforo (mg/100g)
  ferro: number;             // Ferro (mg/100g)
  sodio: number;             // Sódio (mg/100g)
  potassio: number;          // Potássio (mg/100g)
  zinco: number;             // Zinco (mg/100g)
  vitamina_c: number;        // Vitamina C (mg/100g)
}
```

---

## 🔧 Endpoints da API

### Buscar Alimentos
```
GET /api/taco/search?q=arroz
```

**Resposta:**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "id": 7891234567890,
      "nome": "Arroz Branco Tipo 1 - Tio João",
      "categoria": "Cereais e derivados",
      "energia_kcal": 360,
      "proteinas": 7.2,
      "lipidios": 0.6,
      "carboidratos": 79.8,
      ...
    }
  ]
}
```

### Buscar por Código de Barras
```
GET /api/taco/7891234567890
```

### Limpar Cache
```
POST /api/taco/clear-cache
```

---

## 💡 Funcionalidades

### Autocomplete Inteligente
- ✅ Busca em tempo real com debounce (500ms)
- ✅ Mostra nome completo com marca
- ✅ Exibe categoria do produto
- ✅ Chip com calorias destacado
- ✅ Informações nutricionais resumidas
- ✅ Loading indicator durante busca
- ✅ Mensagens de feedback claras

### Cache Otimizado
- ✅ Cache de 1 hora no backend
- ✅ Reduz chamadas à API externa
- ✅ Melhora performance significativamente
- ✅ Endpoint para limpar cache manualmente

### UX Aprimorada
- ✅ Mínimo 2 caracteres para buscar
- ✅ Máximo 20 resultados por busca
- ✅ Ícone de restaurante no campo
- ✅ Visual limpo e organizado
- ✅ Destaque visual para calorias
- ✅ Categorias em português

---

## 🎨 Exemplo Visual

Quando o usuário digita "arroz", aparece:

```
┌─────────────────────────────────────────────────────────┐
│ 🍽️ Buscar alimento (Open Food Facts)                   │
│ arroz                                              🔄   │
└─────────────────────────────────────────────────────────┘
  ┌───────────────────────────────────────────────────────┐
  │ Arroz Branco Tipo 1 - Tio João      [360 kcal]       │
  │ Cereais • Prot: 7.2g • Carb: 79.8g • Lip: 0.6g       │
  ├───────────────────────────────────────────────────────┤
  │ Arroz Integral - Camil              [370 kcal]       │
  │ Cereais • Prot: 8.0g • Carb: 77.5g • Lip: 2.7g       │
  ├───────────────────────────────────────────────────────┤
  │ Arroz Parboilizado - Urbano         [358 kcal]       │
  │ Cereais • Prot: 7.5g • Carb: 78.2g • Lip: 0.8g       │
  └───────────────────────────────────────────────────────┘
```

Ao clicar, preenche automaticamente:
- Nome: "Arroz Branco Tipo 1 - Tio João"
- Categoria: "Cereais e derivados"
- Descrição: "Arroz Branco Tipo 1 - Tio João - Fonte: Open Food Facts"
- Unidade: "Quilograma" (editável)

---

## 🚀 Próximos Passos

1. ✅ **Integrado no Dialog de Produtos**
2. 🔄 **Adicionar ao Dialog de Refeições**
   - Usar para buscar ingredientes
   - Calcular valores nutricionais automaticamente
3. 🔄 **Melhorias Futuras**
   - Adicionar busca por código de barras
   - Salvar alimentos favoritos
   - Histórico de buscas recentes
   - Filtros por categoria
   - Ordenação por relevância

---

## 📝 Notas Técnicas

### API Open Food Facts
- **URL Base**: https://br.openfoodfacts.org
- **Documentação**: https://openfoodfacts.github.io/openfoodfacts-server/api/
- **Licença**: Open Database License (ODbL)
- **Dados**: Contribuídos pela comunidade
- **Atualização**: Contínua
- **Idioma**: Suporta português brasileiro

### Performance
- Timeout de 10 segundos para busca
- Cache de 1 hora por termo de busca
- Debounce de 500ms no frontend
- Limite de 20 resultados por busca
- Campos otimizados na requisição

### Tratamento de Erros
- Timeout gracioso
- Fallback para lista vazia
- Logs detalhados no console
- Mensagens amigáveis ao usuário

---

## 🐛 Troubleshooting

### API não responde
- ✅ Verificar conexão com internet
- ✅ API pode estar temporariamente lenta
- ✅ Timeout configurado para 10 segundos
- ✅ Limpar cache: `POST /api/taco/clear-cache`

### Nenhum resultado
- ✅ Verificar se digitou pelo menos 2 caracteres
- ✅ Tentar termos mais genéricos (ex: "arroz" ao invés de "arroz integral tipo 1")
- ✅ Verificar ortografia
- ✅ Produto pode não estar no banco

### Resultados estranhos
- ✅ Open Food Facts é colaborativo
- ✅ Alguns produtos podem ter dados incompletos
- ✅ Sempre revisar antes de salvar
- ✅ Editar campos conforme necessário

### Performance lenta
- ✅ Cache está ativo (1 hora)
- ✅ Debounce evita muitas requisições
- ✅ API pode estar sob carga
- ✅ Considerar aumentar timeout se necessário

---

## 🔗 Links Úteis

- [Open Food Facts](https://br.openfoodfacts.org/)
- [Documentação da API](https://openfoodfacts.github.io/openfoodfacts-server/api/)
- [Contribuir com dados](https://br.openfoodfacts.org/contribuir)
- [App Mobile](https://br.openfoodfacts.org/open-food-facts-mobile-app)

---

## 📈 Estatísticas

- **Produtos no Brasil**: 100.000+
- **Produtos globais**: 2.5 milhões+
- **Contribuidores**: 30.000+
- **Países**: 180+
- **Idiomas**: 100+
- **Atualizações**: Diárias

---

## ✨ Benefícios para o Sistema

1. **Cadastro Rápido**: Produtos em segundos
2. **Dados Confiáveis**: Informações nutricionais verificadas
3. **Marcas Reais**: Produtos que as escolas realmente compram
4. **Sem Custo**: API totalmente gratuita
5. **Sempre Atualizado**: Comunidade mantém dados frescos
6. **Escalável**: Suporta milhões de requisições
