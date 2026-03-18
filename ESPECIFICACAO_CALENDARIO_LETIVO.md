# Especificação: Sistema de Calendário Letivo

## Visão Geral
Sistema centralizado de gestão do calendário escolar que serve como base para todos os outros calendários do sistema (cardápios, entregas, programações, etc.).

## Inspiração
- Google Calendar (interface e usabilidade)
- Sistemas acadêmicos (Moodle, Canvas)
- Software de gestão escolar (iEducar, SIGE)

## Funcionalidades Principais

### 1. Tipos de Eventos

#### 1.1 Dias Letivos
- **Padrão**: Segunda a sexta-feira são dias letivos
- **Exceções**: Possibilidade de marcar sábado/domingo como letivo
- **Contador**: Exibir total de dias letivos no período

#### 1.2 Feriados
- **Nacionais**: Carnaval, Páscoa, Tiradentes, Trabalho, etc.
- **Estaduais**: Específicos de cada estado
- **Municipais**: Específicos de cada município
- **Escolares**: Ponto facultativo, recesso escolar
- **Importação**: Possibilidade de importar feriados automaticamente

#### 1.3 Eventos Escolares
- **Início/Fim do ano letivo**
- **Início/Fim de bimestres/trimestres/semestres**
- **Reuniões pedagógicas**
- **Conselhos de classe**
- **Formações de professores**
- **Eventos culturais** (festa junina, dia das crianças, etc.)
- **Provas/Avaliações**
- **Entrega de boletins**
- **Matrícula/Rematrícula**

#### 1.4 Recessos e Férias
- **Férias escolares** (julho, dezembro/janeiro)
- **Recesso** (carnaval, corpus christi, etc.)
- **Suspensão de aulas** (greve, problemas estruturais, etc.)

### 2. Interface do Calendário

#### 2.1 Visualizações
- **Mensal**: Visão geral do mês (padrão)
- **Semanal**: Detalhes da semana
- **Anual**: Visão panorâmica do ano letivo
- **Lista**: Eventos em formato de lista

#### 2.2 Elementos Visuais
- **Cores por tipo de evento**:
  - Verde: Dias letivos normais
  - Azul: Eventos escolares
  - Vermelho: Feriados
  - Laranja: Recessos/Férias
  - Roxo: Reuniões/Formações
  - Cinza: Finais de semana não letivos
  
- **Badges/Indicadores**:
  - Número de eventos no dia
  - Ícones por tipo de evento
  - Destaque para dia atual

#### 2.3 Interações
- **Clique no dia**: Abre modal com detalhes e eventos
- **Arrastar e soltar**: Mover eventos entre dias
- **Clique duplo**: Criar novo evento
- **Hover**: Preview rápido dos eventos

### 3. Gestão de Eventos

#### 3.1 Criar Evento
- **Campos obrigatórios**:
  - Título
  - Tipo de evento
  - Data (início e fim)
  - Descrição
  
- **Campos opcionais**:
  - Horário
  - Local
  - Responsável
  - Observações
  - Anexos
  - Cor personalizada
  - Notificações

#### 3.2 Editar/Excluir Evento
- Permissões por perfil
- Histórico de alterações
- Confirmação antes de excluir

#### 3.3 Eventos Recorrentes
- Diário
- Semanal (ex: toda segunda-feira)
- Mensal (ex: primeira sexta de cada mês)
- Anual (ex: aniversário da escola)

### 4. Configurações do Ano Letivo

#### 4.1 Dados Básicos
- Ano letivo
- Data de início
- Data de término
- Total de dias letivos obrigatórios (200 dias)
- Divisão do ano (bimestres, trimestres, semestres)

#### 4.2 Dias da Semana Letivos
- Configurar quais dias são letivos (padrão: seg-sex)
- Possibilidade de ter sábados letivos
- Turnos de funcionamento

#### 4.3 Períodos Avaliativos
- Definir datas de início/fim de cada período
- Datas de entrega de notas
- Datas de recuperação

### 5. Integração com Outros Módulos

#### 5.1 Cardápios
- Cardápios só podem ser criados em dias letivos
- Ao marcar dia como não letivo, alertar sobre cardápios existentes
- Sugerir redistribuição de cardápios

#### 5.2 Entregas
- Programação de entregas considera dias letivos
- Evitar entregas em feriados/recessos
- Alertas de conflitos

#### 5.3 Compras e Planejamento
- Cálculo de quantidades baseado em dias letivos
- Previsão de demanda por período

