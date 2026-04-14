import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Box, Chip, Divider, Paper,
  IconButton, Tooltip
} from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import { CustoCardapio } from '../services/cardapiosModalidade';
import { modalidadeService } from '../services/modalidades';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// Mapeamento de tipos de fornecedor para labels amigáveis
const TIPO_FORNECEDOR_LABELS: Record<string, string> = {
  'CONVENCIONAL': 'Convencional',
  'AGRICULTURA_FAMILIAR': 'Agricultura Familiar',
  'COOPERATIVA_AF': 'Cooperativa AF',
  'ASSOCIACAO_AF': 'Associação AF',
  'empresa': 'Empresa',
  'cooperativa': 'Cooperativa',
  'individual': 'Individual'
};

// Cores para cada tipo de fornecedor
const TIPO_FORNECEDOR_COLORS: Record<string, string> = {
  'CONVENCIONAL': '#1976d2',
  'AGRICULTURA_FAMILIAR': '#2e7d32',
  'COOPERATIVA_AF': '#388e3c',
  'ASSOCIACAO_AF': '#43a047',
  'empresa': '#1976d2',
  'cooperativa': '#388e3c',
  'individual': '#f57c00'
};

interface Props {
  open: boolean;
  onClose: () => void;
  custo: CustoCardapio;
}

// Modal de produtos de uma refeição
interface ProdutosModalProps {
  open: boolean;
  onClose: () => void;
  refeicao: any;
}

