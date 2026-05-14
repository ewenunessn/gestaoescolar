import { FormEvent, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { EventClickArg, EventContentArg } from "@fullcalendar/core";
import { GoApi, toIdList, toNumber } from "../../api/client";
import { DetailLoading } from "../../components/DetailLoading";
import { PlusIcon } from "../../components/icons";
import { Card, DeleteDialog, Field, PageLayout, ResourceTable, RowActions, SelectField, StatusBadge } from "../../components/ui";
import { Button } from "../../components/ui/button";
import { Dialog, DialogActions } from "../../components/ui/dialog";
import { EducationModality, Meal, Menu, MenuPreparation, Preparation } from "../../types/domain";

type Submit = (event: FormEvent, work: () => Promise<string | void>) => void;

type MenuPreparationForm = {
  date: string;
  mealId: string;
  preparationId: string;
  notes: string;
  active: string;
};

const emptyMenuPreparationForm: MenuPreparationForm = {
  date: "",
  mealId: "",
  preparationId: "",
  notes: "",
  active: "true",
};

export function MenusPage({
  menus,
  loading = false,
  onCreate,
  onView,
  onEdit,
  onDelete,
}: {
  menus: Menu[];
  loading?: boolean;
  onCreate: () => void;
  onView: (menu: Menu) => void;
  onEdit: (menu: Menu) => void;
  onDelete: (menu: Menu) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<Menu | null>(null);

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cardapios", "Cardapios"]}
      title="Cardapios"
      primaryAction={
        <Button className="mt-6" type="button" onClick={onCreate}>
          <PlusIcon />
          Novo Cardapio
        </Button>
      }
    >
      <ResourceTable
        rows={menus}
        countLabel={`${menus.length} registros`}
        loading={loading}
        columns={[
          { label: "Nome", render: (row) => row.name },
          { label: "Competencia", render: (row) => `${String(row.month).padStart(2, "0")}/${row.year}` },
          { label: "Periodo", render: (row) => `${row.startDate} a ${row.endDate}` },
          { label: "Modalidades", render: (row) => (row.educationModalityIds?.length ? `${row.educationModalityIds.length} modalidades` : "-") },
          { label: "Status", render: (row) => <StatusBadge active={row.active} /> },
          { label: "Acoes", render: (row) => <RowActions onView={() => onView(row)} onEdit={() => onEdit(row)} onDelete={() => setDeleteTarget(row)} /> },
        ]}
      />
      <DeleteDialog
        open={Boolean(deleteTarget)}
        resourceName="cardapio"
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

export function MenuFormPage({
  api,
  item,
  modalities,
  form,
  setForm,
  refreshLists,
  submit,
  onBack,
}: {
  api: GoApi;
  item?: Menu;
  modalities: EducationModality[];
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
      year: String(item.year || ""),
      month: String(item.month || ""),
      startDate: item.startDate || "",
      endDate: item.endDate || "",
      educationModalityIds: Array.isArray(item.educationModalityIds) ? item.educationModalityIds.join(",") : "",
      active: String(item.active),
    });
  }, [item?.id]);

  return (
    <PageLayout breadcrumbs={["Dashboard", "Cardapios", "Cardapios", item ? "Editar" : "Novo"]} title={item ? "Editar cardapio" : "Novo cardapio"}>
      <Card title="Dados do cardapio">
        <form
          onSubmit={(event) =>
            submit(event, async () => {
              const payload = {
                name: form.name,
                description: form.description,
                year: toNumber(form.year),
                month: toNumber(form.month),
                startDate: form.startDate,
                endDate: form.endDate,
                educationModalityIds: toIdList(form.educationModalityIds || ""),
                replaceModalities: true,
                active: form.active === "true",
              };
              if (item) await api.put<Menu>(`/menus/${item.id}`, payload);
              else await api.post<Menu>("/menus/", payload);
              await refreshLists();
              onBack();
              return item ? "Cardapio atualizado." : "Cardapio criado.";
            })
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Nome" value={form.name || ""} onChange={(name) => setForm({ ...form, name })} />
            <Field label="Ano" type="number" value={form.year || ""} onChange={(year) => setForm({ ...form, year })} />
            <Field label="Mes" type="number" value={form.month || ""} onChange={(month) => setForm({ ...form, month })} />
            <SelectField label="Status" value={form.active || "true"} onChange={(active) => setForm({ ...form, active })}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </SelectField>
            <Field label="Inicio" type="date" value={form.startDate || ""} onChange={(startDate) => setForm({ ...form, startDate })} />
            <Field label="Fim" type="date" value={form.endDate || ""} onChange={(endDate) => setForm({ ...form, endDate })} />
            <SelectField label="Adicionar modalidade" value="" onChange={(id) => id && setForm({ ...form, educationModalityIds: appendId(form.educationModalityIds || "", id) })}>
              <option value="">Selecione</option>
              {modalities.map((modality) => (
                <option key={modality.id} value={modality.id}>
                  {modality.name}
                </option>
              ))}
            </SelectField>
            <Field label="IDs das modalidades" value={form.educationModalityIds || ""} onChange={(educationModalityIds) => setForm({ ...form, educationModalityIds })} />
            <div className="md:col-span-2 xl:col-span-4">
              <Field label="Descricao" value={form.description || ""} onChange={(description) => setForm({ ...form, description })} />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onBack}>
              Voltar para cardapios
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Card>
    </PageLayout>
  );
}

