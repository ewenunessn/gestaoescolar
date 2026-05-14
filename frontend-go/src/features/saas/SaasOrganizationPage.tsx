import { FormEvent } from "react";
import { GoApi, GoConfig, saveConfig } from "../../api/client";
import { Card, Field } from "../../components/ui";
import { ToastVariant } from "../../components/ui/toast";

type OrganizationForm = {
  organizationName: string;
  organizationSlug: string;
  adminName: string;
  adminEmail: string;
};

type AcceptForm = {
  token: string;
  name: string;
  password: string;
};

type LoginForm = {
  tenantSlug: string;
  email: string;
  password: string;
};

export function SaasOrganizationPage({
  api,
  config,
  setConfig,
  org,
  setOrg,
  accept,
  setAccept,
  login,
  setLogin,
  toast,
  submit,
}: {
  api: GoApi;
  config: GoConfig;
  setConfig: (config: GoConfig) => void;
  org: OrganizationForm;
  setOrg: (org: OrganizationForm) => void;
  accept: AcceptForm;
  setAccept: (accept: AcceptForm) => void;
  login: LoginForm;
  setLogin: (login: LoginForm) => void;
  toast: (toast: { variant: ToastVariant; title: string; description?: string }) => void;
  submit: (event: FormEvent, work: () => Promise<string | void>) => void;
}) {
  return (
    <Card title="Equipe dona do SaaS">
      <div className="info-panel">Tela operacional para criar a organizacao da prefeitura assinante e gerar o convite do primeiro administrador.</div>
      <div className="form-grid">
        <Field label="Setup token" value={config.setupToken} onChange={(setupToken) => setConfig({ ...config, setupToken })} />
        <Field label="Base URL" value={config.baseUrl} onChange={(baseUrl) => setConfig({ ...config, baseUrl })} />
      </div>
      <div className="actions">
        <button
          type="button"
          className="secondary"
          onClick={() => {
            saveConfig(config);
            toast({ variant: "success", title: "Configuracao salva." });
          }}
        >
          Salvar conexao
        </button>
      </div>
      <form
        onSubmit={(event) =>
          submit(event, async () => {
            const result = await api.post<{ tenantId: string; tenantSlug: string; invitationToken: string }>("/auth/organizations", org, {
              "X-Setup-Token": config.setupToken,
            });
            const nextConfig = { ...config, tenantId: result.tenantId };
            setConfig(nextConfig);
            saveConfig(nextConfig);
            setAccept({ ...accept, token: result.invitationToken, name: org.adminName });
            setLogin({ ...login, tenantSlug: result.tenantSlug, email: org.adminEmail });
            return `Prefeitura criada. Token inicial: ${result.invitationToken}`;
          })
        }
      >
        <div className="form-grid">
          <Field label="Organizacao" value={org.organizationName} onChange={(organizationName) => setOrg({ ...org, organizationName })} />
          <Field label="Slug" value={org.organizationSlug} onChange={(organizationSlug) => setOrg({ ...org, organizationSlug })} />
          <Field label="Admin inicial" value={org.adminName} onChange={(adminName) => setOrg({ ...org, adminName })} />
          <Field label="Email admin" value={org.adminEmail} onChange={(adminEmail) => setOrg({ ...org, adminEmail })} />
        </div>
        <button>Criar prefeitura</button>
      </form>
    </Card>
  );
}
