# 📅 Guia Rápido - Calendário Letivo

## 🚀 Início Rápido

### 1. Aplicar a Configuração Inicial

Execute este comando no terminal:

```bash
node backend/migrations/aplicar-calendario-letivo.js
```

Isso irá criar:
- ✅ Tabelas no banco de dados
- ✅ Calendário de 2024 com 200 dias letivos
- ✅ Feriados nacionais de 2024
- ✅ 4 bimestres configurados
- ✅ Eventos de exemplo

### 2. Acessar o Calendário

1. Faça login no sistema
2. No menu lateral, clique em **Configurações**
3. Clique em **Calendário Letivo**

## 📖 Como Usar

### Visualizar o Calendário

- Use as **setas ◀ ▶** para navegar entre meses
- **Clique em um dia** para ver os eventos daquele dia
- Veja as **cores** para identificar tipos de eventos:
  - 🟢 Verde = Dia letivo
  - 🔴 Vermelho = Feriado
  - 🟡 Amarelo = Recesso
  - 🔵 Azul = Evento escolar

### Criar um Novo Evento

1. Clique no botão **"Novo Evento"**
2. Preencha:
   - **Título**: Nome do evento
   - **Tipo**: Escolha o tipo (feriado, evento escolar, etc)
   - **Data Início**: Quando começa
   - **Data Fim**: Quando termina (opcional)
   - **Descrição**: Detalhes do evento (opcional)
   - **É dia letivo?**: Marque se for dia de aula
3. Clique em **"Salvar"**

### Importar Feriados Nacionais

1. Clique no ícone **⋮** (três pontos)
2. Selecione **"Importar Feriados Nacionais"**
3. Os feriados do ano serão adicionados automaticamente

### Ver Estatísticas

No card lateral você verá:
- **Total de Dias Letivos**: Quantos dias de aula estão programados
- **Mínimo Obrigatório**: 200 dias (LDB)
- **Diferença**: Se está acima ou abaixo do mínimo

## 💡 Dicas

### Tipos de Eventos

- **Feriado Nacional**: Feriados oficiais do Brasil
- **Feriado Escolar**: Feriados específicos da escola/município
- **Evento Escolar**: Festas, apresentações, etc
- **Recesso**: Férias escolares
- **Reunião Pedagógica**: Reuniões de professores
- **Avaliação**: Provas, avaliações
- **Outros**: Qualquer outro tipo de evento

### Dias Letivos

- Por padrão, segunda a sexta são dias letivos
- Sábados e domingos NÃO são dias letivos
- Feriados NÃO são dias letivos
- Você pode marcar qualquer dia como letivo ao criar um evento

### Períodos Avaliativos

Os bimestres já estão configurados:
- 1º Bimestre: Fevereiro a Abril
- 2º Bimestre: Maio a Julho
- 3º Bimestre: Agosto a Setembro
- 4º Bimestre: Outubro a Dezembro

## ❓ Perguntas Frequentes

### Como adicionar um sábado letivo?

1. Crie um novo evento
2. Escolha o tipo "Evento Escolar"
3. Marque a opção "É dia letivo"
4. Selecione o sábado desejado

### Como marcar um feriado municipal?

1. Crie um novo evento
2. Escolha o tipo "Feriado Escolar"
3. Preencha o nome do feriado
4. Desmarque "É dia letivo"

### Como adicionar férias/recesso?

1. Crie um novo evento
2. Escolha o tipo "Recesso"
3. Defina data de início e fim
4. Desmarque "É dia letivo"

### Posso ter mais de um calendário?

Sim, mas apenas um pode estar ativo por vez. Você pode criar calendários para anos diferentes.

### Como alterar o número mínimo de dias letivos?

Ao criar ou editar um calendário, você pode definir o total de dias letivos obrigatórios (padrão: 200).

## 🎯 Casos de Uso Comuns

### Cenário 1: Início do Ano Letivo

1. Crie um calendário para o ano
2. Importe os feriados nacionais
3. Adicione feriados municipais
4. Adicione recessos (julho, dezembro)
5. Verifique se atingiu 200 dias letivos

### Cenário 2: Compensação de Feriado

1. Identifique o feriado que será compensado
2. Crie um evento "Dia Letivo" no sábado de compensação
3. Marque como "É dia letivo"

### Cenário 3: Evento Especial

1. Crie um evento do tipo "Evento Escolar"
2. Defina se será dia letivo ou não
3. Adicione descrição com detalhes

## 📊 Exemplo de Calendário Completo

```
Fevereiro 2024
- 05/02: Início do Ano Letivo (dia letivo)
- 13-14/02: Carnaval (feriado)

Março 2024
- 29/03: Sexta-feira Santa (feriado)

Abril 2024
- 21/04: Tiradentes (feriado)
- 30/04: Fim do 1º Bimestre

Maio 2024
- 01/05: Dia do Trabalho (feriado)

Julho 2024
- 14/07: Fim do 2º Bimestre
- 15-31/07: Recesso Escolar

Agosto 2024
- 01/08: Início do 3º Bimestre

Setembro 2024
- 07/09: Independência (feriado)
- 30/09: Fim do 3º Bimestre

Outubro 2024
- 12/10: Nossa Senhora Aparecida (feriado)

Novembro 2024
- 02/11: Finados (feriado)
- 15/11: Proclamação da República (feriado)

Dezembro 2024
- 20/12: Fim do Ano Letivo
- 25/12: Natal (feriado)
```

## 🆘 Suporte

Se tiver dúvidas ou problemas:
1. Verifique se a migration foi aplicada corretamente
2. Verifique se o calendário está ativo
3. Consulte a documentação completa em `CALENDARIO_LETIVO_IMPLEMENTADO.md`

---

**Versão**: 1.0.0  
**Última Atualização**: 17/03/2026
