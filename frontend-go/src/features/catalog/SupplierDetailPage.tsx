import { useEffect, useMemo, useState } from "react";
import { GoApi } from "../../api/client";
import { DetailLoading } from "../../components/DetailLoading";
import { DeleteDialog, PageLayout, ResourceTable, RowActions, StatusBadge } from "../../components/ui";
import { Button } from "../../components/ui/button";
import { Contract, Supplier } from "../../types/domain";

export function SupplierDetailPage({
  api,
  supplier,
  run,
  refreshLists,
  onCreateContract,
  onEditSupplier,
  onViewContract,
  onEditContract,
  loading = false,
}: {
  api: GoApi;
  supplier?: Supplier;
  run: (work: () => Promise<string | void>) => Promise<void>;
  refreshLists: () => Promise<void>;
  onCreateContract: (supplier: Supplier) => void;
  onEditSupplier: (supplier: Supplier) => void;
  onViewContract: (contract: Contract) => void;
  onEditContract: (contract: Contract) => void;
  loading?: boolean;
}) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);

  async function loadContracts(supplierId: number) {
    const result = await api.get<Contract[]>(`/contracts/?supplierId=${supplierId}&limit=100`);
    setContracts(result);
  }

  useEffect(() => {
    if (!supplier) return;
    void run(async () => {
      setContractsLoading(true);
      try {
        await loadContracts(supplier.id);
      } finally {
        setContractsLoading(false);
      }
    });
  }, [supplier?.id]);

  const activeContracts = useMemo(() => contracts.filter((contract) => contract.active).length, [contracts]);
  const totalAmount = useMemo(() => contracts.reduce((total, contract) => total + Number(contract.totalAmount || 0), 0), [contracts]);

  if (!supplier && loading) {
    return <DetailLoading breadcrumbs={["Dashboard", "Cadastros", "Fornecedores", "Detalhe"]} title="Carregando fornecedor" tableColumns={["Numero", "Inicio", "Fim", "Valor", "Status", "Acoes"]} />;
  }

  if (!supplier) {
    return (
      <PageLayout breadcrumbs={["Dashboard", "Cadastros", "Fornecedores", "Detalhe"]} title="Fornecedor nao encontrado">
        <div className="info-panel">Nao foi possivel encontrar esse fornecedor na lista carregada.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      breadcrumbs={["Dashboard", "Cadastros", "Fornecedores", supplier.name]}
      title={supplier.name}
      primaryAction={
        <div className="mt-6 flex gap-3">
          <Button type="button" variant="outline" onClick={() => onEditSupplier(supplier)}>
            Editar fornecedor
          </Button>
          <Button type="button" onClick={() => onCreateContract(supplier)}>
            Novo contrato
          </Button>
        </div>
      }
    >
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-border bg-[var(--color-surface-raised)] p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Info label="Documento" value={supplier.document} />
            <Info label="Tipo" value={supplier.supplierType} />
            <Info label="Municipio" value={supplier.city || "-"} />
            <Info label="UF" value={supplier.state || "-"} />
            <Info label="Contato" value={supplier.contactName || "-"} />
            <Info label="Telefone" value={supplier.phone || "-"} />
            <Info label="Email" value={supplier.email || "-"} />
            <Info label="Endereco" value={supplier.address || "-"} />
            <Info label="CEP" value={supplier.postalCode || "-"} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-[var(--color-surface-raised)] p-4">
          <h3 className="mb-4 text-sm font-bold text-foreground">Resumo dos contratos</h3>
          <div className="grid gap-3">
            <Metric label="Contratos" value={String(contracts.length)} />
            <Metric label="Ativos" value={String(activeContracts)} />
            <Metric label="Valor total" value={totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
          </div>
        </section>
      </div>

      <ResourceTable
        rows={contracts}
        countLabel={`${contracts.length} contratos`}
        loading={contractsLoading}
        columns={[
          { label: "Numero", render: (row) => row.number },
          { label: "Inicio", render: (row) => row.startDate },
          { label: "Fim", render: (row) => row.endDate },
          { label: "Valor", render: (row) => Number(row.totalAmount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
          { label: "Status", render: (row) => <StatusBadge active={row.active} /> },
          { label: "Acoes", render: (row) => <RowActions onView={() => onViewContract(row)} onEdit={() => onEditContract(row)} onDelete={() => setDeleteTarget(row)} /> },
        ]}
      />

      <DeleteDialog
        open={Boolean(deleteTarget)}
        resourceName="contrato"
        itemName={deleteTarget?.number || ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          void run(async () => {
            await api.delete(`/contracts/${target.id}`);
            await loadContracts(supplier.id);
            await refreshLists();
            return "Contrato excluido.";
          });
        }}
      />
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 px-3 py-2">
      <span className="block text-xs font-bold uppercase text-muted-foreground">{label}</span>
      <strong className="mt-1 block text-lg font-bold text-foreground">{value}</strong>
    </div>
  );
}
