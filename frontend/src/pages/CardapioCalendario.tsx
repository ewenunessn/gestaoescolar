import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, Grid, IconButton, InputLabel, MenuItem, Select, TextField, Typography, Chip, Menu
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Delete as DeleteIcon, PictureAsPdf as PdfIcon, MoreVert as MoreIcon } from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import PageContainer from '../components/PageContainer';
import {
  buscarCardapioModalidade, listarRefeicoesCardapio, adicionarRefeicaoDia,
  removerRefeicaoDia, CardapioModalidade, RefeicaoDia, TIPOS_REFEICAO, MESES
} from '../services/cardapiosModalidade';
import { listarRefeicoes } from '../services/refeicoes';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CardapioCalendarioPage: React.FC = () => {
  const { cardapioId } = useParams<{ cardapioId: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [cardapio, setCardapio] = useState<CardapioModalidade | null>(null);
  const [refeicoes, setRefeicoes] = useState<RefeicaoDia[]>([]);
  const [refeicoesDisponiveis, setRefeicoesDisponiveis] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openListDialog, setOpenListDialog] = useState(false);
  const [openDetalhesDialog, setOpenDetalhesDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [refeicaoDetalhes, setRefeicaoDetalhes] = useState<any>(null);
  const [formData, setFormData] = useState({
    refeicao_id: '',
    tipo_refeicao: '',
    observacao: ''
  });

  useEffect(() => {
    if (cardapioId) loadData();
  }, [cardapioId]);

  const loadData = async () => {
    try {
      const [cardapioData, refeicoesData, refeicoesDisp] = await Promise.all([
        buscarCardapioModalidade(parseInt(cardapioId!)),
        listarRefeicoesCardapio(parseInt(cardapioId!)),
        listarRefeicoes()
      ]);
      setCardapio(cardapioData);
      setRefeicoes(refeicoesData);
      setRefeicoesDisponiveis(refeicoesDisp);
    } catch (err) {
      error('Erro ao carregar cardápio');
    }
  };

  const getCalendarioSemanas = () => {
    if (!cardapio) return [];
    
    const primeiroDia = new Date(cardapio.ano, cardapio.mes - 1, 1);
    const ultimoDia = new Date(cardapio.ano, cardapio.mes, 0).getDate();
    const diaSemanaInicio = primeiroDia.getDay(); // 0 = domingo
    
    const semanas: (number | null)[][] = [];
    let semanaAtual: (number | null)[] = [];
    
    // Preenche dias vazios antes do primeiro dia
    for (let i = 0; i < diaSemanaInicio; i++) {
      semanaAtual.push(null);
    }
    
    // Preenche os dias do mês
    for (let dia = 1; dia <= ultimoDia; dia++) {
      semanaAtual.push(dia);
      
      if (semanaAtual.length === 7) {
        semanas.push(semanaAtual);
        semanaAtual = [];
      }
    }
    
    // Preenche dias vazios após o último dia
    if (semanaAtual.length > 0) {
      while (semanaAtual.length < 7) {
        semanaAtual.push(null);
      }
      semanas.push(semanaAtual);
    }
    
    return semanas;
  };

  const getRefeicoesNoDia = (dia: number) => {
    return refeicoes.filter(r => r.dia === dia);
  };

  const handleOpenDialog = (dia: number) => {
    setDiaSelecionado(dia);
    setFormData({ refeicao_id: '', tipo_refeicao: '', observacao: '' });
    setOpenDialog(true);
  };

  const handleOpenListDialog = (dia: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDiaSelecionado(dia);
    setOpenListDialog(true);
  };

  const handleOpenDetalhes = async (refeicaoId: number) => {
    try {
      const refeicao = refeicoesDisponiveis.find(r => r.id === refeicaoId);
      if (refeicao) {
        setRefeicaoDetalhes(refeicao);
        setOpenDetalhesDialog(true);
      }
    } catch (err) {
      error('Erro ao carregar detalhes');
    }
  };

  const exportarCalendarioPDF = () => {
    if (!cardapio) return;
    
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Título
    doc.setFontSize(16);
    doc.text(`Cardápio - ${cardapio.nome}`, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${MESES[cardapio.mes]} / ${cardapio.ano} - ${cardapio.modalidade_nome}`, pageWidth / 2, 22, { align: 'center' });
    
    // Calendário
    const semanas = getCalendarioSemanas();
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const cellWidth = 40;
    const cellHeight = 35;
    let startY = 30;
    
    // Cabeçalho dos dias
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    diasSemana.forEach((dia, i) => {
      doc.text(dia, 10 + (i * cellWidth) + cellWidth / 2, startY, { align: 'center' });
    });
    
    startY += 5;
    
    // Desenhar semanas
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    semanas.forEach((semana, semanaIdx) => {
      semana.forEach((dia, diaIdx) => {
        const x = 10 + (diaIdx * cellWidth);
        const y = startY + (semanaIdx * cellHeight);
        
        // Borda
        doc.rect(x, y, cellWidth, cellHeight);
        
        if (dia !== null) {
          // Número do dia
          doc.setFont('helvetica', 'bold');
          doc.text(dia.toString(), x + 2, y + 5);
          
          // Refeições
          doc.setFont('helvetica', 'normal');
          const refeicoesNoDia = getRefeicoesNoDia(dia);
          refeicoesNoDia.slice(0, 3).forEach((ref, idx) => {
            const text = `${TIPOS_REFEICAO[ref.tipo_refeicao]}: ${ref.refeicao_nome}`;
            const lines = doc.splitTextToSize(text, cellWidth - 4);
            doc.text(lines[0], x + 2, y + 10 + (idx * 5));
          });
          
          if (refeicoesNoDia.length > 3) {
            doc.text(`+${refeicoesNoDia.length - 3} mais`, x + 2, y + 25);
          }
        }
      });
    });
    
    doc.save(`cardapio-${cardapio.mes}-${cardapio.ano}.pdf`);
    success('PDF do calendário gerado!');
    setAnchorEl(null);
  };

  const exportarFrequenciaPDF = () => {
    if (!cardapio) return;
    
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text(`Relatório de Frequência - ${cardapio.nome}`, 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${MESES[cardapio.mes]} / ${cardapio.ano} - ${cardapio.modalidade_nome}`, 105, 22, { align: 'center' });
    
    // Agrupar por tipo e refeição
    const frequencia: Record<string, Record<string, number>> = {};
    
    refeicoes.forEach(ref => {
      if (!frequencia[ref.tipo_refeicao]) {
        frequencia[ref.tipo_refeicao] = {};
      }
      if (!frequencia[ref.tipo_refeicao][ref.refeicao_nome]) {
        frequencia[ref.tipo_refeicao][ref.refeicao_nome] = 0;
      }
      frequencia[ref.tipo_refeicao][ref.refeicao_nome]++;
    });
    
    let startY = 30;
    
    // Para cada tipo de refeição
    Object.entries(TIPOS_REFEICAO).forEach(([tipo, tipoNome]) => {
      if (frequencia[tipo]) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(tipoNome, 14, startY);
        startY += 7;
        
        // Tabela de refeições
        const tableData = Object.entries(frequencia[tipo]).map(([nome, freq]) => [nome, freq.toString()]);
        
        autoTable(doc, {
          startY: startY,
          head: [['Refeição', 'Frequência']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202] },
          margin: { left: 14 },
          styles: { fontSize: 10 }
        });
        
        startY = (doc as any).lastAutoTable.finalY + 10;
      }
    });
    
    doc.save(`frequencia-cardapio-${cardapio.mes}-${cardapio.ano}.pdf`);
    success('PDF de frequência gerado!');
    setAnchorEl(null);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.refeicao_id || !formData.tipo_refeicao) {
        error('Selecione a refeição e o tipo');
        return;
      }

      await adicionarRefeicaoDia(parseInt(cardapioId!), {
        refeicao_id: parseInt(formData.refeicao_id),
        dia: diaSelecionado!,
        tipo_refeicao: formData.tipo_refeicao,
        observacao: formData.observacao || undefined
      });

      success('Refeição adicionada!');
      setOpenDialog(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Erro ao adicionar refeição');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Remover esta refeição?')) {
      try {
        await removerRefeicaoDia(id);
        success('Refeição removida!');
        loadData();
      } catch (err) {
        error('Erro ao remover refeição');
      }
    }
  };

  const getDiaDaSemana = (diaSemana: number) => {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return dias[diaSemana];
  };

  const corTipoRefeicao: Record<string, string> = {
    cafe_manha: '#FFA726',
    lanche_manha: '#66BB6A',
    almoco: '#EF5350',
    lanche_tarde: '#42A5F5',
    jantar: '#AB47BC'
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PageContainer>
        <Box display="flex" alignItems="center" mb={2}>
          <IconButton onClick={() => navigate('/cardapios')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box flex={1}>
            <Typography variant="h5">{cardapio?.nome}</Typography>
            <Typography variant="body2" color="textSecondary">
              {cardapio && `${MESES[cardapio.mes]} / ${cardapio.ano} - ${cardapio.modalidade_nome}`}
            </Typography>
          </Box>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} color="primary">
            <PdfIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={exportarCalendarioPDF}>
              <PdfIcon sx={{ mr: 1 }} fontSize="small" />
              Exportar Calendário
            </MenuItem>
            <MenuItem onClick={exportarFrequenciaPDF}>
              <PdfIcon sx={{ mr: 1 }} fontSize="small" />
              Exportar Frequência
            </MenuItem>
          </Menu>
        </Box>

        {/* Cabeçalho dos dias da semana */}
        <Box sx={{ mb: 1 }}>
          <Grid container spacing={0.5}>
            {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((dia, index) => (
              <Grid item xs={12 / 7} key={dia}>
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    fontWeight: 'bold', 
                    py: 0.5,
                    bgcolor: index === 0 || index === 6 ? '#ffebee' : '#e3f2fd',
                    borderRadius: 1
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{dia}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Calendário */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {getCalendarioSemanas().map((semana, semanaIndex) => (
            <Box key={semanaIndex}>
              <Grid container spacing={0.5}>
                {semana.map((dia, diaIndex) => {
                  if (dia === null) {
                    return (
                      <Grid item xs={12 / 7} key={`empty-${diaIndex}`}>
                        <Box sx={{ height: 120, bgcolor: '#e0e0e0', borderRadius: 1, border: '1px solid #bdbdbd' }} />
                      </Grid>
                    );
                  }

                  const refeicoesNoDia = getRefeicoesNoDia(dia);
                  const ehFimDeSemana = diaIndex === 0 || diaIndex === 6;

                  return (
                    <Grid item xs={12 / 7} key={dia}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          height: 120,
                          bgcolor: ehFimDeSemana ? '#fff3e0' : 'white',
                          border: '1px solid #e0e0e0',
                          '&:hover': { boxShadow: 2, borderColor: '#1976d2' },
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                        onClick={() => handleOpenDialog(dia)}
                      >
                        <CardContent sx={{ p: 0.5, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', '&:last-child': { pb: 0.5 } }}>
                          <Typography variant="h6" sx={{ mb: 0.3, fontSize: '1rem', fontWeight: 'bold', color: ehFimDeSemana ? '#d84315' : 'inherit' }}>
                            {dia}
                          </Typography>
                          
                          {refeicoesNoDia.length === 0 ? (
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem', fontStyle: 'italic' }}>
                              + Adicionar
                            </Typography>
                          ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, flex: 1, overflow: 'hidden' }}>
                              {refeicoesNoDia.slice(0, 3).map((ref) => (
                                <Box 
                                  key={ref.id}
                                  sx={{ 
                                    p: 0.4, 
                                    borderRadius: 0.5,
                                    bgcolor: corTipoRefeicao[ref.tipo_refeicao] || '#ccc',
                                    color: 'white',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    cursor: 'pointer',
                                    '&:hover': { opacity: 0.9 }
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDetalhes(ref.refeicao_id);
                                  }}
                                >
                                  <Box sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', fontSize: '0.6rem', lineHeight: 1.2 }}>
                                      {TIPOS_REFEICAO[ref.tipo_refeicao]}
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block', fontSize: '0.55rem', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {ref.refeicao_nome}
                                    </Typography>
                                  </Box>
                                  <IconButton 
                                    size="small" 
                                    sx={{ color: 'white', p: 0.2, ml: 0.3, minWidth: 0 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(ref.id);
                                    }}
                                  >
                                    <DeleteIcon sx={{ fontSize: '0.75rem' }} />
                                  </IconButton>
                                </Box>
                              ))}
                              {refeicoesNoDia.length > 3 && (
                                <Box 
                                  sx={{ 
                                    p: 0.4, 
                                    borderRadius: 0.5,
                                    bgcolor: '#757575',
                                    color: 'white',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: '#616161' }
                                  }}
                                  onClick={(e) => handleOpenListDialog(dia, e)}
                                >
                                  <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>
                                    +{refeicoesNoDia.length - 3} mais
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ))}
        </Box>
      </PageContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Refeição - Dia {diaSelecionado}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Refeição</InputLabel>
              <Select 
                value={formData.refeicao_id} 
                onChange={(e) => setFormData({ ...formData, refeicao_id: e.target.value })} 
                label="Refeição"
              >
                {refeicoesDisponiveis.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.nome} {r.descricao && `- ${r.descricao}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Tipo de Refeição</InputLabel>
              <Select 
                value={formData.tipo_refeicao} 
                onChange={(e) => setFormData({ ...formData, tipo_refeicao: e.target.value })} 
                label="Tipo de Refeição"
              >
                {Object.entries(TIPOS_REFEICAO).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField 
              label="Observação" 
              fullWidth 
              multiline 
              rows={2} 
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })} 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">Adicionar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de lista completa */}
      <Dialog open={openListDialog} onClose={() => setOpenListDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Refeições do Dia {diaSelecionado}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {diaSelecionado && getRefeicoesNoDia(diaSelecionado).map((ref) => (
              <Box 
                key={ref.id}
                sx={{ 
                  p: 1.5, 
                  borderRadius: 1,
                  bgcolor: corTipoRefeicao[ref.tipo_refeicao] || '#ccc',
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.9 }
                }}
                onClick={() => {
                  setOpenListDialog(false);
                  handleOpenDetalhes(ref.refeicao_id);
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {TIPOS_REFEICAO[ref.tipo_refeicao]}
                  </Typography>
                  <Typography variant="body2">
                    {ref.refeicao_nome}
                  </Typography>
                  {ref.observacao && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.9 }}>
                      {ref.observacao}
                    </Typography>
                  )}
                </Box>
                <IconButton 
                  size="small" 
                  sx={{ color: 'white' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(ref.id);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenListDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de detalhes da refeição */}
      <Dialog open={openDetalhesDialog} onClose={() => setOpenDetalhesDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{refeicaoDetalhes?.nome}</DialogTitle>
        <DialogContent>
          {refeicaoDetalhes && (
            <Box sx={{ pt: 2 }}>
              {refeicaoDetalhes.descricao && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Descrição</Typography>
                  <Typography variant="body1">{refeicaoDetalhes.descricao}</Typography>
                </Box>
              )}
              
              {refeicaoDetalhes.observacao && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Observação</Typography>
                  <Typography variant="body2">{refeicaoDetalhes.observacao}</Typography>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Informações</Typography>
                <Box>
                  <Typography variant="body2" component="span" sx={{ mr: 1 }}>Status:</Typography>
                  <Chip label={refeicaoDetalhes.ativo ? 'Ativa' : 'Inativa'} size="small" color={refeicaoDetalhes.ativo ? 'success' : 'default'} />
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetalhesDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CardapioCalendarioPage;
