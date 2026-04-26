import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";

import { getTipoMovimentacaoColor, getTipoMovimentacaoLabel, formatarDataHora } from "../../../services/estoqueCentralService";

interface TimelineEvent {
  id: number;
  produto_nome?: string;
  tipo_evento?: string;
  tipo_movimentacao?: string;
  origem?: string;
  quantidade_movimentada: number;
  data_movimentacao: string;
  usuario_nome?: string;
  motivo?: string | null;
  observacoes?: string | null;
}

interface StockTimelineProps {
  eventos: TimelineEvent[];
  emptyLabel?: string;
}

export function StockTimeline({ eventos, emptyLabel = "Nenhuma movimentação encontrada." }: StockTimelineProps) {
  if (!eventos.length) {
    return (
      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {emptyLabel}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={1.5}>
      {eventos.map((evento) => {
        const tipo = evento.tipo_evento || evento.tipo_movimentacao || "movimentacao";
        return (
          <Card key={evento.id} sx={{ borderRadius: 4, border: "1px solid rgba(15,23,42,0.08)" }}>
            <CardContent sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, justifyContent: "space-between" }}>
              <div>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {evento.produto_nome || "Movimentação de estoque"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatarDataHora(evento.data_movimentacao)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {evento.motivo || evento.observacoes || "Sem observação adicional"}
                </Typography>
              </div>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                <Chip
                  label={getTipoMovimentacaoLabel(tipo)}
                  color={getTipoMovimentacaoColor(tipo) as any}
                  size="small"
                />
                {evento.origem ? <Chip label={evento.origem} size="small" variant="outlined" /> : null}
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {Number(evento.quantidade_movimentada || 0).toLocaleString("pt-BR")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {evento.usuario_nome || "Sem usuário"}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
