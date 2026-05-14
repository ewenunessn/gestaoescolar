import { FormEvent, useEffect, useState } from "react";
import { GoApi } from "../../api/client";
import { PlusIcon } from "../../components/icons";
import { Card, Field, PageLayout, ResourceTable, SelectField } from "../../components/ui";
import { Button } from "../../components/ui/button";
import { Dialog, DialogActions } from "../../components/ui/dialog";
import { CentralStockBalance, Product, School, SchoolStockBalance, StockMovement } from "../../types/domain";

type Submit = (event: FormEvent, work: () => Promise<string | void>) => void;
type Run = (work: () => Promise<string | void>) => Promise<void>;

type MovementForm = {
  productId: string;
  movementType: string;
  quantity: string;
  adjustmentDirection: string;
  occurredAt: string;
  description: string;
  referenceDocument: string;
  destinationSchoolId: string;
};

const today = new Date().toISOString().slice(0, 10);

const emptyMovementForm = (): MovementForm => ({
  productId: "",
  movementType: "entrada",
  quantity: "",
  adjustmentDirection: "increase",
  occurredAt: today,
  description: "",
  referenceDocument: "",
  destinationSchoolId: "",
});

export function CentralStockPage({
  api,
  products,
  schools,
  submit,
  run,
}: {
  api: GoApi;
  products: Product[];
  schools: School[];
  submit: Submit;
  run: Run;
}) {
  const [balances, setBalances] = useState<CentralStockBalance[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<MovementForm>(emptyMovementForm);

  async function loadStock() {
    setLoading(true);
    try {
      const [nextBalances, nextMovements] = await Promise.all([
        api.get<CentralStockBalance[]>("/central-stock/balances"),
        api.get<StockMovement[]>("/central-stock/movements?limit=100"),
      ]);
      setBalances(nextBalances);
      setMovements(nextMovements);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void run(loadStock);
  }, []);

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Abastecimento", "Almoxarifado Central"]}
      title="Almoxarifado central"
      primaryAction={
        <Button className="mt-6" type="button" onClick={() => setDialogOpen(true)}>
          <PlusIcon />
          Nova movimentacao
        </Button>
      }
    >
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <ResourceTable
          rows={balances.map((item) => ({ ...item, id: item.productId }))}
          countLabel={`${balances.length} saldos`}
          loading={loading}
          columns={[
            { label: "Produto", render: (row) => row.productName },
            { label: "Saldo", render: (row) => `${formatQuantity(row.quantity)} ${row.productUnit}` },
          ]}
        />
        <MovementsTable rows={movements} loading={loading} countLabel={`${movements.length} movimentos`} />
      </div>

      <MovementDialog
        open={dialogOpen}
        title="Nova movimentacao no central"
        form={form}
        setForm={setForm}
        products={products}
        schools={schools}
        submit={submit}
        onCancel={() => {
          setDialogOpen(false);
          setForm(emptyMovementForm());
        }}
        onSubmit={async () => {
          await api.post<StockMovement>("/central-stock/movements", movementPayload(form));
          await loadStock();
          setDialogOpen(false);
          setForm(emptyMovementForm());
          return "Movimentacao registrada no almoxarifado.";
        }}
      />
    </PageLayout>
  );
}

