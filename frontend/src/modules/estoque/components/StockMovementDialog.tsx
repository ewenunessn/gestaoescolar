import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Dialog,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";

type DialogMode = "entrada" | "saida" | "ajuste" | "transferencia";

interface ProductOption {
  id: number;
  nome: string;
}

interface StockMovementDialogProps {
  open: boolean;
  mode: DialogMode;
  title: string;
  produtoNome?: string;
  produtoId?: number;
  productOptions?: ProductOption[];
  unidade: string;
  saldoAtual: number;
  saving?: boolean;
  requireMotivo?: boolean;
  confirmColor?: string;
  onClose: () => void;
  onSubmit: (payload: {
    produtoId?: number;
    quantidade: number;
    motivo: string;
    observacao?: string;
  }) => Promise<void> | void;
}

const defaultMotivoByMode: Record<DialogMode, string> = {
  entrada: "Entrada manual",
  saida: "Saida manual",
  ajuste: "Ajuste de estoque",
  transferencia: "Transferencia",
};

const defaultConfirmColorByMode: Record<DialogMode, string> = {
  entrada: "#185FA5",
  saida: "#A32D2D",
  ajuste: "#854F0B",
  transferencia: "#185FA5",
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "background.default",
    borderRadius: "6px",
    fontSize: 13,
    "& fieldset": {
      border: "0.5px solid",
      borderColor: "action.selected",
    },
    "&.Mui-focused fieldset": {
      borderColor: "primary.main",
    },
  },
  "& .MuiInputBase-input": {
    py: "7px",
    px: "10px",
  },
};

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 12,
        color: "text.secondary",
        mb: "5px",
      }}
    >
      {children}
    </Typography>
  );
}

function getSaldoDepois(mode: DialogMode, saldoAtual: number, quantidade: number): number {
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return saldoAtual;
  }

  if (mode === "saida" || mode === "transferencia") {
    return saldoAtual - quantidade;
  }

  if (mode === "ajuste") {
    return quantidade;
  }

  return saldoAtual + quantidade;
}

export function StockMovementDialog({
  open,
  mode,
  title,
  produtoNome,
  produtoId,
  productOptions,
  unidade,
  saldoAtual,
  saving = false,
  requireMotivo = true,
  confirmColor,
  onClose,
  onSubmit,
}: StockMovementDialogProps) {
  const [selectedProductId, setSelectedProductId] = useState<number | "">(produtoId ?? "");
  const [quantidade, setQuantidade] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedProductId(produtoId ?? "");
      setQuantidade("1");
      setMotivo("");
      setObservacao("");
    }
  }, [open, produtoId]);

  const quantidadeNumero = Number(quantidade);
  const saldoDepois = useMemo(
    () => getSaldoDepois(mode, Number(saldoAtual || 0), quantidadeNumero),
    [mode, saldoAtual, quantidadeNumero],
  );

  const handleSubmit = async () => {
    if (!quantidadeNumero || quantidadeNumero <= 0) {
      return;
    }

    if (requireMotivo && !motivo.trim()) {
      return;
    }

    await onSubmit({
      produtoId: selectedProductId === "" ? undefined : Number(selectedProductId),
      quantidade: quantidadeNumero,
      motivo: requireMotivo ? motivo.trim() : defaultMotivoByMode[mode],
      observacao: observacao.trim() || undefined,
    });
  };

  const buttonColor = confirmColor ?? defaultConfirmColorByMode[mode];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          width: 320,
          borderRadius: "10px",
          border: "0.5px solid",
          borderColor: "divider",
          boxShadow: "0 18px 60px rgba(15, 23, 42, 0.16)",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: "14px 18px",
          borderBottom: "0.5px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          component="h2"
          sx={{ fontSize: 14, fontWeight: 500, color: "text.primary", m: 0 }}
        >
          {title}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: "text.secondary", fontSize: 18, width: 28, height: 28 }}
        >
          x
        </IconButton>
      </Box>

      <Box sx={{ p: "18px", display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box>
          <FieldLabel>Item</FieldLabel>
          {productOptions && !produtoNome ? (
            <FormControl size="small" fullWidth>
              <Select
                value={selectedProductId}
                onChange={(event) =>
                  setSelectedProductId(event.target.value === "" ? "" : Number(event.target.value))
                }
                sx={{
                  ...inputSx,
                  "& .MuiSelect-select": { py: "7px", px: "10px", fontSize: 13 },
                }}
              >
                <MenuItem value="">Selecione</MenuItem>
                {productOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              size="small"
              value={produtoNome || "Produto selecionado"}
              fullWidth
              disabled
              sx={inputSx}
            />
          )}
        </Box>

        <Box>
          <FieldLabel>Quantidade</FieldLabel>
          <TextField
            size="small"
            type="number"
            value={quantidade}
            onChange={(event) => setQuantidade(event.target.value)}
            inputProps={{ min: 1, step: 0.001 }}
            fullWidth
            sx={inputSx}
          />
        </Box>

        {requireMotivo ? (
          <Box>
            <FieldLabel>Motivo</FieldLabel>
            <TextField
              size="small"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              fullWidth
              sx={inputSx}
            />
          </Box>
        ) : null}

        <Box>
          <FieldLabel>Observacao (opcional)</FieldLabel>
          <TextField
            size="small"
            placeholder="Ex: lote 2024/01"
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            multiline
            minRows={2}
            fullWidth
            sx={inputSx}
          />
        </Box>

        <Box sx={{ color: "text.secondary", fontSize: 12 }}>
          Saldo: {Number(saldoAtual || 0).toLocaleString("pt-BR")} {unidade} {"->"}{" "}
          {Number(saldoDepois || 0).toLocaleString("pt-BR")} {unidade}
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 1, p: "0 18px 18px" }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            p: "8px",
            borderRadius: "6px",
            textTransform: "none",
            color: "text.secondary",
            borderColor: "divider",
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          sx={{
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            p: "8px",
            borderRadius: "6px",
            textTransform: "none",
            bgcolor: buttonColor,
            "&:hover": { bgcolor: buttonColor },
          }}
        >
          {saving ? "Gravando..." : "Confirmar"}
        </Button>
      </Box>
    </Dialog>
  );
}
