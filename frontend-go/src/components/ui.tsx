import { ReactNode } from "react";
import { ArrowDownIcon, ArrowLeftIcon, CheckCircleIcon, EyeIcon, FilterIcon, MoreVerticalIcon, PencilIcon, SearchIcon, TrashIcon, XCircleIcon } from "./icons";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card as ShadcnCard, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogActions } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} type={type} placeholder={placeholder} />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </Select>
    </label>
  );
}

export function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <ShadcnCard className="border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-4">
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </ShadcnCard>
  );
}

export function DataTable<T extends { id: number }>({
  rows,
  columns,
}: {
  rows: T[];
  columns: Array<{ label: string; render: (row: T) => ReactNode }>;
}) {
  return (
    <div className="table-wrap">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.label}>{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="muted">
                Nenhum registro carregado.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((column) => (
                  <TableCell key={column.label}>{column.render(row)}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function PageLayout({
  breadcrumbs,
  title,
  primaryAction,
  children,
}: {
  breadcrumbs: string[];
  title: string;
  primaryAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ml-4 mt-4 flex min-h-[calc(100vh-56px)] flex-col rounded-l-2xl border border-[var(--color-border-soft)] bg-card px-4 pb-4 pt-6 text-card-foreground shadow-sm">
      <div className="mb-7 flex items-start justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Button type="button" variant="ghost" size="sm" className="-ml-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => window.history.back()}>
              <ArrowLeftIcon className="size-4" />
              Voltar
            </Button>
            <span className="text-[var(--color-subtle)]">|</span>
            <div className="flex flex-wrap gap-2">
              {breadcrumbs.map((item, index) => (
                <span key={`${item}-${index}`}>
                  {item}
                  {index < breadcrumbs.length - 1 && <b className="ml-2 font-medium text-[var(--color-subtle)]">&gt;</b>}
                </span>
              ))}
            </div>
          </div>
          <h2 className="mt-6 text-[22px] font-bold tracking-normal text-foreground">{title}</h2>
        </div>
        {primaryAction}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      className={
        active
          ? "min-h-[25px] border-[#23873c] bg-[#22c55e1f] px-2.5 text-[#39c85a]"
          : "min-h-[25px] border-[#6b7280] bg-[#6b728026] px-2.5 text-[#d1d5db]"
      }
    >
      {active ? <CheckCircleIcon className="size-3.5" /> : <XCircleIcon className="size-3.5" />}
      {active ? "Ativa" : "Inativa"}
    </Badge>
  );
}

export function RowActions({ onView, onEdit, onDelete }: { onView?: () => void; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="flex items-center gap-2.5">
      {onView && (
        <Button type="button" variant="secondary" size="icon" className="size-[34px] border-border bg-secondary text-primary" aria-label="Visualizar" onClick={onView}>
          <EyeIcon />
        </Button>
      )}
      <Button type="button" variant="secondary" size="icon" className="size-[34px] border-border bg-secondary text-[#17baf5]" aria-label="Editar" onClick={onEdit}>
        <PencilIcon />
      </Button>
      <Button type="button" variant="secondary" size="icon" className="size-[34px] border-border bg-secondary text-[#ff6458]" aria-label="Excluir" onClick={onDelete}>
        <TrashIcon />
      </Button>
    </div>
  );
}

export function DeleteDialog({
  open,
  resourceName,
  itemName,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  resourceName: string;
  itemName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      title={`Excluir ${resourceName}`}
      description={`Tem certeza que deseja excluir "${itemName}"? Essa acao nao pode ser desfeita.`}
    >
      <DialogActions>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm}>
          Excluir
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ResourceTable<T extends { id: number }>({
  rows,
  countLabel,
  columns,
  loading = false,
}: {
  rows: T[];
  countLabel: string;
  columns: Array<{ label: string; render: (row: T) => ReactNode }>;
  loading?: boolean;
}) {
  const showRows = rows.length > 0 && !loading;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-[var(--color-surface-raised)]">
      <div className="flex min-h-[60px] items-center justify-between gap-4 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-[18px] w-1 rounded-full bg-primary" />
          {countLabel}
        </div>
        <div className="flex items-center gap-2.5">
          <Button type="button" variant="secondary" size="icon" className="size-[34px] border-border bg-secondary text-muted-foreground" aria-label="Pesquisar">
            <SearchIcon />
          </Button>
          <Button type="button" variant="secondary" size="icon" className="size-[34px] border-border bg-secondary text-muted-foreground" aria-label="Filtrar">
            <FilterIcon />
          </Button>
          <Button type="button" variant="secondary" size="icon" className="size-[34px] border-border bg-secondary text-muted-foreground" aria-label="Mais opcoes">
            <MoreVerticalIcon />
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-[var(--color-surface-raised)]">
        <Table className="w-full table-fixed text-foreground">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.label} className="h-[47px] bg-[var(--color-surface-raised)] px-4 text-xs font-extrabold text-foreground">
                  <span className="inline-flex items-center gap-2.5">
                    {column.label}
                    <ArrowDownIcon className="size-[15px] text-[var(--color-subtle)]" />
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          {loading && (
            <TableBody>
              {Array.from({ length: 8 }).map((_, rowIndex) => (
                <TableRow key={`loading-${rowIndex}`}>
                  {columns.map((column, columnIndex) => (
                    <TableCell key={`${column.label}-${columnIndex}`} className="h-[47px] px-4">
                      <div
                        className="h-3.5 max-w-full animate-pulse rounded-full bg-muted/50"
                        style={{ width: `${columnIndex === columns.length - 1 ? 72 : 96 + ((rowIndex + columnIndex) % 4) * 34}px` }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          )}
          {showRows && (
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((column) => (
                    <TableCell key={column.label} className="h-[47px] overflow-hidden px-4 text-xs font-semibold text-foreground">
                      <div className="truncate">{column.render(row)}</div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
        {!loading && rows.length === 0 && (
          <div className="flex min-h-[320px] flex-1 items-center justify-center px-4 py-10">
            <div className="flex max-w-[360px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 px-6 py-8 text-center">
              <strong className="text-sm font-bold text-foreground">Nenhum registro encontrado</strong>
              <span className="text-sm leading-5 text-muted-foreground">Quando houver dados cadastrados, eles aparecem nesta lista.</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex min-h-[62px] items-center justify-end gap-5 px-4 py-2.5 text-xs text-muted-foreground">
        <span>Linhas:</span>
        <strong className="text-foreground">50</strong>
        <span>{loading ? "..." : rows.length === 0 ? "0-0 de 0" : `1-${rows.length} de ${rows.length}`}</span>
        <Button type="button" variant="secondary" size="icon" className="size-[34px] border-border bg-secondary text-muted-foreground" aria-label="Pagina anterior">
          ‹
        </Button>
        <Button type="button" variant="secondary" size="icon" className="size-[34px] border-border bg-secondary text-muted-foreground" aria-label="Proxima pagina">
          ›
        </Button>
      </div>
    </section>
  );
}
