import { PageLayout, ResourceTable } from "./ui";

export function DetailLoading({
  breadcrumbs,
  title,
  tableColumns,
}: {
  breadcrumbs: string[];
  title: string;
  tableColumns?: string[];
}) {
  return (
    <PageLayout breadcrumbs={breadcrumbs} title={title}>
      <div className="grid gap-4">
        <section className="rounded-xl border border-border bg-[var(--color-surface-raised)] p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="grid gap-2">
                <div className="h-3 w-24 animate-pulse rounded-full bg-muted/50" />
                <div className="h-4 w-40 animate-pulse rounded-full bg-muted/50" />
              </div>
            ))}
          </div>
        </section>
        {tableColumns && (
          <ResourceTable
            rows={[]}
            countLabel="..."
            loading
            columns={tableColumns.map((label) => ({
              label,
              render: () => null,
            }))}
          />
        )}
      </div>
    </PageLayout>
  );
}
