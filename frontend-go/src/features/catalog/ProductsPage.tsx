import { useState } from "react";
import { GoApi } from "../../api/client";
import { PlusIcon } from "../../components/icons";
import { DeleteDialog, PageLayout, ResourceTable, RowActions, StatusBadge } from "../../components/ui";
import { Button } from "../../components/ui/button";
import { Product } from "../../types/domain";

export function ProductsPage({
  api,
  products,
  loading = false,
  onCreate,
  onView,
  onEdit,
  onDelete,
}: {
  api: GoApi;
  products: Product[];
  loading?: boolean;
  onCreate: () => void;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  void api;

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cadastros", "Produtos"]}
      title="Produtos"
      primaryAction={
        <Button className="mt-6" type="button" onClick={onCreate}>
          <PlusIcon />
          Novo Produto
        </Button>
      }
    >
      <ResourceTable
        rows={products}
        countLabel={`${products.length} registros`}
        loading={loading}
        columns={[
          { label: "Nome", render: (row) => row.name },
          { label: "Categoria", render: (row) => row.category || "-" },
          { label: "Unidade", render: (row) => row.unit },
          { label: "Fator", render: (row) => row.fator_correcao },
          { label: "Status", render: (row) => <StatusBadge active={row.active} /> },
          { label: "Acoes", render: (row) => <RowActions onView={() => onView(row)} onEdit={() => onEdit(row)} onDelete={() => setDeleteTarget(row)} /> },
        ]}
      />
      <DeleteDialog
        open={Boolean(deleteTarget)}
        resourceName="produto"
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
