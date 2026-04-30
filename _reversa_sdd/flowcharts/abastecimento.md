# Fluxograma - Modulo abastecimento

Confianca: CONFIRMADO, exceto onde indicado.

```mermaid
flowchart TD
  A["Usuario abre /abastecimento"] --> B["React monta componente Abastecimento"]
  B --> C["Define titulo da pagina: Abastecimento"]
  C --> D["Inicia carregarResumo"]
  D --> E["Promise.allSettled: guias, pedidos, entregas"]
  E --> F{"Componente ainda ativo?"}
  F -- "Nao" --> Z["Abortar atualizacao de estado"]
  F -- "Sim" --> G["Processa resultado de guias"]
  G --> H["Processa resultado de pedidos"]
  H --> I["Processa resultado de entregas"]
  I --> J["Atualiza errors e loading=false"]
  J --> K["Calcula metricas com useMemo"]
  K --> L["Renderiza cabecalho, metricas, fluxo e listas"]
  L --> M{"Usuario clica em atalho ou item?"}
  M -- "Guia demanda" --> N["navigate('/guias-demanda')"]
  M -- "Compra/pedido" --> O["navigate('/compras') ou /compras/:id"]
  M -- "Entrega" --> P["navigate('/entregas')"]
  M -- "Documentos" --> Q["navigate('/romaneio') ou /comprovantes-entrega"]
  M -- "Rota" --> R["navigate('/gestao-rotas')"]
```

## Observacoes

- A pagina nao persiste dados diretamente.
- A pagina tolera falhas parciais de API.
- A ordem operacional exibida e guia -> compra -> entrega -> documentos.
