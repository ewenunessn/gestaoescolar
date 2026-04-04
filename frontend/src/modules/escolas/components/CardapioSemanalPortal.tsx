import React, { useMemo, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  LocalCafe as CafeIcon,
  LunchDining as LunchIcon,
  RestaurantMenu as DinnerIcon,
  Cookie as SnackIcon
} from '@mui/icons-material';
import { carregarTiposRefeicao } from '../../../services/cardapiosModalidade';

interface CardapioItem {
  id: number;
  dia: number;
  mes: number;
  ano: number;
  modalidade_id: number;
  modalidade_nome: string;
  refeicoes: Array<{
    id: number;
    nome: string;
    tipo_refeicao?: string;
  }>;
}

interface CardapioSemanalPortalProps {
  cardapios: CardapioItem[];
}

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const TIPOS_REFEICAO_ICONS: Record<string, React.ReactElement> = {
  'refeicao': <LunchIcon />,
  'lanche': <SnackIcon />,
  'cafe_manha': <CafeIcon />,
  'ceia': <DinnerIcon />,
  'almoco': <LunchIcon />,
  'lanche_manha': <SnackIcon />,
  'lanche_tarde': <SnackIcon />,
  'jantar': <DinnerIcon />
};

const CardapioSemanalPortal: React.FC<CardapioSemanalPortalProps> = ({ cardapios }) => {
  const [tiposRefeicaoDinamicos, setTiposRefeicaoDinamicos] = useState<Array<{
    key: string;
    label: string;
    icon: React.ReactElement;
  }>>([]);

  // Carregar tipos de refeição do banco
  useEffect(() => {
    const carregarTipos = async () => {
      try {
        const tipos = await carregarTiposRefeicao();
        const tiposFormatados = Object.entries(tipos).map(([key, label]) => ({
          key,
          label: label as string,
          icon: TIPOS_REFEICAO_ICONS[key] || <RestaurantIcon />
        }));
        setTiposRefeicaoDinamicos(tiposFormatados);
      } catch (err) {
        console.error('Erro ao carregar tipos de refeição:', err);
        // Fallback para tipos padrão
        setTiposRefeicaoDinamicos([
          { key: 'cafe_manha', label: 'Café da Manhã', icon: <CafeIcon /> },
          { key: 'lanche', label: 'Lanche', icon: <SnackIcon /> },
          { key: 'refeicao', label: 'Refeição', icon: <LunchIcon /> },
          { key: 'ceia', label: 'Ceia', icon: <DinnerIcon /> }
        ]);
      }
    };
    carregarTipos();
  }, []);

  // Organizar cardápios por dia da semana (apenas dias úteis: Segunda a Sábado)
  const diasUteis = useMemo(() => {
    if (!cardapios || cardapios.length === 0) return [];

    // Filtrar apenas dias úteis (Segunda=1 a Sábado=6)
    const diasFiltrados = cardapios
      .filter(c => c && c.ano && c.mes && c.dia) // Verificar se os dados existem
      .map(c => {
        const data = new Date(c.ano, c.mes - 1, c.dia);
        return { ...c, data, diaSemana: data.getDay() };
      })
      .filter(c => c.diaSemana >= 1 && c.diaSemana <= 6)
      .sort((a, b) => a.data.getTime() - b.data.getTime());

    return diasFiltrados;
  }, [cardapios]);

  // Agrupar refeições por dia e tipo
  const refeicoesOrganizadas = useMemo(() => {
    const organizacao: Record<string, Record<string, any[]>> = {};

    diasUteis.forEach(cardapio => {
      const dataKey = `${cardapio.ano}-${cardapio.mes}-${cardapio.dia}`;
      
      if (!organizacao[dataKey]) {
        organizacao[dataKey] = {};
      }

      // Verificar se refeicoes existe e é um array
      if (cardapio.refeicoes && Array.isArray(cardapio.refeicoes)) {
        cardapio.refeicoes.forEach(refeicao => {
          const tipo = refeicao.tipo_refeicao || 'refeicao';
          if (!organizacao[dataKey][tipo]) {
            organizacao[dataKey][tipo] = [];
          }
          organizacao[dataKey][tipo].push(refeicao);
        });
      }
    });

    return organizacao;
  }, [diasUteis]);

  // Filtrar apenas tipos de refeição que têm pelo menos uma preparação
  const tiposComPreparacoes = useMemo(() => {
    const tiposUsados = new Set<string>();
    
    Object.values(refeicoesOrganizadas).forEach(refeicoesNoDia => {
      Object.keys(refeicoesNoDia).forEach(tipo => {
        if (refeicoesNoDia[tipo].length > 0) {
          tiposUsados.add(tipo);
        }
      });
    });

    return tiposRefeicaoDinamicos.filter(tipo => tiposUsados.has(tipo.key));
  }, [refeicoesOrganizadas, tiposRefeicaoDinamicos]);

  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${hoje.getMonth() + 1}-${hoje.getDate()}`;

  if (!cardapios || cardapios.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
        Nenhum cardápio cadastrado para esta semana
      </Typography>
    );
  }

  if (tiposRefeicaoDinamicos.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
        Carregando tipos de refeição...
      </Typography>
    );
  }

  if (diasUteis.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
        Nenhum cardápio para dias úteis nesta semana
      </Typography>
    );
  }

  if (tiposComPreparacoes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
        Nenhuma preparação cadastrada para esta semana
      </Typography>
    );
  }

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        borderRadius: 2, 
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      {/* Tabela: Linhas = Tipos de Refeição, Colunas = Dias da Semana */}
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'table', width: '100%', minWidth: 800 }}>
          {/* Cabeçalho da tabela - Dias da semana */}
          <Box sx={{ 
            display: 'table-row',
            bgcolor: 'grey.100',
            fontWeight: 600
          }}>
            {/* Primeira coluna - Tipo de Preparação */}
            <Box sx={{ 
              display: 'table-cell',
              p: 2,
              borderRight: '1px solid',
              borderBottom: '2px solid',
              borderColor: 'divider',
              bgcolor: 'primary.50',
              width: 150,
              verticalAlign: 'middle'
            }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                Tipo de Preparação
              </Typography>
            </Box>

            {/* Colunas dos dias úteis */}
            {diasUteis.map((cardapio, index) => {
              const dataStr = `${cardapio.ano}-${cardapio.mes}-${cardapio.dia}`;
              const isHoje = dataStr === hojeStr;
              
              return (
                <Box 
                  key={index}
                  sx={{ 
                    display: 'table-cell',
                    p: 1.5,
                    borderRight: index < diasUteis.length - 1 ? '1px solid' : 'none',
                    borderBottom: '2px solid',
                    borderColor: 'divider',
                    textAlign: 'center',
                    bgcolor: isHoje ? 'primary.100' : 'grey.50',
                    minWidth: 120,
                    verticalAlign: 'middle'
                  }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block', 
                      fontWeight: 600, 
                      mb: 0.5,
                      color: isHoje ? 'primary.main' : 'text.secondary'
                    }}
                  >
                    {DIAS_SEMANA[cardapio.diaSemana]}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: isHoje ? 700 : 600,
                      color: isHoje ? 'primary.main' : 'text.primary'
                    }}
                  >
                    {cardapio.dia}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      color: 'text.secondary'
                    }}
                  >
                    {cardapio.mes.toString().padStart(2, '0')}/{cardapio.ano}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* Linhas da tabela - Uma para cada tipo de refeição que tem preparações */}
          {tiposComPreparacoes.map((tipoRefeicao, tipoIndex) => (
            <Box 
              key={tipoRefeicao.key}
              sx={{ 
                display: 'table-row',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              {/* Primeira coluna - Nome do tipo */}
              <Box sx={{ 
                display: 'table-cell',
                p: 2,
                borderRight: '1px solid',
                borderBottom: tipoIndex < tiposComPreparacoes.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
                bgcolor: 'grey.50',
                verticalAlign: 'top'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ color: 'primary.main', display: 'flex' }}>
                    {tipoRefeicao.icon}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {tipoRefeicao.label}
                  </Typography>
                </Box>
              </Box>

              {/* Colunas dos dias - Preparações deste tipo */}
              {diasUteis.map((cardapio, diaIndex) => {
                const dataKey = `${cardapio.ano}-${cardapio.mes}-${cardapio.dia}`;
                const dataStr = `${cardapio.ano}-${cardapio.mes}-${cardapio.dia}`;
                const isHoje = dataStr === hojeStr;
                
                const refeicoesDoTipo = refeicoesOrganizadas[dataKey]?.[tipoRefeicao.key] || [];

                return (
                  <Box 
                    key={diaIndex}
                    sx={{ 
                      display: 'table-cell',
                      p: 1.5,
                      borderRight: diaIndex < diasUteis.length - 1 ? '1px solid' : 'none',
                      borderBottom: tipoIndex < tiposComPreparacoes.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      bgcolor: isHoje ? 'primary.50' : 'background.paper',
                      verticalAlign: 'top'
                    }}
                  >
                    {refeicoesDoTipo.length === 0 ? (
                      <Typography 
                        variant="caption" 
                        color="text.disabled"
                        sx={{ fontStyle: 'italic', display: 'block', textAlign: 'center' }}
                      >
                        -
                      </Typography>
                    ) : (
                      <Chip
                        label={refeicoesDoTipo.map(r => r.nome).join(' + ')}
                        size="small"
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          fontSize: '0.7rem',
                          height: 'auto',
                          minHeight: 24,
                          width: '100%',
                          justifyContent: 'flex-start',
                          '& .MuiChip-label': {
                            px: 1,
                            py: 0.5,
                            whiteSpace: 'normal',
                            display: 'block',
                            lineHeight: 1.4
                          },
                          boxShadow: 1
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

export default CardapioSemanalPortal;
