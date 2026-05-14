import { FormEvent, useEffect, useMemo, useState } from "react";
import { GoApi, toNumber } from "../../api/client";
import { DetailLoading } from "../../components/DetailLoading";
import { PlusIcon } from "../../components/icons";
import { Card, DeleteDialog, Field, PageLayout, ResourceTable, RowActions, SelectField, StatusBadge } from "../../components/ui";
import { Button } from "../../components/ui/button";
import { Dialog, DialogActions } from "../../components/ui/dialog";
import { EducationModality, Preparation, PreparationProduct, Product } from "../../types/domain";

type PrepProductForm = {
  productId: string;
  educationModalityId: string;
  perCapitaAmount: string;
  perCapitaUnit: string;
  active: string;
};

const emptyPrepProductForm: PrepProductForm = {
  productId: "",
  educationModalityId: "",
  perCapitaAmount: "100",
  perCapitaUnit: "g",
  active: "true",
};

type Submit = (event: FormEvent, work: () => Promise<string | void>) => void;

export function PreparationsPage({
  preparations,
  loading = false,
  onCreate,
  onView,
  onEdit,
  onDelete,
}: {
  preparations: Preparation[];
  loading?: boolean;
  onCreate: () => void;
  onView: (preparation: Preparation) => void;
  onEdit: (preparation: Preparation) => void;
  onDelete: (preparation: Preparation) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<Preparation | null>(null);

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cardapios", "Preparacoes"]}
      title="Preparacoes"
      primaryAction={
        <Button className="mt-6" type="button" onClick={onCreate}>
          <PlusIcon />
          Nova Preparacao
        </Button>
      }
    >
      <ResourceTable
        rows={preparations}
        countLabel={`${preparations.length} registros`}
        loading={loading}
        columns={[
          { label: "Nome", render: (row) => row.name },
          { label: "Tipo", render: (row) => row.preparationType },
          { label: "Descricao", render: (row) => row.description || "-" },
          { label: "Status", render: (row) => <StatusBadge active={row.active} /> },
          { label: "Acoes", render: (row) => <RowActions onView={() => onView(row)} onEdit={() => onEdit(row)} onDelete={() => setDeleteTarget(row)} /> },
        ]}
      />
      <DeleteDialog
        open={Boolean(deleteTarget)}
        resourceName="preparacao"
        itemName={deleteTarget?.name || ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </PageLayout>
  );
}

export function PreparationFormPage({
  api,
  item,
  form,
  setForm,
  refreshLists,
  submit,
  onBack,
}: {
  api: GoApi;
  item?: Preparation;
  form: Record<string, string>;
  setForm: (form: Record<string, string>) => void;
  refreshLists: () => Promise<void>;
  submit: Submit;
  onBack: () => void;
}) {
  useEffect(() => {
    if (!item) return;
    setForm({
      name: item.name || "",
      description: item.description || "",
      preparationType: item.preparationType || "meal",
      active: String(item.active),
    });
  }, [item?.id]);

  return (
    <PageLayout breadcrumbs={["Dashboard", "Cardapios", "Preparacoes", item ? "Editar" : "Nova"]} title={item ? "Editar preparacao" : "Nova preparacao"}>
      <Card title="Dados da preparacao">
        <form
          onSubmit={(event) =>
            submit(event, async () => {
              const payload = { ...form, active: form.active === "true" };
              if (item) await api.put<Preparation>(`/preparations/${item.id}`, payload);
              else await api.post<Preparation>("/preparations/", payload);
              await refreshLists();
              onBack();
              return item ? "Preparacao atualizada." : "Preparacao criada.";
            })
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Nome" value={form.name || ""} onChange={(name) => setForm({ ...form, name })} />
            <Field label="Tipo" value={form.preparationType || "meal" } onChange={(preparationType) => setForm({ ...form, preparationType })} />
            <SelectField label="Status" value={form.active || "true"} onChange={(active) => setForm({ ...form, active })}>
              <option value="true">Ativa</option>
              <option value="false">Inativa</option>
            </SelectField>
            <div className="md:col-span-2 xl:col-span-3">
              <Field label="Descricao" value={form.description || ""} onChange={(description) => setForm({ ...form, description })} />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onBack}>
              Voltar para preparacoes
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Card>
    </PageLayout>
  );
}

export function PreparationDetailPage({
  api,
  preparation,
  loading = false,
  products,
  modalities,
  submit,
  run,
  onEdit,
}: {
  api: GoApi;
  preparation?: Preparation;
  loading?: boolean;
  products: Product[];
  modalities: EducationModality[];
  submit: Submit;
  run: (work: () => Promise<string | void>) => Promise<void>;
  onEdit: (preparation: Preparation) => void;
}) {
  const [items, setItems] = useState<PreparationProduct[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PreparationProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PreparationProduct | null>(null);
  const [form, setForm] = useState<PrepProductForm>(emptyPrepProductForm);

  async function loadItems(preparationId: number) {
    const result = await api.get<PreparationProduct[]>(`/preparations/${preparationId}/products/?limit=100`);
    setItems(result);
  }

  useEffect(() => {
    if (!preparation) return;
    void run(async () => {
      setItemsLoading(true);
      try {
        await loadItems(preparation.id);
      } finally {
        setItemsLoading(false);
      }
    });
  }, [preparation?.id]);

  const activeItems = useMemo(() => items.filter((item) => item.active !== false).length, [items]);

  function startCreate() {
    setEditing(null);
    setForm(emptyPrepProductForm);
    setDialogOpen(true);
  }

  function startEdit(item: PreparationProduct) {
    setEditing(item);
    setForm({
      productId: String(item.productId),
      educationModalityId: item.educationModalityId ? String(item.educationModalityId) : "",
      perCapitaAmount: item.perCapitaAmount || "100",
      perCapitaUnit: item.perCapitaUnit || "g",
      active: String(item.active !== false),
    });
    setDialogOpen(true);
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyPrepProductForm);
    setDialogOpen(false);
  }

  if (!preparation && loading) {
    return <DetailLoading breadcrumbs={["Dashboard", "Cardapios", "Preparacoes", "Detalhe"]} title="Carregando preparacao" tableColumns={["Produto", "Modalidade", "Per capita", "Status", "Acoes"]} />;
  }

  if (!preparation) {
    return (
      <PageLayout breadcrumbs={["Dashboard", "Cardapios", "Preparacoes", "Detalhe"]} title="Preparacao nao encontrada">
        <div className="info-panel">Nao foi possivel encontrar essa preparacao na lista carregada.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cardapios", "Preparacoes", preparation.name]}
      title={preparation.name}
      primaryAction={
        <div className="mt-6 flex gap-3">
          <Button type="button" variant="outline" onClick={() => onEdit(preparation)}>
            Editar preparacao
          </Button>
          <Button type="button" onClick={startCreate}>
            <PlusIcon />
            Adicionar produto
          </Button>
        </div>
      }
    >
      <section className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-border bg-[var(--color-surface-raised)] p-4">
          <h3 className="mb-4 text-sm font-bold text-foreground">Dados da preparacao</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Info label="Nome" value={preparation.name} />
            <Info label="Tipo" value={preparation.preparationType} />
            <div>
              <span className="mb-1 block text-xs font-bold uppercase text-muted-foreground">Status</span>
              <StatusBadge active={preparation.active} />
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{preparation.description || "Nenhuma descricao cadastrada para esta preparacao."}</p>
        </div>
        <div className="rounded-xl border border-border bg-[var(--color-surface-raised)] p-4">
          <h3 className="mb-4 text-sm font-bold text-foreground">Resumo</h3>
          <Metric label="Produtos ativos" value={String(activeItems)} />
        </div>
      </section>

      <ResourceTable
        rows={items}
        countLabel={`${items.length} produtos`}
        loading={itemsLoading}
        columns={[
          { label: "Produto", render: (row) => row.productName || row.productId },
          { label: "Modalidade", render: (row) => row.educationModalityName || "Todas" },
          { label: "Per capita", render: (row) => `${row.perCapitaAmount}${row.perCapitaUnit}` },
          { label: "Status", render: (row) => <StatusBadge active={row.active !== false} /> },
          { label: "Acoes", render: (row) => <RowActions onEdit={() => startEdit(row)} onDelete={() => setDeleteTarget(row)} /> },
        ]}
      />

      <Dialog open={dialogOpen} title={editing ? "Editar produto da preparacao" : "Adicionar produto a preparacao"}>
        <form
          className="mt-5"
          onSubmit={(event) =>
            submit(event, async () => {
              const payload = {
                productId: toNumber(form.productId),
                educationModalityId: form.educationModalityId ? toNumber(form.educationModalityId) : null,
                perCapitaAmount: form.perCapitaAmount,
                perCapitaUnit: form.perCapitaUnit,
                active: form.active === "true",
              };
              if (editing) await api.put<PreparationProduct>(`/preparations/${preparation.id}/products/${editing.id}`, payload);
              else await api.post<PreparationProduct>(`/preparations/${preparation.id}/products/`, payload);
              await loadItems(preparation.id);
              resetForm();
              return editing ? "Produto da preparacao atualizado." : "Produto adicionado a preparacao.";
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
            <SelectField label="Modalidade" value={form.educationModalityId} onChange={(educationModalityId) => setForm({ ...form, educationModalityId })}>
              <option value="">Todas</option>
              {modalities.map((modality) => (
                <option key={modality.id} value={modality.id}>
                  {modality.name}
                </option>
              ))}
            </SelectField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Per capita" type="number" value={form.perCapitaAmount} onChange={(perCapitaAmount) => setForm({ ...form, perCapitaAmount })} />
              <SelectField label="Unidade" value={form.perCapitaUnit} onChange={(perCapitaUnit) => setForm({ ...form, perCapitaUnit })}>
                <option value="g">g</option>
                <option value="ml">ml</option>
              </SelectField>
            </div>
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
        resourceName="produto da preparacao"
        itemName={deleteTarget?.productName || ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          void run(async () => {
            await api.delete(`/preparations/${preparation.id}/products/${target.id}`);
            await loadItems(preparation.id);
            return "Produto removido da preparacao.";
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
      <strong className="mt-1 block truncate text-sm font-semibold text-foreground">{value}</strong>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 px-3 py-2">
      <span className="block text-xs font-bold uppercase text-muted-foreground">{label}</span>
      <strong className="mt-1 block text-lg font-bold text-foreground">{value}</strong>
    </div>
  );
}