function ProdutosRefeicaoModal({ open, onClose, refeicao }: ProdutosModalProps) {
  if (!refeicao) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box>
          <Typography variant="h6">{refeicao.refeicao_nome}</Typography>
          <Typography variant="caption" color="text.secondary">
            Produtos e Custos por Aluno
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: 'background.paper' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>Produto</strong></TableCell>
                <TableCell><strong>Tipo Fornecedor</strong></TableCell>
                <TableCell align="right"><strong>Custo/Aluno</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {refeicao.produtos?.length > 0 ? (
                refeicao.produtos.map((p: any, idx: number) => (
                  <TableRow key={idx} hover>
                    <TableCell>
                      <Typography variant="body2">{p.produto_nome}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={TIPO_FORNECEDOR_LABELS[p.tipo_fornecedor] || p.tipo_fornecedor || 'N/A'} 
                        size="small"
                        sx={{ 
                          bgcolor: TIPO_FORNECEDOR_COLORS[p.tipo_fornecedor] || '#999',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.7rem'
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        fontWeight={600}
                        color={p.preco_unitario > 0 ? 'success.main' : 'error.main'}
                      >
                        {fmt(p.custo_por_aluno)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      Nenhum produto cadastrado
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CustoCardapioDetalheModal({ open, onClose, custo }: Props) {
  const [produtosModal, setProdutosModal] = React.useState<any>(null);
  const [modalidades, setModalidades] = React.useState<any[]>([]);

  // Carregar modalidades
  React.useEffect(() => {
    const loadModalidades = async () => {
      try {
        const data = await modalidadeService.listar();
        // Garantir que sempre seja um array
        setModalidades(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erro ao carregar modalidades:', error);
        setModalidades([]);
      }
    };
    if (open) {
      loadModalidades();
    }
  }, [open]);

  // Função para obter nome da modalidade
  const getModalidadeNome = (modalidadeId: number) => {
    if (!Array.isArray(modalidades)) return `Modalidade ${modalidadeId}`;
    const modalidade = modalidades.find(m => m.id === modalidadeId);
    return modalidade?.nome || `Modalidade ${modalidadeId}`;
  };

  // Agrupar detalhes por dia e filtrar refeições com 0 alunos
  const porDia = React.useMemo(() => {
    const map = new Map<number, typeof custo.detalhes_por_refeicao>();
    for (const r of custo.detalhes_por_refeicao) {
      const quantidadeAlunos = (r as any).quantidade_alunos ?? custo.total_alunos;
      
      // Filtrar apenas refeições com alunos > 0
      if (quantidadeAlunos > 0) {
        const dia = r.dia ?? 0;
        if (!map.has(dia)) map.set(dia, []);
        map.get(dia)!.push(r);
      }
    }
    
    // Agrupar refeições iguais por dia
    const resultado = Array.from(map.entries()).map(([dia, refeicoes]) => {
      // Criar chave única para cada combinação de refeição + tipo + modalidade
      const agrupadas = new Map<string, any>();
      
      refeicoes.forEach(r => {
        const quantidadeAlunos = (r as any).quantidade_alunos ?? custo.total_alunos;
        const modalidadeId = (r as any).modalidade_id || 0;
        const chave = `${r.refeicao_id}-${r.tipo_refeicao}-${modalidadeId}`;
        
        if (agrupadas.has(chave)) {
          // Incrementar frequência
          const existente = agrupadas.get(chave);
          existente.frequencia += 1;
          existente.custo_total_agregado += r.custo_total;
        } else {
          // Primeira ocorrência
          agrupadas.set(chave, {
            ...r,
            frequencia: 1,
            custo_total_agregado: r.custo_total,
            quantidade_alunos: quantidadeAlunos,
            modalidade_id: modalidadeId
          });
        }
      });
      
      return [dia, Array.from(agrupadas.values())] as [number, any[]];
    });
    
    return resultado.sort(([a], [b]) => a - b);
  }, [custo.detalhes_por_refeicao, custo.total_alunos]);

  const custoPorAluno = custo.total_alunos > 0 ? custo.custo_total / custo.total_alunos : 0;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Detalhamento de Custo por Refeição</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip label={`${custo.total_alunos} alunos`} size="small" color="primary" />
              <Chip label={`${custo.total_refeicoes} refeições`} size="small" />
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Resumo geral */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {[
              { label: 'Custo Total', value: fmt(custo.custo_total), color: 'success.main' },
              { label: 'Custo por Aluno', value: fmt(custoPorAluno), color: 'primary.main' },
            ].map(({ label, value, color }) => (
              <Box key={label} sx={{ flex: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="h5" fontWeight={700} color={color}>{value}</Typography>
              </Box>
            ))}
            {custo.detalhes_por_modalidade.map((m) => (
              <Box key={m.modalidade_id} sx={{ flex: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">{m.quantidade_alunos} alunos</Typography>
                <Typography variant="h5" fontWeight={700}>{fmt(m.custo_total)}</Typography>
              </Box>
            ))}
          </Box>

          {/* Custo por Tipo de Fornecedor */}
          {custo.detalhes_por_tipo_fornecedor && custo.detalhes_por_tipo_fornecedor.length > 0 && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: 'primary.main' }}>
                  Distribuição por Tipo de Fornecedor
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {custo.detalhes_por_tipo_fornecedor
                    .sort((a, b) => b.valor_total - a.valor_total)
                    .map((tipo) => (
                    <Box
                      key={tipo.tipo_fornecedor}
                      sx={{
                        flex: '1 1 calc(33.333% - 16px)',
                        minWidth: '200px',
                        p: 2,
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        border: '2px solid',
                        borderColor: TIPO_FORNECEDOR_COLORS[tipo.tipo_fornecedor] || 'divider',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%', 
                            bgcolor: TIPO_FORNECEDOR_COLORS[tipo.tipo_fornecedor] || '#999'
                          }} 
                        />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {TIPO_FORNECEDOR_LABELS[tipo.tipo_fornecedor] || tipo.tipo_fornecedor}
                        </Typography>
                      </Box>
                      <Typography variant="h6" fontWeight={700} color={TIPO_FORNECEDOR_COLORS[tipo.tipo_fornecedor] || '#999'}>
                        {fmt(tipo.valor_total)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Box 
                          sx={{ 
                            flex: 1, 
                            height: 6, 
                            bgcolor: '#e0e0e0', 
                            borderRadius: 1,
                            overflow: 'hidden'
                          }}
                        >
                          <Box 
                            sx={{ 
                              height: '100%', 
                              width: `${tipo.percentual}%`, 
                              bgcolor: TIPO_FORNECEDOR_COLORS[tipo.tipo_fornecedor] || '#999',
                              transition: 'width 0.3s'
                            }} 
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {tipo.percentual.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </>
          )}

          <Divider sx={{ mb: 2 }} />

          {/* Tabela por dia */}
          {porDia.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>
              Nenhuma refeição com alunos cadastrados. Verifique se os produtos têm contratos ativos com preço cadastrado.
            </Typography>
          ) : (
            porDia.map(([dia, refeicoes]) => (
              <Box key={dia} sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'primary.main' }}>
                  Dia {dia}
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell><strong>Refeição</strong></TableCell>
                        <TableCell><strong>Tipo</strong></TableCell>
                        <TableCell><strong>Modalidade</strong></TableCell>
                        <TableCell align="center"><strong>Frequência</strong></TableCell>
                        <TableCell align="right"><strong>Alunos</strong></TableCell>
                        <TableCell align="right"><strong>Custo/Aluno</strong></TableCell>
                        <TableCell align="right"><strong>Custo Total</strong></TableCell>
                        <TableCell align="center"><strong>Ações</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {refeicoes.map((r, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{r.refeicao_nome}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={r.tipo_refeicao} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={getModalidadeNome(r.modalidade_id)} 
                              size="small" 
                              color="secondary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${r.frequencia}x`} 
                              size="small" 
                              color={r.frequencia > 1 ? 'primary' : 'default'}
                              variant={r.frequencia > 1 ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {r.quantidade_alunos}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="primary.main" fontWeight={600}>
                              {fmt(r.custo_por_aluno)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box>
                              <Typography variant="body2" fontWeight={700} color="success.main">
                                {fmt(r.custo_total_agregado)}
                              </Typography>
                              {r.frequencia > 1 && (
                                <Typography variant="caption" color="text.secondary">
                                  ({fmt(r.custo_total)} cada)
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Ver Produtos">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => setProdutosModal(r)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de produtos */}
      <ProdutosRefeicaoModal
        open={Boolean(produtosModal)}
        onClose={() => setProdutosModal(null)}
        refeicao={produtosModal}
      />
    </>
  );
}
