import { FormEvent, useEffect, useMemo, useState } from "react";
import { GoApi, toNumber } from "../../api/client";
import { DetailLoading } from "../../components/DetailLoading";
import { PlusIcon } from "../../components/icons";
import { DeleteDialog, Field, PageLayout, ResourceTable, RowActions, SelectField, StatusBadge } from "../../components/ui";
import { Button } from "../../components/ui/button";
import { Dialog, DialogActions } from "../../components/ui/dialog";
import { EducationModality, School, SchoolEducationModality } from "../../types/domain";

type LinkForm = {
  educationModalityId: string;
  studentCount: string;
  active: string;
};

export function SchoolDetailPage({
  api,
  school,
  modalities,
  submit,
  run,
  refreshLists,
  onEdit,
  loading = false,
}: {
  api: GoApi;
  school?: School;
  modalities: EducationModality[];
  submit: (event: FormEvent, work: () => Promise<string | void>) => void;
  run: (work: () => Promise<string | void>) => Promise<void>;
  refreshLists: () => Promise<void>;
  onEdit: (school: School) => void;
  loading?: boolean;
}) {
  const [links, setLinks] = useState<SchoolEducationModality[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [form, setForm] = useState<LinkForm>({ educationModalityId: "", studentCount: "0", active: "true" });
  const [editing, setEditing] = useState<SchoolEducationModality | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SchoolEducationModality | null>(null);

  async function loadLinks(schoolId: number) {
    const result = await api.get<SchoolEducationModality[]>(`/schools/${schoolId}/education-modalities/?limit=100`);
    setLinks(result);
  }

  useEffect(() => {
    if (!school) return;
    void run(async () => {
      setLinksLoading(true);
      try {
        await loadLinks(school.id);
      } finally {
        setLinksLoading(false);
      }
    });
  }, [school?.id]);

  const totalStudents = useMemo(() => links.filter((item) => item.active).reduce((total, item) => total + item.studentCount, 0), [links]);

  function startEdit(link: SchoolEducationModality) {
    setEditing(link);
    setForm({ educationModalityId: String(link.educationModalityId), studentCount: String(link.studentCount), active: String(link.active) });
    setLinkDialogOpen(true);
  }

  function startCreate() {
    setEditing(null);
    setForm({ educationModalityId: "", studentCount: "0", active: "true" });
    setLinkDialogOpen(true);
  }

  function resetForm() {
    setEditing(null);
    setForm({ educationModalityId: "", studentCount: "0", active: "true" });
    setLinkDialogOpen(false);
  }

  if (!school && loading) {
    return <DetailLoading breadcrumbs={["Dashboard", "Cadastros", "Escolas", "Detalhe"]} title="Carregando escola" tableColumns={["Modalidade", "Alunos", "Status", "Acoes"]} />;
  }

  if (!school) {
    return (
      <PageLayout breadcrumbs={["Dashboard", "Cadastros", "Escolas", "Detalhe"]} title="Escola nao encontrada">
        <div className="info-panel">Nao foi possivel encontrar essa escola na lista carregada.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cadastros", "Escolas", school.name]}
      title={school.name}
      primaryAction={
        <div className="mt-6 flex gap-3">
          <Button type="button" variant="outline" onClick={() => onEdit(school)}>
            Editar escola
          </Button>
          <Button type="button" onClick={startCreate}>
            <PlusIcon />
            Associar modalidade
          </Button>
        </div>
      }
    >
      <section className="mb-4 rounded-xl border border-border bg-[var(--color-surface-raised)] p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Info label="Codigo" value={school.code} />
          <Info label="Municipio" value={school.city} />
          <Info label="Administracao" value={school.administrationType || "municipal"} />
          <Info label="Endereco" value={school.address || "-"} />
          <Info label="Mapa" value={school.mapsAddress || "-"} />
          <Info label="Telefone" value={school.phone || "-"} />
          <Info label="Email" value={school.email || "-"} />
          <Info label="Responsavel" value={school.managerName || "-"} />
          <Info label="Alunos ativos" value={String(totalStudents)} />
        </div>
      </section>

      <ResourceTable
        rows={links}
        countLabel={`${links.length} modalidades`}
        loading={linksLoading}
        columns={[
          { label: "Modalidade", render: (row) => row.educationModalityName },
          { label: "Alunos", render: (row) => row.studentCount },
          { label: "Status", render: (row) => <StatusBadge active={row.active} /> },
          { label: "Acoes", render: (row) => <RowActions onEdit={() => startEdit(row)} onDelete={() => setDeleteTarget(row)} /> },
        ]}
      />

      <DeleteDialog
        open={Boolean(deleteTarget)}
        resourceName="modalidade da escola"
        itemName={deleteTarget?.educationModalityName || ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          void run(async () => {
            await api.delete(`/schools/${school.id}/education-modalities/${target.id}`);
            await loadLinks(school.id);
            await refreshLists();
            return "Modalidade removida da escola.";
          });
        }}
      />

      <Dialog open={linkDialogOpen} title={editing ? "Editar modalidade da escola" : "Associar modalidade"}>
        <form
          className="mt-5"
          onSubmit={(event) =>
            submit(event, async () => {
              const payload = {
                educationModalityId: toNumber(form.educationModalityId),
                studentCount: toNumber(form.studentCount),
                active: form.active === "true",
              };
              if (editing) await api.put<SchoolEducationModality>(`/schools/${school.id}/education-modalities/${editing.id}`, payload);
              else await api.post<SchoolEducationModality>(`/schools/${school.id}/education-modalities/`, payload);
              await loadLinks(school.id);
              await refreshLists();
              resetForm();
              return editing ? "Modalidade atualizada na escola." : "Modalidade associada a escola.";
            })
          }
        >
          <div className="grid grid-cols-1 gap-4">
            <SelectField label="Modalidade" value={form.educationModalityId} onChange={(educationModalityId) => setForm({ ...form, educationModalityId })}>
              <option value="">Selecione</option>
              {modalities.map((modality) => (
                <option key={modality.id} value={modality.id}>
                  {modality.name}
                </option>
              ))}
            </SelectField>
            <Field label="Quantidade de alunos" type="number" value={form.studentCount} onChange={(studentCount) => setForm({ ...form, studentCount })} />
            <SelectField label="Status" value={form.active} onChange={(active) => setForm({ ...form, active })}>
              <option value="true">Ativa</option>
              <option value="false">Inativa</option>
            </SelectField>
          </div>
          <DialogActions>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button>{editing ? "Salvar modalidade" : "Associar modalidade"}</Button>
          </DialogActions>
        </form>
      </Dialog>
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
