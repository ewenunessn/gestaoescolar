import { useState } from "react";
import { GoApi } from "../../api/client";
import { PlusIcon } from "../../components/icons";
import { DeleteDialog, PageLayout, ResourceTable, RowActions, StatusBadge } from "../../components/ui";
import { Button } from "../../components/ui/button";
import { EducationModality } from "../../types/domain";

export function ModalitiesPage({
  api,
  modalities,
  loading = false,
  onCreate,
  onEdit,
  onDelete,
}: {
  api: GoApi;
  modalities: EducationModality[];
  loading?: boolean;
  onCreate: () => void;
  onEdit: (modality: EducationModality) => void;
  onDelete: (modality: EducationModality) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<EducationModality | null>(null);
  void api;

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cadastros", "Modalidades"]}
      title="Modalidades"
      primaryAction={
        <Button className="mt-6" type="button" onClick={onCreate}>
          <PlusIcon />
          Nova Modalidade
        </Button>
      }
    >
      <ResourceTable
        rows={modalities}
        countLabel={`${modalities.length} registros`}
        loading={loading}
        columns={[
          { label: "Nome", render: (row) => row.name },
          { label: "Descricao", render: (row) => row.description || "-" },
          { label: "Status", render: (row) => <StatusBadge active={row.active} /> },
          { label: "Acoes", render: (row) => <RowActions onEdit={() => onEdit(row)} onDelete={() => setDeleteTarget(row)} /> },
        ]}
      />
      <DeleteDialog
        open={Boolean(deleteTarget)}
        resourceName="modalidade"
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
