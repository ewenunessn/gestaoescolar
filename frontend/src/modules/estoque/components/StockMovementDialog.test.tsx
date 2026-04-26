import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StockMovementDialog } from "./StockMovementDialog";

describe("StockMovementDialog", () => {
  it("shows a saldo preview before confirming a saída", () => {
    render(
      <StockMovementDialog
        open
        mode="saida"
        title="Registrar saída"
        produtoNome="Arroz"
        unidade="KG"
        saldoAtual={12}
        onClose={() => {}}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "5" } });

    expect(screen.getByText("Saldo depois: 7 KG")).toBeInTheDocument();
  });
});
