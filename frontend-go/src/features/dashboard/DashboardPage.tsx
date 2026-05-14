import { AuthState, GoConfig, saveConfig } from "../../api/client";
import { Card, Field } from "../../components/ui";
import { ToastVariant } from "../../components/ui/toast";

export function DashboardPage({
  auth,
  config,
  setConfig,
  toast,
  refreshLists,
  run,
}: {
  auth: AuthState;
  config: GoConfig;
  setConfig: (config: GoConfig) => void;
  toast: (toast: { variant: ToastVariant; title: string; description?: string }) => void;
  refreshLists: () => Promise<void>;
  run: (work: () => Promise<string | void>) => Promise<void>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Resumo da sessao">
        <div className="metrics">
          <span>{auth.user.name}</span>
          <span>{auth.tenant.slug}</span>
          <span>{auth.membership.role}</span>
        </div>
        <p className="muted">Use o menu lateral para consumir as APIs do backend Go por modulo.</p>
      </Card>
      <Card title="Conexao da API">
        <div className="form-grid">
          <Field label="Base URL" value={config.baseUrl} onChange={(baseUrl) => setConfig({ ...config, baseUrl })} />
          <Field label="Tenant ID" value={config.tenantId} onChange={(tenantId) => setConfig({ ...config, tenantId })} />
        </div>
        <div className="actions">
          <button
            onClick={() => {
              saveConfig(config);
              toast({ variant: "success", title: "Configuracao salva." });
            }}
          >
            Salvar
          </button>
          <button
            className="secondary"
            onClick={() =>
              void run(async () => {
                await refreshLists();
                return "Dados carregados.";
              })
            }
          >
            Carregar dados
          </button>
        </div>
      </Card>
    </div>
  );
}
