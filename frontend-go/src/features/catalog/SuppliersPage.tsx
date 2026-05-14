import { useState } from "react";
import { GoApi } from "../../api/client";
import { PlusIcon } from "../../components/icons";
import { DeleteDialog, PageLayout, ResourceTable, RowActions, StatusBadge } from "../../components/ui";
import { Button } from "../../components/ui/button";
import { Supplier } from "../../types/domain";

export function SuppliersPage({
  api,
  suppliers,
  loading = false,
  onCreate,
  onView,
  onEdit,
  onDelete,
}: {
  api: GoApi;
  suppliers: Supplier[];
  loading?: boolean;
  onCreate: () => void;
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  void api;

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cadastros", "Fornecedores"]}
      title="Fornecedores"
      primaryAction={
        <Button className="mt-6" type="button" onClick={onCreate}>
          <PlusIcon />
          Novo Fornecedor
        </Button>
      }
    >
      <ResourceTable
        rows={suppliers}
        countLabel={`${suppliers.length} registros`}
        loading={loading}
        columns={[
          { label: "Nome", render: (row) => row.name },
          { label: "Documento", render: (row) => row.document },
          { label: "Tipo", render: (row) => row.supplierType },
          { label: "Municipio", render: (row) => row.city || "-" },
          { label: "Contato", render: (row) => row.contactName || row.phone || "-" },
          { label: "Status", render: (row) => <StatusBadge active={row.active} /> },
          { label: "Acoes", render: (row) => <RowActions onView={() => onView(row)} onEdit={() => onEdit(row)} onDelete={() => setDeleteTarget(row)} /> },
        ]}
      />
      <DeleteDialog
        open={Boolean(deleteTarget)}
        resourceName="fornecedor"
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