export function SchoolStockPage({
  api,
  products,
  schools,
  submit,
  run,
}: {
  api: GoApi;
  products: Product[];
  schools: School[];
  submit: Submit;
  run: Run;
}) {
  const [schoolId, setSchoolId] = useState("");
  const [balances, setBalances] = useState<SchoolStockBalance[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<MovementForm>(emptyMovementForm);

  useEffect(() => {
    if (!schoolId && schools[0]) setSchoolId(String(schools[0].id));
  }, [schools, schoolId]);

  async function loadStock(selectedSchoolId = schoolId) {
    if (!selectedSchoolId) return;
    setLoading(true);
    try {
      const [nextBalances, nextMovements] = await Promise.all([
        api.get<SchoolStockBalance[]>(`/schools/${selectedSchoolId}/stock/balances`),
        api.get<StockMovement[]>(`/schools/${selectedSchoolId}/stock/movements?limit=100`),
      ]);
      setBalances(nextBalances);
      setMovements(nextMovements);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!schoolId) return;
    void run(() => loadStock(schoolId));
  }, [schoolId]);

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Estoque", "Estoque Escola"]}
      title="Estoque da escola"
      primaryAction={
        <Button className="mt-6" type="button" disabled={!schoolId} onClick={() => setDialogOpen(true)}>
          <PlusIcon />
          Nova movimentacao
        </Button>
      }
    >
      <Card title="Escola">
        <div className="max-w-[420px]">
          <SelectField label="Escola" value={schoolId} onChange={setSchoolId}>
            <option value="">Selecione</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </SelectField>
        </div>
      </Card>

      <div className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <ResourceTable
          rows={balances.map((item) => ({ ...item, id: item.productId }))}
          countLabel={`${balances.length} saldos`}
          loading={loading}
          columns={[
            { label: "Produto", render: (row) => row.productName },
            { label: "Saldo", render: (row) => `${formatQuantity(row.quantity)} ${row.productUnit}` },
          ]}
        />
        <MovementsTable rows={movements} loading={loading} countLabel={`${movements.length} movimentos`} />
      </div>

      <MovementDialog
        open={dialogOpen}
        title="Nova movimentacao na escola"
        form={form}
        setForm={setForm}
        products={products}
        schools={[]}
        transferTargetLabel="Almoxarifado central"
        submit={submit}
        onCancel={() => {
          setDialogOpen(false);
          setForm(emptyMovementForm());
        }}
        onSubmit={async () => {
          await api.post<StockMovement>(`/schools/${schoolId}/stock/movements`, movementPayload(form));
          await loadStock();
          setDialogOpen(false);
          setForm(emptyMovementForm());
          return "Movimentacao registrada na escola.";
        }}
      />
    </PageLayout>
  );
}

function MovementsTable({ rows, loading, countLabel }: { rows: StockMovement[]; loading: boolean; countLabel: string }) {
  return (
    <ResourceTable
      rows={rows}
      countLabel={countLabel}
      loading={loading}
      columns={[
        { label: "Data", render: (row) => row.occurredAt },
        { label: "Tipo", render: (row) => movementLabel(row.movementType) },
        { label: "Produto", render: (row) => row.productName },
        { label: "Qtd.", render: (row) => `${formatQuantity(row.quantityDelta)} ${row.productUnit}` },
        { label: "Origem/Destino", render: (row) => movementCounterparty(row) },
        { label: "Documento", render: (row) => row.referenceDocument || "-" },
      ]}
    />
  );
}

