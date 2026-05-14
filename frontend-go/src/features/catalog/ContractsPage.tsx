import { useState } from "react";
import { GoApi } from "../../api/client";
import { PlusIcon } from "../../components/icons";
import { DeleteDialog, PageLayout, ResourceTable, RowActions, StatusBadge } from "../../components/ui";
import { Button } from "../../components/ui/button";
import { Contract } from "../../types/domain";

export function ContractsPage({
  api,
  contracts,
  loading = false,
  onCreate,
  onView,
  onEdit,
  onDelete,
}: {
  api: GoApi;
  contracts: Contract[];
  loading?: boolean;
  onCreate: () => void;
  onView: (contract: Contract) => void;
  onEdit: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  void api;

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cadastros", "Contratos"]}
      title="Contratos"
      primaryAction={
        <Button className="mt-6" type="button" onClick={onCreate}>
          <PlusIcon />
          Novo Contrato
        </Button>
      }
    >
      <ResourceTable
        rows={contracts}
        countLabel={`${contracts.length} registros`}
        loading={loading}
        columns={[
          { label: "Numero", render: (row) => row.number },
          { label: "Fornecedor", render: (row) => row.supplierName || row.supplierId },
          { label: "Inicio", render: (row) => row.startDate },
          { label: "Fim", render: (row) => row.endDate },
          { label: "Valor", render: (row) => Number(row.totalAmount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
          { label: "Status", render: (row) => <StatusBadge active={row.active} /> },
          { label: "Acoes", render: (row) => <RowActions onView={() => onView(row)} onEdit={() => onEdit(row)} onDelete={() => setDeleteTarget(row)} /> },
        ]}
      />
      <DeleteDialog
        open={Boolean(deleteTarget)}
        resourceName="contrato"
        itemName={deleteTarget?.number || ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </PageLayout>
  );
}
