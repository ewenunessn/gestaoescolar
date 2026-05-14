import { useState } from "react";
import { GoApi } from "../../api/client";
import { PlusIcon } from "../../components/icons";
import { DeleteDialog, PageLayout, ResourceTable, RowActions, StatusBadge } from "../../components/ui";
import { Button } from "../../components/ui/button";
import { EducationModality, School } from "../../types/domain";

export function SchoolsPage({
  api,
  schools,
  modalities,
  loading = false,
  onCreate,
  onView,
  onEdit,
  onDelete,
}: {
  api: GoApi;
  schools: School[];
  modalities: EducationModality[];
  loading?: boolean;
  onCreate: () => void;
  onView: (school: School) => void;
  onEdit: (school: School) => void;
  onDelete: (school: School) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  void api;
  void modalities;

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cadastros", "Escolas"]}
      title="Escolas"
      primaryAction={
        <Button className="mt-6" type="button" onClick={onCreate}>
          <PlusIcon />
          Nova Escola
        </Button>
      }
    >
      <ResourceTable
        rows={schools}
        countLabel={`${schools.length} registros`}
        loading={loading}
        columns={[
          { label: "Nome", render: (row) => row.name },
          { label: "Total Alunos", render: (row) => row.totalStudents ?? 0 },
          { label: "Modalidades", render: (row) => (row.modalities && row.modalities.length > 0 ? row.modalities.join(", ") : "-") },
          { label: "Municipio", render: (row) => row.city || "-" },
          { label: "Administracao", render: (row) => row.administrationType || "municipal" },
          { label: "Status", render: (row) => <StatusBadge active={row.active} /> },
          { label: "Acoes", render: (row) => <RowActions onView={() => onView(row)} onEdit={() => onEdit(row)} onDelete={() => setDeleteTarget(row)} /> },
        ]}
      />
      <DeleteDialog
        open={Boolean(deleteTarget)}
        resourceName="escola"
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