export function MenuAssemblyPage({
  api,
  menu,
  loading = false,
  meals,
  preparations,
  modalities,
  submit,
  run,
  refreshLists,
  onEdit,
}: {
  api: GoApi;
  menu?: Menu;
  loading?: boolean;
  meals: Meal[];
  preparations: Preparation[];
  modalities: EducationModality[];
  submit: Submit;
  run: (work: () => Promise<string | void>) => Promise<void>;
  refreshLists: () => Promise<void>;
  onEdit: (menu: Menu) => void;
}) {
  const [items, setItems] = useState<MenuPreparation[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuPreparation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuPreparation | null>(null);
  const [form, setForm] = useState<MenuPreparationForm>(emptyMenuPreparationForm);

  async function loadItems(menuId: number) {
    const result = await api.get<MenuPreparation[]>(`/menus/${menuId}/preparations/?limit=100`);
    setItems(result);
  }

  useEffect(() => {
    if (!menu) return;
    void run(async () => {
      setItemsLoading(true);
      try {
        await loadItems(menu.id);
      } finally {
        setItemsLoading(false);
      }
    });
  }, [menu?.id]);

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.day - b.day || a.mealName.localeCompare(b.mealName)), [items]);
  const calendarEvents = useMemo(
    () =>
      menu
        ? sortedItems
            .map((item) => ({
              id: String(item.id),
              title: `${item.mealName} - ${item.preparationName}`,
              start: dateFromMenuDay(menu, item.day),
              allDay: true,
              extendedProps: { item },
            }))
            .filter((event) => event.start)
        : [],
    [menu, sortedItems],
  );

  function startCreate(date?: string) {
    setEditing(null);
    setForm({ ...emptyMenuPreparationForm, date: date || menu?.startDate || "" });
    setDialogOpen(true);
  }

  function startEdit(item: MenuPreparation) {
    setEditing(item);
    setForm({
      date: menu ? dateFromMenuDay(menu, item.day) : "",
      mealId: String(item.mealId),
      preparationId: String(item.preparationId),
      notes: item.notes || "",
      active: String(item.active !== false),
    });
    setDialogOpen(true);
  }

  function handleDateClick(arg: DateClickArg) {
    if (!menu) return;
    if (!isDateInMenuRange(menu, arg.dateStr)) return;
    startCreate(arg.dateStr);
  }

  function handleEventClick(arg: EventClickArg) {
    const item = arg.event.extendedProps.item as MenuPreparation | undefined;
    if (item) startEdit(item);
  }

  function renderEventContent(arg: EventContentArg) {
    const item = arg.event.extendedProps.item as MenuPreparation | undefined;
    if (!item) return <span>{arg.event.title}</span>;
    return (
      <div className="menu-calendar-event">
        <strong>{item.mealName}</strong>
        <span>{item.preparationName}</span>
      </div>
    );
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyMenuPreparationForm);
    setDialogOpen(false);
  }

  if (!menu && loading) {
    return <DetailLoading breadcrumbs={["Dashboard", "Cardapios", "Montagem"]} title="Carregando cardapio" tableColumns={["Dia", "Refeicao", "Preparacao", "Status", "Acoes"]} />;
  }

  if (!menu) {
    return (
      <PageLayout breadcrumbs={["Dashboard", "Cardapios", "Montagem"]} title="Cardapio nao encontrado">
        <div className="info-panel">Nao foi possivel encontrar esse cardapio na lista carregada.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cardapios", "Cardapios", menu.name, "Montagem"]}
      title={`Montar ${menu.name}`}
      primaryAction={
        <div className="mt-6 flex gap-3">
          <Button type="button" variant="outline" onClick={() => onEdit(menu)}>
            Editar cardapio
          </Button>
          <Button type="button" onClick={() => startCreate()}>
            <PlusIcon />
            Adicionar preparacao
          </Button>
        </div>
      }
    >
      <section className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-border bg-[var(--color-surface-raised)] p-4">
          <h3 className="mb-4 text-sm font-bold text-foreground">Dados do cardapio</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Competencia" value={`${String(menu.month).padStart(2, "0")}/${menu.year}`} />
            <Info label="Inicio" value={menu.startDate} />
            <Info label="Fim" value={menu.endDate} />
            <div>
              <span className="mb-1 block text-xs font-bold uppercase text-muted-foreground">Status</span>
              <StatusBadge active={menu.active} />
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{menu.description || "Nenhuma descricao cadastrada para este cardapio."}</p>
        </div>
        <div className="rounded-xl border border-border bg-[var(--color-surface-raised)] p-4">
          <h3 className="mb-4 text-sm font-bold text-foreground">Resumo</h3>
          <Metric label="Preparacoes" value={String(items.length)} />
          <Metric label="Modalidades" value={resolveModalityNames(menu.educationModalityIds, modalities) || "-"} />
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-[var(--color-surface-raised)]">
        <div className="flex min-h-[60px] items-center justify-between gap-4 border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-[18px] w-1 rounded-full bg-primary" />
            {itemsLoading ? "Carregando montagem..." : `${items.length} preparacoes`}
          </div>
        </div>

        <div className="menu-calendar min-h-0 flex-1 p-4">
          {itemsLoading ? (
            <div className="grid h-full min-h-[520px] grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
              {Array.from({ length: 14 }).map((_, index) => (
                <div key={index} className="bg-[var(--color-surface-raised)] p-3">
                  <div className="mb-4 h-4 w-16 animate-pulse rounded-full bg-muted/50" />
                  <div className="grid gap-2">
                    <div className="h-10 animate-pulse rounded-lg bg-muted/40" />
                    <div className="h-10 animate-pulse rounded-lg bg-muted/40" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridWeek"
              locale={ptBrLocale}
              initialDate={menu.startDate || undefined}
              validRange={{ start: menu.startDate, end: addOneDay(menu.endDate) }}
              headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridWeek,dayGridMonth" }}
              buttonText={{ today: "Hoje", week: "Semana", month: "Mes" }}
              events={calendarEvents}
              eventContent={renderEventContent}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              dayMaxEvents={3}
              height="auto"
              expandRows
              fixedWeekCount={false}
            />
          )}
        </div>
      </section>

      <Dialog open={dialogOpen} title={editing ? "Editar preparacao no cardapio" : "Adicionar preparacao ao cardapio"}>
        <form
          className="mt-5"
          onSubmit={(event) =>
            submit(event, async () => {
              const payload = {
                day: dayFromMenuDate(menu, form.date),
                mealId: toNumber(form.mealId),
                preparationId: toNumber(form.preparationId),
                notes: form.notes,
                active: form.active === "true",
              };
              if (editing) await api.put<MenuPreparation>(`/menus/${menu.id}/preparations/${editing.id}`, payload);
              else await api.post<MenuPreparation>(`/menus/${menu.id}/preparations/`, payload);
              await loadItems(menu.id);
              await refreshLists();
              resetForm();
              return editing ? "Preparacao atualizada no cardapio." : "Preparacao adicionada ao cardapio.";
            })
          }
        >
          <div className="grid grid-cols-1 gap-4">
            <Field label="Data" type="date" value={form.date} onChange={(date) => setForm({ ...form, date })} />
            <SelectField label="Refeicao" value={form.mealId} onChange={(mealId) => setForm({ ...form, mealId })}>
              <option value="">Selecione</option>
              {meals.map((meal) => (
                <option key={meal.id} value={meal.id}>
                  {meal.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Preparacao" value={form.preparationId} onChange={(preparationId) => setForm({ ...form, preparationId })}>
              <option value="">Selecione</option>
              {preparations.map((preparation) => (
                <option key={preparation.id} value={preparation.id}>
                  {preparation.name}
                </option>
              ))}
            </SelectField>
            <Field label="Observacoes" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
            <SelectField label="Status" value={form.active} onChange={(active) => setForm({ ...form, active })}>
              <option value="true">Ativa</option>
              <option value="false">Inativa</option>
            </SelectField>
          </div>
          <DialogActions>
            {editing && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setDeleteTarget(editing);
                  setDialogOpen(false);
                }}
              >
                Excluir
              </Button>
            )}
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button>{editing ? "Salvar preparacao" : "Adicionar preparacao"}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <DeleteDialog
        open={Boolean(deleteTarget)}
        resourceName="preparacao do cardapio"
        itemName={deleteTarget?.preparationName || ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          void run(async () => {
            await api.delete(`/menus/${menu.id}/preparations/${target.id}`);
            await loadItems(menu.id);
            await refreshLists();
            return "Preparacao removida do cardapio.";
          });
        }}
      />
    </PageLayout>
  );
}

function appendId(current: string, id: string) {
  const ids = new Set(
    current
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  ids.add(id);
  return Array.from(ids).join(",");
}

function resolveModalityNames(ids: number[] | null | undefined, modalities: EducationModality[]) {
  return (ids || [])
    .map((id) => modalities.find((modality) => modality.id === id)?.name)
    .filter(Boolean)
    .join(", ");
}

type CalendarDay = {
  date: string;
  dayOfMonth: number;
  inRange: boolean;
};

function buildCalendarWeeks(startDate: string, endDate: string): CalendarDay[][] {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  if (!start || !end || start.date > end.date) return [];

  const cursor = new Date(start.date);
  cursor.setDate(cursor.getDate() - cursor.getDay());

  const last = new Date(end.date);
  last.setDate(last.getDate() + (6 - last.getDay()));

  const days: CalendarDay[] = [];
  while (cursor <= last) {
    const date = toDateInputValue(cursor);
    days.push({
      date,
      dayOfMonth: cursor.getDate(),
      inRange: cursor >= start.date && cursor <= end.date,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks: CalendarDay[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }
  return weeks;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day, date: new Date(year, month - 1, day) };
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromMenuDay(menu: Menu, day: number) {
  const weeks = buildCalendarWeeks(menu.startDate, menu.endDate);
  const match = weeks.flat().find((date) => date.inRange && date.dayOfMonth === day);
  return match?.date || "";
}

function dayFromMenuDate(menu: Menu, date: string) {
  const parsed = parseDateInput(date);
  if (!parsed) throw new Error("Informe a data da preparacao no cardapio.");
  const start = parseDateInput(menu.startDate);
  const end = parseDateInput(menu.endDate);
  if (start && end && (parsed.date < start.date || parsed.date > end.date)) {
    throw new Error("A data precisa estar dentro do periodo do cardapio.");
  }
  return parsed.day;
}

function isDateInMenuRange(menu: Menu, date: string) {
  const parsed = parseDateInput(date);
  const start = parseDateInput(menu.startDate);
  const end = parseDateInput(menu.endDate);
  return Boolean(parsed && start && end && parsed.date >= start.date && parsed.date <= end.date);
}

function addOneDay(date: string) {
  const parsed = parseDateInput(date);
  if (!parsed) return date;
  const next = new Date(parsed.date);
  next.setDate(next.getDate() + 1);
  return toDateInputValue(next);
}

function formatShortDate(date: string) {
  const parsed = parseDateInput(date);
  if (!parsed) return date;
  return `${String(parsed.day).padStart(2, "0")}/${String(parsed.month).padStart(2, "0")}`;
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
    <div className="mb-3 rounded-lg border border-border bg-card/40 px-3 py-2">
      <span className="block text-xs font-bold uppercase text-muted-foreground">{label}</span>
      <strong className="mt-1 block text-sm font-bold text-foreground">{value}</strong>
    </div>
  );
}
