import { Card, CardContent, Grid, Typography } from "@mui/material";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import LocalShippingRounded from "@mui/icons-material/LocalShippingRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import InsightsRounded from "@mui/icons-material/InsightsRounded";

interface StockSummaryItem {
  quantidade_atual: number;
}

interface StockSummaryCardsProps {
  items: StockSummaryItem[];
  titlePrefix?: string;
}

const cardStyle = {
  borderRadius: 4,
  border: "1px solid rgba(11, 31, 58, 0.08)",
  boxShadow: "0 18px 40px rgba(17, 24, 39, 0.08)",
  background: "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(244,248,252,0.96) 100%)",
};

export default function StockSummaryCards({ items, titlePrefix = "Estoque" }: StockSummaryCardsProps) {
  const totalItens = items.length;
  const comEstoque = items.filter((item) => Number(item.quantidade_atual) > 0).length;
  const semEstoque = items.filter((item) => Number(item.quantidade_atual) <= 0).length;
  const saldoTotal = items.reduce((acc, item) => acc + Number(item.quantidade_atual || 0), 0);

  const cards = [
    { label: `${titlePrefix} monitorado`, value: totalItens, accent: "#0f4c81", icon: <Inventory2Rounded /> },
    { label: "Itens com saldo", value: comEstoque, accent: "#2f855a", icon: <LocalShippingRounded /> },
    { label: "Itens sem saldo", value: semEstoque, accent: "#c05621", icon: <WarningAmberRounded /> },
    { label: "Saldo total", value: saldoTotal.toLocaleString("pt-BR"), accent: "#6b46c1", icon: <InsightsRounded /> },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} lg={3} key={card.label}>
          <Card sx={cardStyle}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography
                component="span"
                sx={{
                  width: 46,
                  height: 46,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "16px",
                  color: "#fff",
                  backgroundColor: card.accent,
                  boxShadow: `0 14px 24px ${card.accent}33`,
                }}
              >
                {card.icon}
              </Typography>
              <div>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary" }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {card.label}
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
