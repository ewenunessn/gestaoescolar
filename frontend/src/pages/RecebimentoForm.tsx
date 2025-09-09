import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Snackbar,
  IconButton,
} from "@mui/material";
import {
  iniciarRecebimento,
  registrarItemRecebido,
  finalizarRecebimento,
  uploadComprovante,
} from "../services/recebimentos";
import debounce from "lodash.debounce";
import { CloudUpload as CloudUploadIcon } from "@mui/icons-material";

interface RecebimentoFormProps {
  open: boolean;
  pedido: any | null;
  onClose: () => void;
  onRecebimentoFinalizado: () => void;
}

const RecebimentoForm: React.FC<RecebimentoFormProps> = ({
  open,
  pedido,
  onClose,
  onRecebimentoFinalizado,
}) => {
  const [recebimento, setRecebimento] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [conferencia, setConferencia] = useState<{ [key: number]: any }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const fileInputRef = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const debouncedRegistrarItem = useCallback(
    debounce((item) => {
      registrarItemRecebido(item)
        .then(() =>
          setSnackbar({ open: true, message: "Progresso salvo!" })
        )
        .catch(() =>
          setError("Falha ao salvar o progresso de um item.")
        );
    }, 1000),
    []
  );

  useEffect(() => {
    if (pedido && open) {
      setLoading(true);
      setError(null);
      iniciarRecebimento(pedido.id)
        .then((data) => {
          setRecebimento(data);
          setItens(data.itens);
          const conf: { [key: number]: any } = {};
          data.itens.forEach((item: any) => {
            conf[item.produto_id] = {
              quantidade_recebida: "",
              validade: "",
              observacao: "",
            };
          });
          setConferencia(conf);
        })
        .catch((err) => {
          setError(
            err.response?.data?.message || "Erro ao iniciar recebimento."
          );
        })
        .finally(() => setLoading(false));
    } else {
      setRecebimento(null);
      setItens([]);
      setConferencia({});
    }
  }, [pedido, open]);

  const handleConferenciaChange = (
    produto_id: number,
    field: string,
    value: any
  ) => {
    const updatedConferencia = {
      ...conferencia,
      [produto_id]: {
        ...conferencia[produto_id],
        [field]: value,
      },
    };
    setConferencia(updatedConferencia);

    const itemOriginal = itens.find((i) => i.produto_id === produto_id);
    if (itemOriginal) {
      debouncedRegistrarItem({
        recebimento_id: recebimento.id,
        produto_id: produto_id,
        quantidade_pedida: itemOriginal.quantidade,
        quantidade_recebida: updatedConferencia[produto_id].quantidade_recebida,
        validade: updatedConferencia[produto_id].validade,
        observacao: updatedConferencia[produto_id].observacao,
      });
    }
  };

  const handleFileUpload = async (
    produto_id: number,
    files: FileList | null
  ) => {
    if (!files || files.length === 0 || !recebimento) return;
    try {
      await uploadComprovante(recebimento.id, produto_id, Array.from(files));
      setSnackbar({
        open: true,
        message: `Comprovante(s) para o produto ${produto_id} enviado(s)!`,
      });
    } catch (error) {
      setError(`Falha ao enviar comprovante para o produto ${produto_id}.`);
    }
  };

  const handleFinalizar = async () => {
    setLoading(true);
    setError(null);
    try {
      await finalizarRecebimento(recebimento.id);
      onRecebimentoFinalizado();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao finalizar recebimento.");
      setLoading(false);
    }
  };

  const todosConferidos = itens.every(
    (item) =>
      conferencia[item.produto_id]?.quantidade_recebida !== "" &&
      conferencia[item.produto_id]?.quantidade_recebida !== null
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          Conferência de Recebimento - Pedido #{pedido?.id}
        </DialogTitle>
        <DialogContent>
          {loading && <CircularProgress />}
          {error && <Alert severity="error">{error}</Alert>}
          {recebimento && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Produto</TableCell>
                    <TableCell align="right">Qtd. Pedida</TableCell>
                    <TableCell align="right">Qtd. Recebida</TableCell>
                    <TableCell>Validade</TableCell>
                    <TableCell>Observação</TableCell>
                    <TableCell>Comprovante</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.produto_id}>
                      <TableCell>{item.nome}</TableCell>
                      <TableCell align="right">{item.quantidade}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          value={
                            conferencia[item.produto_id]
                              ?.quantidade_recebida ?? ""
                          }
                          onChange={(e) =>
                            handleConferenciaChange(
                              item.produto_id,
                              "quantidade_recebida",
                              e.target.value
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="date"
                          size="small"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          value={
                            conferencia[item.produto_id]?.validade ?? ""
                          }
                          onChange={(e) =>
                            handleConferenciaChange(
                              item.produto_id,
                              "validade",
                              e.target.value
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={
                            conferencia[item.produto_id]?.observacao ?? ""
                          }
                          onChange={(e) =>
                            handleConferenciaChange(
                              item.produto_id,
                              "observacao",
                              e.target.value
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="file"
                          multiple
                          hidden
                          ref={(el) =>
                            (fileInputRef.current[item.produto_id] = el)
                          }
                          onChange={(e) =>
                            handleFileUpload(item.produto_id, e.target.files)
                          }
                        />
                        <IconButton
                          color="primary"
                          onClick={() =>
                            fileInputRef.current[item.produto_id]?.click()
                          }
                        >
                          <CloudUploadIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="secondary">
            Fechar
          </Button>
          <Button
            onClick={handleFinalizar}
            variant="contained"
            disabled={!todosConferidos || loading}
          >
            {loading ? <CircularProgress size={24} /> : "Finalizar Recebimento"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        message={snackbar.message}
      />
    </>
  );
};

export default RecebimentoForm;