function MovementDialog({
  open,
  title,
  form,
  setForm,
  products,
  schools,
  transferTargetLabel,
  submit,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  title: string;
  form: MovementForm;
  setForm: (form: MovementForm) => void;
  products: Product[];
  schools: School[];
  transferTargetLabel?: string;
  submit: Submit;
  onCancel: () => void;
  onSubmit: () => Promise<string | void>;
}) {
  return (
    <Dialog open={open} title={title}>
      <form className="mt-5" onSubmit={(event) => submit(event, onSubmit)}>
        <div className="grid grid-cols-1 gap-4">
          <SelectField label="Tipo" value={form.movementType} onChange={(movementType) => setForm({ ...form, movementType })}>
            <option value="entrada">Entrada</option>
            <option value="saida">Saida</option>
            <option value="transferencia">Transferencia</option>
            <option value="ajuste">Ajuste</option>
          </SelectField>
          <AutocompleteField
            label="Produto"
            value={form.productId}
            onChange={(productId) => setForm({ ...form, productId })}
            options={products.map((product) => ({ id: product.id, label: product.name, meta: product.unit }))}
            placeholder="Buscar produto"
          />
          <Field label="Quantidade" type="number" value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} />
          <Field label="Data" type="date" value={form.occurredAt} onChange={(occurredAt) => setForm({ ...form, occurredAt })} />
          {form.movementType === "ajuste" && (
            <SelectField label="Direcao do ajuste" value={form.adjustmentDirection} onChange={(adjustmentDirection) => setForm({ ...form, adjustmentDirection })}>
              <option value="increase">Aumentar saldo</option>
              <option value="decrease">Diminuir saldo</option>
            </SelectField>
          )}
          {form.movementType === "transferencia" && (
            transferTargetLabel ? (
              <div className="rounded-lg border border-border bg-card/50 px-3 py-3">
                <span className="block text-xs font-bold uppercase text-muted-foreground">Destino</span>
                <strong className="mt-1 block text-sm text-foreground">{transferTargetLabel}</strong>
              </div>
            ) : (
              <AutocompleteField
                label="Destino"
                value={form.destinationSchoolId}
                onChange={(destinationSchoolId) => setForm({ ...form, destinationSchoolId })}
                options={schools.map((school) => ({ id: school.id, label: school.name, meta: school.city || "" }))}
                placeholder="Buscar escola"
              />
            )
          )}
          <Field label="Documento" value={form.referenceDocument} onChange={(referenceDocument) => setForm({ ...form, referenceDocument })} />
          <Field label="Descricao" value={form.description} onChange={(description) => setForm({ ...form, description })} />
        </div>
        <DialogActions>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Registrar</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function AutocompleteField({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: Array<{ id: number; label: string; meta?: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const selected = options.find((option) => String(option.id) === value);
  const [query, setQuery] = useState(selected ? optionText(selected) : "");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setQuery(selected ? optionText(selected) : "");
  }, [selected?.id]);

  const normalizedQuery = normalize(query);
  const filtered = options
    .filter((option) => normalize(optionText(option)).includes(normalizedQuery))
    .slice(0, 8);

  function choose(option: { id: number; label: string; meta?: string }) {
    onChange(String(option.id));
    setQuery(optionText(option));
    setFocused(false);
  }

  return (
    <label className="field relative">
      <span>{label}</span>
      <input
        className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          const exact = options.find((option) => normalize(optionText(option)) === normalize(next));
          onChange(exact ? String(exact.id) : "");
        }}
      />
      {focused && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-auto rounded-lg border border-border bg-[var(--color-surface-raised)] p-1 shadow-xl">
          {filtered.map((option) => (
            <button
              key={option.id}
              type="button"
              className="group flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              <span className="min-w-0 truncate font-semibold">{option.label}</span>
              {option.meta && <span className="shrink-0 text-xs text-muted-foreground group-hover:text-primary-foreground group-focus:text-primary-foreground">{option.meta}</span>}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

function optionText(option: { label: string; meta?: string }) {
  return option.meta ? `${option.label} (${option.meta})` : option.label;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function movementPayload(form: MovementForm) {
  return {
    productId: Number(form.productId),
    movementType: form.movementType,
    quantity: form.quantity,
    adjustmentDirection: form.movementType === "ajuste" ? form.adjustmentDirection : "",
    occurredAt: form.occurredAt,
    description: form.description,
    referenceDocument: form.referenceDocument,
    destinationSchoolId: form.movementType === "transferencia" && form.destinationSchoolId ? Number(form.destinationSchoolId) : undefined,
  };
}

function movementLabel(value: string) {
  const labels: Record<string, string> = {
    entrada: "Entrada",
    saida: "Saida",
    transferencia: "Transferencia",
    ajuste: "Ajuste",
  };
  return labels[value] || value;
}

function movementCounterparty(row: StockMovement) {
  if (row.destinationSchool) return row.quantityDelta.startsWith("-") ? `Destino: ${row.destinationSchool}` : row.destinationSchool;
  if (row.sourceSchool) return row.quantityDelta.startsWith("-") ? row.sourceSchool : `Origem: ${row.sourceSchool}`;
  if (row.movementType === "transferencia" && !row.quantityDelta.startsWith("-")) return "Origem: Almoxarifado central";
  if (row.movementType === "transferencia" && row.quantityDelta.startsWith("-")) return "Destino: Almoxarifado central";
  return "-";
}

function formatQuantity(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(parsed);
}
