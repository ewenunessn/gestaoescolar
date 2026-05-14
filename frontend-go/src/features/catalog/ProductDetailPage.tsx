import { DetailLoading } from "../../components/DetailLoading";
import { PageLayout, StatusBadge } from "../../components/ui";
import { Button } from "../../components/ui/button";
import { Product } from "../../types/domain";

export function ProductDetailPage({ product, loading = false, onEdit }: { product?: Product; loading?: boolean; onEdit: (product: Product) => void }) {
  if (!product && loading) {
    return <DetailLoading breadcrumbs={["Dashboard", "Cadastros", "Produtos", "Detalhe"]} title="Carregando produto" />;
  }

  if (!product) {
    return (
      <PageLayout breadcrumbs={["Dashboard", "Cadastros", "Produtos", "Detalhe"]} title="Produto nao encontrado">
        <div className="info-panel">Nao foi possivel encontrar esse produto na lista carregada.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cadastros", "Produtos", product.name]}
      title={product.name}
      primaryAction={
        <Button type="button" className="mt-6" onClick={() => onEdit(product)}>
          Editar produto
        </Button>
      }
    >
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-border bg-[var(--color-surface-raised)] p-4">
          <h3 className="mb-4 text-sm font-bold text-foreground">Dados do produto</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Info label="Nome" value={product.name} />
            <Info label="Categoria" value={product.category || "-"} />
            <Info label="Unidade" value={product.unit || "-"} />
            <Info label="Fator de correcao" value={String(product.fator_correcao || 1)} />
            <div>
              <span className="mb-1 block text-xs font-bold uppercase text-muted-foreground">Status</span>
              <StatusBadge active={product.active} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-[var(--color-surface-raised)] p-4">
          <h3 className="mb-4 text-sm font-bold text-foreground">Resumo</h3>
          <div className="grid gap-3">
            <Metric label="Unidade" value={product.unit || "-"} />
            <Metric label="Categoria" value={product.category || "-"} />
            <Metric label="Status" value={product.active ? "Ativo" : "Inativo"} />
          </div>
        </div>
      </section>

      <section className="mt-4 min-h-0 flex-1 rounded-xl border border-border bg-[var(--color-surface-raised)] p-4">
        <h3 className="mb-3 text-sm font-bold text-foreground">Descricao</h3>
        <p className="max-w-4xl text-sm leading-6 text-muted-foreground">{product.description || "Nenhuma descricao cadastrada para este produto."}</p>
      </section>
    </PageLayout>
  );
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
    <div className="rounded-lg border border-border bg-card/40 px-3 py-2">
      <span className="block text-xs font-bold uppercase text-muted-foreground">{label}</span>
      <strong className="mt-1 block truncate text-lg font-bold text-foreground">{value}</strong>
    </div>
  );
}
