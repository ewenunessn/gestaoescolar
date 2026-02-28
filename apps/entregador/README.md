# App de Entregas

Aplicativo web profissional para gestão de rotas de entrega e escolas, construído com Vite + React + TypeScript. PWA-ready e pronto para integrar com o backend existente.

## Requisitos
- Node 18+
- Backend acessível (ex.: https://gestaoescolar-backend.vercel.app)

## Instalação

```bash
cd apps/entregador
npm install
```

## Execução

```bash
# Configure a URL do backend (opcional)
echo VITE_API_URL=https://gestaoescolar-backend.vercel.app > .env

npm run dev
```

Acesse http://localhost:5174

## Build

```bash
npm run build
npm run preview
```

## Funcionalidades
- Listagem de rotas com status e total de escolas
- Detalhe da rota com escolas em ordem de visita
- Seleção de itens para entrega com quantidades personalizadas
- Entregas parciais: você pode entregar quantidade diferente da programada
- Confirmação de entregas com dados do recebedor
- Visualização de itens já entregues com histórico e indicador de entrega parcial
- Abas separadas para itens pendentes e entregues
- Suporte offline completo com sincronização automática
- Indicador de status de conexão e fila de sincronização
- Cache local de dados para acesso offline

## Entregas Parciais

O sistema permite entregas com quantidades diferentes da programada:

- **Exemplo**: Item programado com 50 unidades
  - Você pode entregar 40 unidades
  - O sistema registra exatamente o que foi entregue (40)
  - Na aba "Entregues", aparece um badge "PARCIAL" indicando a diferença
  - Mostra claramente: "Entregue: 40 kg" e "Programado: 50 kg"

### Como Fazer Entrega Parcial

1. Selecione o item na aba "Pendentes"
2. Altere a quantidade no campo que aparece
3. O sistema avisa antes de confirmar se a quantidade é diferente
4. Após confirmar, o item vai para "Entregues" com indicador de parcial

## Modo Offline

O aplicativo funciona completamente offline:

1. **Cache Automático**: Dados das escolas e itens são salvos automaticamente no navegador
2. **Fila de Sincronização**: Entregas realizadas offline são armazenadas em fila local
3. **Sincronização Automática**: Quando a conexão é restaurada, as entregas são sincronizadas automaticamente
4. **Indicador Visual**: Mostra status da conexão e quantidade de entregas pendentes
5. **Sincronização Manual**: Botão para forçar sincronização quando necessário

### Como Usar Offline

1. Acesse o app enquanto estiver online para carregar os dados
2. Os dados ficam salvos no navegador
3. Mesmo sem internet, você pode:
   - Ver as rotas e escolas
   - Selecionar itens para entrega
   - Confirmar entregas (ficam na fila)
4. Quando voltar a ter internet:
   - O app detecta automaticamente
   - Sincroniza as entregas pendentes
   - Mostra confirmação de sucesso

### Testando o Modo Offline

1. Abra o app no navegador
2. Abra as Ferramentas do Desenvolvedor (F12)
3. Vá em "Network" (Rede)
4. Marque "Offline"
5. Teste fazer entregas - elas ficarão na fila
6. Desmarque "Offline" para sincronizar

## Próximos Passos (sugestão)
- Autenticação JWT integrada ao backend
- Mapa e otimização de rota (OSRM/Mapbox)
- Notificações push para novas rotas