#### 5.4 Relatórios
- Relatório de dias letivos cumpridos
- Relatório de eventos realizados
- Estatísticas do ano letivo

### 6. Funcionalidades Avançadas

#### 6.1 Templates de Calendário
- Salvar configuração de ano letivo como template
- Aplicar template em novo ano
- Biblioteca de templates (municipal, estadual, federal)

#### 6.2 Importação/Exportação
- Importar feriados de APIs públicas
- Exportar calendário para PDF
- Exportar para iCal/Google Calendar
- Importar eventos de planilha Excel

#### 6.3 Notificações
- Lembrete de eventos próximos
- Notificação de alterações no calendário
- Alertas de dias letivos insuficientes

#### 6.4 Permissões
- Visualizar: Todos
- Criar eventos: Coordenação, Direção
- Editar/Excluir: Apenas criador ou administrador
- Configurar ano letivo: Apenas administrador

### 7. Validações e Regras

#### 7.1 Dias Letivos
- Mínimo de 200 dias letivos por ano (LDB)
- Alerta quando próximo do mínimo
- Contador em tempo real

#### 7.2 Conflitos
- Não permitir eventos conflitantes no mesmo horário
- Alertar sobre sobreposição de eventos importantes
- Validar datas dentro do ano letivo

#### 7.3 Dependências
- Ao excluir dia letivo, verificar impactos
- Ao alterar período, atualizar eventos relacionados

## Estrutura de Dados

### Tabela: calendario_letivo
```sql
CREATE TABLE calendario_letivo (
  id SERIAL PRIMARY KEY,
  ano_letivo INTEGER NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  total_dias_letivos_obrigatório INTEGER DEFAULT 200,
  divisao_ano VARCHAR(20) DEFAULT 'bimestral', -- bimestral, trimestral, semestral
  dias_semana_letivos JSONB DEFAULT '["seg","ter","qua","qui","sex"]',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela: eventos_calendario
```sql
CREATE TABLE eventos_calendario (
  id SERIAL PRIMARY KEY,
  calendario_letivo_id INTEGER REFERENCES calendario_letivo(id),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo_evento VARCHAR(50) NOT NULL, -- letivo, feriado, evento_escolar, recesso, reuniao
  data_inicio DATE NOT NULL,
  data_fim DATE,
  hora_inicio TIME,
  hora_fim TIME,
  local VARCHAR(255),
  responsavel VARCHAR(255),
  cor VARCHAR(7), -- hex color
  recorrente BOOLEAN DEFAULT false,
  recorrencia_config JSONB, -- {tipo: 'semanal', intervalo: 1, dias: ['seg','qua']}
  observacoes TEXT,
  anexos JSONB,
  criado_por INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela: periodos_avaliativos
```sql
CREATE TABLE periodos_avaliativos (
  id SERIAL PRIMARY KEY,
  calendario_letivo_id INTEGER REFERENCES calendario_letivo(id),
  nome VARCHAR(100) NOT NULL, -- 1º Bimestre, 2º Trimestre, etc
  numero_periodo INTEGER NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  data_entrega_notas DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela: dias_letivos_excecoes
```sql
CREATE TABLE dias_letivos_excecoes (
  id SERIAL PRIMARY KEY,
  calendario_letivo_id INTEGER REFERENCES calendario_letivo(id),
  data DATE NOT NULL,
  eh_letivo BOOLEAN NOT NULL, -- true = tornar letivo, false = tornar não letivo
  motivo VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Fluxo de Uso

1. **Configuração Inicial**
   - Administrador cria novo ano letivo
   - Define datas de início e fim
   - Configura divisão do ano (bimestres, etc.)
   - Importa feriados nacionais/estaduais/municipais

2. **Planejamento**
   - Adiciona eventos escolares importantes
   - Define períodos avaliativos
   - Marca recessos e férias
   - Ajusta dias letivos conforme necessário

3. **Uso Contínuo**
   - Consulta calendário para planejamento
   - Adiciona eventos conforme surgem
   - Monitora contador de dias letivos
   - Recebe notificações de eventos próximos

4. **Integração**
   - Outros módulos consultam calendário
   - Validações automáticas baseadas em dias letivos
   - Relatórios consolidados

## Próximos Passos de Implementação

1. Criar migrations para tabelas
2. Implementar backend (controllers, services, routes)
3. Criar interface do calendário (frontend)
4. Implementar CRUD de eventos
5. Adicionar validações e regras de negócio
6. Integrar com módulos existentes
7. Implementar importação de feriados
8. Criar relatórios e dashboards
