import { PlusIcon } from "../../components/icons";
import { PageLayout, ResourceTable, RowActions, StatusBadge } from "../../components/ui";
import { Button } from "../../components/ui/button";

type PlaceholderRow = {
  id: number;
  name: string;
};

export function CatalogPlaceholderPage({ title }: { title: string }) {
  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cadastros", title]}
      title={title}
      primaryAction={
        <Button className="mt-6" type="button">
          <PlusIcon />
          Novo
        </Button>
      }
    >
      <ResourceTable<PlaceholderRow>
        rows={[]}
        countLabel="0 registros"
        columns={[
          { label: "Nome", render: (row) => row.name },
          { label: "Status", render: () => <StatusBadge active={false} /> },
          { label: "Acoes", render: () => <RowActions /> },
        ]}
      />
    </PageLayout>
  );
}
