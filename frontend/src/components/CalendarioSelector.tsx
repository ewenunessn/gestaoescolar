import React from 'react';
import { Box } from '@mui/material';

// Importar apenas o calendário profissional
import CalendarioProfissional from './CalendarioProfissional';

interface EventoCalendario {
  id: number;
  titulo: string;
  tipo_evento: string;
  data_inicio: string;
  data_fim?: string;
  cor: string;
  descricao?: string;
  _refeicao?: any;
}

interface CalendarioSelectorProps {
  ano: number;
  mes: number;
  eventos: EventoCalendario[];
  onMesAnterior: () => void;
  onProximoMes: () => void;
  onDiaClick: (data: string) => void;
  onPdfClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

const CalendarioSelector: React.FC<CalendarioSelectorProps> = (props) => {
  return (
    <Box>
      {/* Renderizar apenas o calendário profissional */}
      <CalendarioProfissional {...props} />
    </Box>
  );
};

export default CalendarioSelector;