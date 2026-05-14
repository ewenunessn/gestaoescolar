import { FormEvent, useEffect, useMemo, useState } from "react";
import { GoApi, toNumber } from "../../api/client";
import { DetailLoading } from "../../components/DetailLoading";
import { DeleteDialog, Field, PageLayout, ResourceTable, RowActions, SelectField, StatusBadge } from "../../components/ui";
import { Button } from "../../components/ui/button";
import { Dialog, DialogActions } from "../../components/ui/dialog";
import { PlusIcon } from "../../components/icons";
import { Contract, ContractProduct, Product } from "../../types/domain";

type ProductForm = {
  productId: string;
  quantity: string;
  unitPrice: string;
  notes: string;
  active: string;
};

const emptyProductForm: ProductForm = {
  productId: "",
  quantity: "1",
  unitPrice: "0",
  notes: "",
  active: "true",
};

export function ContractDetailPage({
  api,
  contract,
  products,
  submit,
  run,
  refreshLists,
  onEdit,
  loading = false,
}: {
  api: GoApi;
  contract?: Contract;
  products: Product[];
  submit: (event: FormEvent, work: () => Promise<string | void>) => void;
  run: (work: () => Promise<string | void>) => Promise<void>;
  refreshLists: () => Promise<void>;
  onEdit: (contract: Contract) => void;
  loading?: boolean;
}) {
  const [items, setItems] = useState<ContractProduct[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [editing, setEditing] = useState<ContractProduct | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContractProduct | null>(null);

  async function loadItems(contractId: number) {
    const result = await api.get<ContractProduct[]>(`/contracts/${contractId}/products/?limit=100`);
    setItems(result);
  }

  useEffect(() => {
    if (!contract) return;
    void run(async () => {
      setItemsLoading(true);
      try {
        await loadItems(contract.id);
      } finally {
        setItemsLoading(false);
      }
    });
  }, [contract?.id]);

  const activeItems = useMemo(() => items.filter((item) => item.active), [items]);
  const totalAmount = useMemo(() => activeItems.reduce((total, item) => total + Number(item.totalAmount || 0), 0), [activeItems]);

  function startEdit(item: ContractProduct) {
    setEditing(item);
    setForm({
      productId: String(item.productId),
      quantity: item.quantity || "1",
      unitPrice: item.unitPrice || "0",
      notes: item.notes || "",
      active: String(item.active),
    });
    setProductDialogOpen(true);
  }

  function startCreate() {
    setEditing(null);
    setForm(emptyProductForm);
    setProductDialogOpen(true);
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyProductForm);
    setProductDialogOpen(false);
  }

  if (!contract && loading) {
    return <DetailLoading breadcrumbs={["Dashboard", "Cadastros", "Contratos", "Detalhe"]} title="Carregando contrato" tableColumns={["Produto", "Quantidade", "Preco unitario", "Total", "Status", "Acoes"]} />;
  }

  if (!contract) {
    return (
      <PageLayout breadcrumbs={["Dashboard", "Cadastros", "Contratos", "Detalhe"]} title="Contrato nao encontrado">
        <div className="info-panel">Nao foi possivel encontrar esse contrato na lista carregada.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cadastros", "Contratos", contract.number]}
      title={`Contrato ${contract.number}`}
      primaryAction={
        <div className="mt-6 flex gap-3">
          <Button type="button" variant="outline" onClick={() => onEdit(contract)}>
            Editar contrato
          </Button>
          <Button type="button" onClick={startCreate}>
            <PlusIcon />
            Adicionar produto
          </Button>
        </div>
      }
    >
      <section className="mb-4 rounded-xl border border-border bg-[var(--color-surface-raised)] p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Info label="Fornecedor" value={contract.supplierName || String(contract.supplierId)} />
          <Info label="Inicio" value={contract.startDate} />
          <Info label="Fim" value={contract.endDate} />
          <Info label="Tipo" value={contract.contractType} />
          <Info label="Valor total" value={totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
          <div>
            <span className="mb-1 block text-xs font-bold uppercase text-muted-foreground">Status</span>
            <StatusBadge active={contract.active} />
          </div>
        </div>
      </section>

      <ResourceTable
        rows={items}
        countLabel={`${items.length} produtos`}
        loading={itemsLoading}
        columns={[
          { label: "Produto", render: (row) => row.productName || row.productId },
          { label: "Quantidade", render: (row) => row.quantity },
          { label: "Preco unitario", render: (row) => Number(row.unitPrice || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
          { label: "Total", render: (row) => Number(row.totalAmount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
          { label: "Status", render: (row) => <StatusBadge active={row.active} /> },
          { label: "Acoes", render: (row) => <RowActions onEdit={() => startEdit(row)} onDelete={() => setDeleteTarget(row)} /> },
        ]}
      />

      <Dialog open={productDialogOpen} title={editing ? "Editar produto do contrato" : "Adicionar produto ao contrato"}>
        <form
          className="mt-5"
          onSubmit={(event) =>
            submit(event, async () => {
              const payload = {
                productId: toNumber(form.productId),
                quantity: form.quantity,
                unitPrice: form.unitPrice,
                notes: form.notes,
                active: form.active === "true",
              };
              if (editing) await api.put<ContractProduct>(`/contracts/${contract.id}/products/${editing.id}`, payload);
              else await api.post<ContractProduct>(`/contracts/${contract.id}/products/`, payload);
              await loadItems(contract.id);
              await refreshLists();
              resetForm();
              return editing ? "Produto do contrato atualizado." : "Produto adicionado ao contrato.";
            })
          }
        >
          <div className="grid grid-cols-1 gap-4">
            <SelectField label="Produto" value={form.productId} onChange={(productId) => setForm({ ...form, productId })}>
              <option value="">Selecione</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.unit})
                </option>
              ))}
            </SelectField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Quantidade" type="number" value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} />
              <Field label="Preco unitario" type="number" value={form.unitPrice} onChange={(unitPrice) => setForm({ ...form, unitPrice })} />
            </div>
            <Field label="Observacoes" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
            <SelectField label="Status" value={form.active} onChange={(active) => setForm({ ...form, active })}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </SelectField>
          </div>
          <DialogActions>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button>{editing ? "Salvar produto" : "Adicionar produto"}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <DeleteDialog
        open={Boolean(deleteTarget)}
        resourceName="produto do contrato"
        itemName={deleteTarget?.productName || ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          void run(async () => {
            await api.delete(`/contracts/${contract.id}/products/${target.id}`);
            await loadItems(contract.id);
            await refreshLists();
            return "Produto removido do contrato.";
          });
        }}
      />
    </PageLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs font-bold uppercase text-muted-foreground">{label}</span>
      <strong className="mt-1 block text-sm font-semibold text-foreground">{value}</strong>
    </div>
  );
}
