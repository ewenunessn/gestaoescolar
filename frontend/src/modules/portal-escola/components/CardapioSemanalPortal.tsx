import React, { useMemo, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  LocalCafe as CafeIcon,
  LunchDining as LunchIcon,
  RestaurantMenu as DinnerIcon,
  Cookie as SnackIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { carregarTiposRefeicao } from '../../../services/cardapiosModalidade';
import api from '../../../services/api';
import { gerarPDFFichaTecnica } from '../../../utils/fichaTecnicaPdf';

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refeicoesSelecionadas, setRefeicoesSelecionadas] = useState<any[]>([]);
  const [fichasTecnicas, setFichasTecnicas] = useState<any[]>([]);
  const [loadingFicha, setLoadingFicha] = useState(false);

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

  const handleClickRefeicoes = async (refeicoes: any[]) => {
    setRefeicoesSelecionadas(refeicoes);
    setDialogOpen(true);
    setLoadingFicha(true);
    setFichasTecnicas([]);

    try {
      const fichasPromises = refeicoes.map(refeicao => 
        api.get(`/refeicoes/${refeicao.id}/ficha-tecnica`)
      );
      const responses = await Promise.all(fichasPromises);
      const fichas = responses.map(r => r.data);
      console.log('Fichas técnicas recebidas:', fichas);
      setFichasTecnicas(fichas);
    } catch (error) {
      console.error('Erro ao carregar fichas técnicas:', error);
    } finally {
      setLoadingFicha(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setRefeicoesSelecionadas([]);
    setFichasTecnicas([]);
  };

  const imprimirFichaTecnica = async (fichaTecnica: any, nomeRefeicao: string) => {
    try {
      await gerarPDFFichaTecnica({
        refeicao: {
          nome: nomeRefeicao,
          descricao: fichaTecnica.refeicao.descricao,
          categoria: fichaTecnica.refeicao.categoria,
          tempo_preparo_minutos: fichaTecnica.refeicao.tempo_preparo_minutos,
          rendimento_porcoes: fichaTecnica.refeicao.rendimento_porcoes,
          modo_preparo: fichaTecnica.refeicao.modo_preparo,
          utensilios: fichaTecnica.refeicao.utensilios,
          observacoes_tecnicas: fichaTecnica.refeicao.observacoes_tecnicas,
        },
        produtos: fichaTecnica.produtos || [],
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF da ficha técnica');
    }
  };

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
    <>
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
                        onClick={() => handleClickRefeicoes(refeicoesDoTipo)}
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          fontSize: '0.7rem',
                          height: 'auto',
                          minHeight: 24,
                          width: '100%',
                          justifyContent: 'flex-start',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                            transform: 'scale(1.02)'
                          },
                          '& .MuiChip-label': {
                            px: 1,
                            py: 0.5,
                            whiteSpace: 'normal',
                            display: 'block',
                            lineHeight: 1.4
                          },
                          boxShadow: 1,
                          transition: 'all 0.2s'
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

    {/* Dialog Fichas Técnicas */}
    <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
      <DialogTitle>
        {refeicoesSelecionadas.length === 1 
          ? `Ficha Técnica - ${refeicoesSelecionadas[0]?.nome}`
          : `Fichas Técnicas - ${refeicoesSelecionadas.map(r => r.nome).join(' + ')}`
        }
      </DialogTitle>
      <DialogContent>
        {loadingFicha ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : fichasTecnicas.length > 0 ? (
          <>
            {fichasTecnicas.map((fichaTecnica, index) => (
              <Box key={index} sx={{ mb: index < fichasTecnicas.length - 1 ? 4 : 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  {refeicoesSelecionadas.length > 1 && (
                    <Typography variant="h6" sx={{ color: 'primary.main' }}>
                      {refeicoesSelecionadas[index]?.nome}
                    </Typography>
                  )}
                  <IconButton
                    onClick={() => imprimirFichaTecnica(fichaTecnica, refeicoesSelecionadas[index]?.nome)}
                    color="primary"
                    size="small"
                    sx={{ ml: 'auto' }}
                  >
                    <PrintIcon />
                  </IconButton>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Descrição
                  </Typography>
                  <Typography variant="body2">
                    {fichaTecnica.refeicao.descricao || 'Sem descrição'}
                  </Typography>
                </Box>

                <Typography variant="h6" sx={{ mb: 2 }}>
                  Ingredientes
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Produto</TableCell>
                        <TableCell align="center">PC Líq. (g)</TableCell>
                        <TableCell align="center">PC Bruto (g)</TableCell>
                        <TableCell align="center">kcal</TableCell>
                        <TableCell align="center">Prot. (g)</TableCell>
                        <TableCell align="center">Lip. (g)</TableCell>
                        <TableCell align="center">Carb. (g)</TableCell>
                        <TableCell align="center">Cálcio (mg)</TableCell>
                        <TableCell align="center">Ferro (mg)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fichaTecnica.produtos && fichaTecnica.produtos.length > 0 ? (
                        <>
                          {fichaTecnica.produtos.map((produto: any, idx: number) => {
                            const kcal = (produto.proteinas_porcao || 0) * 4 + 
                                        (produto.carboidratos_porcao || 0) * 4 + 
                                        (produto.lipidios_porcao || 0) * 9;
                            return (
                              <TableRow key={idx} sx={{ bgcolor: idx % 2 === 0 ? 'grey.50' : 'white' }}>
                                <TableCell>{produto.produto_nome}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                  {produto.per_capita ? Number(produto.per_capita).toFixed(1) : '-'}
                                </TableCell>
                                <TableCell align="center">
                                  {produto.per_capita_bruto ? Number(produto.per_capita_bruto).toFixed(1) : 
                                   produto.per_capita ? Number(produto.per_capita).toFixed(1) : '-'}
                                </TableCell>
                                <TableCell align="center">
                                  {kcal > 0 ? kcal.toFixed(0) : '-'}
                                </TableCell>
                                <TableCell align="center">
                                  {produto.proteinas_porcao ? Number(produto.proteinas_porcao).toFixed(1) : '-'}
                                </TableCell>
                                <TableCell align="center">
                                  {produto.lipidios_porcao ? Number(produto.lipidios_porcao).toFixed(1) : '-'}
                                </TableCell>
                                <TableCell align="center">
                                  {produto.carboidratos_porcao ? Number(produto.carboidratos_porcao).toFixed(1) : '-'}
                                </TableCell>
                                <TableCell align="center">
                                  {produto.calcio_porcao ? Number(produto.calcio_porcao).toFixed(1) : '-'}
                                </TableCell>
                                <TableCell align="center">
                                  {produto.ferro_porcao ? Number(produto.ferro_porcao).toFixed(2) : '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Linha de totais */}
                          <TableRow sx={{ bgcolor: 'primary.dark' }}>
                            <TableCell sx={{ fontWeight: 700, color: 'white' }}>TOTAL Preparação</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: 'white' }}>
                              {fichaTecnica.produtos.reduce((s: number, p: any) => s + (Number(p.per_capita) || 0), 0).toFixed(1)}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: 'white' }}>
                              {fichaTecnica.produtos.reduce((s: number, p: any) => s + (Number(p.per_capita_bruto || p.per_capita) || 0), 0).toFixed(1)}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: 'white' }}>
                              {fichaTecnica.produtos.reduce((s: number, p: any) => {
                                const kcal = (p.proteinas_porcao || 0) * 4 + (p.carboidratos_porcao || 0) * 4 + (p.lipidios_porcao || 0) * 9;
                                return s + kcal;
                              }, 0).toFixed(0)}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: 'white' }}>
                              {fichaTecnica.produtos.reduce((s: number, p: any) => s + (Number(p.proteinas_porcao) || 0), 0).toFixed(1)}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: 'white' }}>
                              {fichaTecnica.produtos.reduce((s: number, p: any) => s + (Number(p.lipidios_porcao) || 0), 0).toFixed(1)}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: 'white' }}>
                              {fichaTecnica.produtos.reduce((s: number, p: any) => s + (Number(p.carboidratos_porcao) || 0), 0).toFixed(1)}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: 'white' }}>
                              {fichaTecnica.produtos.reduce((s: number, p: any) => s + (Number(p.calcio_porcao) || 0), 0).toFixed(1)}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: 'white' }}>
                              {fichaTecnica.produtos.reduce((s: number, p: any) => s + (Number(p.ferro_porcao) || 0), 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        </>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            <Typography variant="body2" color="text.secondary">
                              Nenhum ingrediente cadastrado
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {fichaTecnica.refeicao.modo_preparo && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Modo de Preparo
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {fichaTecnica.refeicao.modo_preparo}
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {index < fichasTecnicas.length - 1 && (
                  <Box sx={{ borderBottom: '2px solid', borderColor: 'divider', my: 3 }} />
                )}
              </Box>
            ))}
          </>
        ) : (
          <Alert severity="info">
            Fichas técnicas não disponíveis para estas preparações.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog}>Fechar</Button>
      </DialogActions>
    </Dialog>
  </>
  );
};

export default CardapioSemanalPortal;
