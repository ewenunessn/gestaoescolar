import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import EstoqueEscolar from "./EstoqueEscolar";

vi.mock("../../../services/escolas", () => ({
  listarEscolas: vi.fn().mockResolvedValue([{ id: 1, nome: "Escola Aurora" }]),
}));

vi.mock("../../../services/estoqueEscolarService", () => ({
  listarEstoqueEscola: vi.fn().mockResolvedValue([
    {
      produto_id: 10,
      produto_nome: "Arroz",
      categoria: "Graos",
      unidade: "KG",
      quantidade_atual: 12,
      quantidade_minima: 0,
      quantidade_maxima: 0,
      data_ultima_atualizacao: null,
      observacoes: null,
    },
  ]),
  listarHistoricoEscola: vi.fn().mockResolvedValue([]),
  registrarMovimentacao: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({
    errorLoad: vi.fn(),
    errorSave: vi.fn(),
    successSave: vi.fn(),
    warningRequired: vi.fn(),
  }),
}));

describe("EstoqueEscolar", () => {
  it("enables toolbar actions after selecting a stock item", async () => {
    render(
      <MemoryRouter>
        <EstoqueEscolar />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Registrar entrada")).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
    fireEvent.click(await screen.findByText("Escola Aurora"));

    await waitFor(() => {
      expect(screen.getByText("Arroz")).toBeInTheDocument();
    });

    const entradaButton = screen.getByRole("button", { name: /Entrada/i });
    expect(entradaButton).toBeDisabled();

    const row = screen.getByText("Arroz").closest("tr");

    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("Graos")).toBeInTheDocument();

    fireEvent.click(row as HTMLElement);

    expect(entradaButton).toBeEnabled();
    fireEvent.click(entradaButton);

    expect(
      await screen.findByRole("heading", { name: "Registrar entrada" }),
    ).toBeInTheDocument();
  });
});
