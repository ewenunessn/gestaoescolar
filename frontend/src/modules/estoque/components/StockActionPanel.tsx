import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Typography,
} from "@mui/material";
import AddCircleOutlineRounded from "@mui/icons-material/AddCircleOutlineRounded";
import RemoveCircleOutlineRounded from "@mui/icons-material/RemoveCircleOutlineRounded";
import RuleFolderRounded from "@mui/icons-material/RuleFolderRounded";
import TimelineRounded from "@mui/icons-material/TimelineRounded";
import CompareArrowsRounded from "@mui/icons-material/CompareArrowsRounded";

export interface StockActionPanelProps {
  onEntrada: () => void;
  onSaida: () => void;
  onAjuste: () => void;
  onHistorico: () => void;
  onTransferencia?: () => void;
  disabled?: boolean;
  selectedLabel?: string | null;
}

const buttonStyle = {
  minWidth: 180,
  borderRadius: 999,
  px: 2,
  py: 1.15,
  textTransform: "none",
  fontWeight: 700,
};

export function StockActionPanel({
  onEntrada,
  onSaida,
  onAjuste,
  onHistorico,
  onTransferencia,
  disabled = false,
  selectedLabel,
}: StockActionPanelProps) {
  return (
    <Card
      sx={{
        mb: 3,
        borderRadius: 4,
        border: "1px solid rgba(12, 26, 42, 0.08)",
        background:
          "radial-gradient(circle at top left, rgba(15,76,129,0.12) 0%, rgba(15,76,129,0.02) 40%), linear-gradient(135deg, #0f172a 0%, #13263f 48%, #173754 100%)",
        color: "#f8fafc",
        boxShadow: "0 24px 48px rgba(15, 23, 42, 0.24)",
      }}
    >
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: "0.18em", opacity: 0.72 }}>
              Mesa de operação
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif' }}>
              Lançamentos com contexto, não no escuro
            </Typography>
            <Typography variant="body2" sx={{ maxWidth: 720, color: "rgba(226,232,240,0.84)" }}>
              Escolha a ação operacional e confirme o impacto antes de gravar. O sistema deve sempre mostrar saldo antes e saldo depois.
            </Typography>
          </Box>
          <Chip
            label={selectedLabel ? `Item selecionado: ${selectedLabel}` : "Selecione um item na tabela para lançar"}
            sx={{
              alignSelf: "flex-start",
              bgcolor: selectedLabel ? "rgba(187,247,208,0.16)" : "rgba(255,255,255,0.08)",
              color: "#f8fafc",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          />
        </Box>
        <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap" }}>
          <Button sx={buttonStyle} variant="contained" color="success" startIcon={<AddCircleOutlineRounded />} onClick={onEntrada} disabled={disabled}>
            Registrar entrada
          </Button>
          <Button sx={buttonStyle} variant="contained" color="info" startIcon={<RemoveCircleOutlineRounded />} onClick={onSaida} disabled={disabled}>
            Registrar saída
          </Button>
          <Button sx={buttonStyle} variant="contained" color="warning" startIcon={<RuleFolderRounded />} onClick={onAjuste} disabled={disabled}>
            Registrar ajuste
          </Button>
          {onTransferencia ? (
            <Button sx={buttonStyle} variant="outlined" startIcon={<CompareArrowsRounded />} onClick={onTransferencia} disabled={disabled}>
              Transferir para escola
            </Button>
          ) : null}
          <Button sx={buttonStyle} variant="outlined" startIcon={<TimelineRounded />} onClick={onHistorico}>
            Histórico
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
