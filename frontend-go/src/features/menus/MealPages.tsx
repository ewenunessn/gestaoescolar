import { FormEvent, useEffect, useState } from "react";
import { GoApi, toNumber } from "../../api/client";
import { DetailLoading } from "../../components/DetailLoading";
import { PlusIcon } from "../../components/icons";
import { Card, DeleteDialog, Field, PageLayout, ResourceTable, RowActions, SelectField, StatusBadge } from "../../components/ui";
import { Button } from "../../components/ui/button";
import { Meal } from "../../types/domain";

type Submit = (event: FormEvent, work: () => Promise<string | void>) => void;

export function MealsPage({
  meals,
  loading = false,
  onCreate,
  onView,
  onEdit,
  onDelete,
}: {
  meals: Meal[];
  loading?: boolean;
  onCreate: () => void;
  onView: (meal: Meal) => void;
  onEdit: (meal: Meal) => void;
  onDelete: (meal: Meal) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<Meal | null>(null);

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cardapios", "Refeicoes"]}
      title="Refeicoes"
      primaryAction={
        <Button className="mt-6" type="button" onClick={onCreate}>
          <PlusIcon />
          Nova Refeicao
        </Button>
      }
    >
      <ResourceTable
        rows={meals}
        countLabel={`${meals.length} registros`}
        loading={loading}
        columns={[
          { label: "Nome", render: (row) => row.name },
          { label: "Codigo", render: (row) => row.code },
          { label: "Ordem", render: (row) => row.sortOrder },
          { label: "Status", render: (row) => <StatusBadge active={row.active} /> },
          { label: "Acoes", render: (row) => <RowActions onView={() => onView(row)} onEdit={() => onEdit(row)} onDelete={() => setDeleteTarget(row)} /> },
        ]}
      />
      <DeleteDialog
        open={Boolean(deleteTarget)}
        resourceName="refeicao"
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

export function MealFormPage({
  api,
  item,
  form,
  setForm,
  refreshLists,
  submit,
  onBack,
}: {
  api: GoApi;
  item?: Meal;
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
      code: item.code || "",
      sortOrder: String(item.sortOrder || 1),
      active: String(item.active),
    });
  }, [item?.id]);

  return (
    <PageLayout breadcrumbs={["Dashboard", "Cardapios", "Refeicoes", item ? "Editar" : "Nova"]} title={item ? "Editar refeicao" : "Nova refeicao"}>
      <Card title="Dados da refeicao">
        <form
          onSubmit={(event) =>
            submit(event, async () => {
              const payload = {
                name: form.name,
                code: form.code,
                sortOrder: toNumber(form.sortOrder || "1"),
                active: form.active === "true",
              };
              if (item) await api.put<Meal>(`/meals/${item.id}`, payload);
              else await api.post<Meal>("/meals/", payload);
              await refreshLists();
              onBack();
              return item ? "Refeicao atualizada." : "Refeicao criada.";
            })
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Nome" value={form.name || ""} onChange={(name) => setForm({ ...form, name })} />
            <Field label="Codigo" value={form.code || ""} onChange={(code) => setForm({ ...form, code })} />
            <Field label="Ordem" type="number" value={form.sortOrder || "1"} onChange={(sortOrder) => setForm({ ...form, sortOrder })} />
            <SelectField label="Status" value={form.active || "true"} onChange={(active) => setForm({ ...form, active })}>
              <option value="true">Ativa</option>
              <option value="false">Inativa</option>
            </SelectField>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onBack}>
              Voltar para refeicoes
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Card>
    </PageLayout>
  );
}

export function MealDetailPage({ meal, loading = false, onEdit }: { meal?: Meal; loading?: boolean; onEdit: (meal: Meal) => void }) {
  if (!meal && loading) {
    return <DetailLoading breadcrumbs={["Dashboard", "Cardapios", "Refeicoes", "Detalhe"]} title="Carregando refeicao" />;
  }

  if (!meal) {
    return (
      <PageLayout breadcrumbs={["Dashboard", "Cardapios", "Refeicoes", "Detalhe"]} title="Refeicao nao encontrada">
        <div className="info-panel">Nao foi possivel encontrar essa refeicao na lista carregada.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cardapios", "Refeicoes", meal.name]}
      title={meal.name}
      primaryAction={
        <Button type="button" className="mt-6" onClick={() => onEdit(meal)}>
          Editar refeicao
        </Button>
      }
    >
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-border bg-[var(--color-surface-raised)] p-4">
          <h3 className="mb-4 text-sm font-bold text-foreground">Dados da refeicao</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Nome" value={meal.name} />
            <Info label="Codigo" value={meal.code} />
            <Info label="Ordem" value={String(meal.sortOrder)} />
            <div>
              <span className="mb-1 block text-xs font-bold uppercase text-muted-foreground">Status</span>
              <StatusBadge active={meal.active} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-[var(--color-surface-raised)] p-4">
          <h3 className="mb-4 text-sm font-bold text-foreground">Resumo</h3>
          <Metric label="Codigo" value={meal.code} />
        </div>
      </section>
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
      <strong className="mt-1 block truncate text-lg font-bold text-foreground">{value}</strong>
    </div>
  );
}
