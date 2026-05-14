import { FormEvent } from "react";
import { AuthState, GoApi, GoConfig, defaultConfig, saveConfig } from "../../api/client";
import { Card, Field } from "../../components/ui";
import { ToastVariant } from "../../components/ui/toast";

type OrganizationForm = {
  organizationName: string;
  organizationSlug: string;
  adminName: string;
  adminEmail: string;
};

type AcceptInviteForm = {
  token: string;
  name: string;
  password: string;
};

type LoginForm = {
  tenantSlug: string;
  email: string;
  password: string;
};

type CreatedOrganization = {
  tenantId: string;
  tenantSlug: string;
  invitationToken: string;
};

type OnboardingPageProps = {
  api: GoApi;
  config: GoConfig;
  setConfig: (config: GoConfig) => void;
  org: OrganizationForm;
  setOrg: (form: OrganizationForm) => void;
  accept: AcceptInviteForm;
  setAccept: (form: AcceptInviteForm) => void;
  login: LoginForm;
  setLogin: (form: LoginForm) => void;
  createdOrg: CreatedOrganization | null;
  setCreatedOrg: (org: CreatedOrganization | null) => void;
  toast: (toast: { variant: ToastVariant; title: string; description?: string }) => void;
  submit: (event: FormEvent, work: () => Promise<string | void>) => void;
  updateAuth: (auth: AuthState) => void;
  goDashboard: () => void;
};

export function OnboardingPage({
  api,
  config,
  setConfig,
  org,
  setOrg,
  accept,
  setAccept,
  login,
  setLogin,
  createdOrg,
  setCreatedOrg,
  toast,
  submit,
  updateAuth,
  goDashboard,
}: OnboardingPageProps) {
  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div>
          <span className="eyebrow">Backend Go</span>
          <h1>Gestao Escolar Go</h1>
          <p>Entre na organizacao da prefeitura ou crie o primeiro acesso quando a equipe dona do SaaS fizer a implantacao.</p>
        </div>
        <div className="auth-status">
          <span>{config.baseUrl}</span>
        </div>
      </div>

      <div className="onboarding-layout">
        <aside className="onboarding-steps">
          <div className="step done">
            <strong>1</strong>
            <span>Conexao com API</span>
          </div>
          <div className={createdOrg ? "step done" : "step active"}>
            <strong>2</strong>
            <span>Criar prefeitura</span>
          </div>
          <div className={accept.token ? "step active" : "step"}>
            <strong>3</strong>
            <span>Definir primeiro admin</span>
          </div>
          <div className="step">
            <strong>4</strong>
            <span>Entrar no sistema</span>
          </div>
        </aside>

        <main className="onboarding-main">
          <Card title="Implantacao da prefeitura">
            <div className="helper-panel">
              <div>
                <strong>Equipe dona do SaaS</strong>
                <p>Crie a organizacao assim que a prefeitura assinar. O sistema gera um convite para o primeiro administrador da prefeitura definir a senha.</p>
              </div>
              <button type="button" className="secondary" onClick={() => setConfig(defaultConfig())}>
                Usar padrao dev
              </button>
            </div>

            <div className="form-grid">
              <Field label="URL da API Go" value={config.baseUrl} onChange={(baseUrl) => setConfig({ ...config, baseUrl })} />
              <Field label="Setup token" value={config.setupToken} onChange={(setupToken) => setConfig({ ...config, setupToken })} />
            </div>
            <div className="actions">
              <button type="button" className="secondary" onClick={() => { saveConfig(config); toast({ variant: "success", title: "Conexao salva." }); }}>
                Salvar conexao
              </button>
            </div>

            <form className="split-form" onSubmit={(event) => submit(event, async () => {
              const result = await api.post<CreatedOrganization>("/auth/organizations", org, { "X-Setup-Token": config.setupToken });
              const nextConfig = { ...config, tenantId: result.tenantId };
              setConfig(nextConfig);
              saveConfig(nextConfig);
              setCreatedOrg(result);
              setAccept({ ...accept, token: result.invitationToken, name: org.adminName });
              setLogin({ ...login, tenantSlug: result.tenantSlug, email: org.adminEmail });
              return "Prefeitura criada. Agora defina a senha do primeiro administrador.";
            })}>
              <div className="form-section">
                <h3>Dados da prefeitura</h3>
                <div className="form-grid">
                  <Field label="Nome da prefeitura" value={org.organizationName} onChange={(organizationName) => setOrg({ ...org, organizationName })} />
                  <Field label="Slug de acesso" value={org.organizationSlug} onChange={(organizationSlug) => setOrg({ ...org, organizationSlug })} />
                </div>
              </div>
              <div className="form-section">
                <h3>Primeiro administrador</h3>
                <div className="form-grid">
                  <Field label="Nome" value={org.adminName} onChange={(adminName) => setOrg({ ...org, adminName })} />
                  <Field label="Email" value={org.adminEmail} onChange={(adminEmail) => setOrg({ ...org, adminEmail })} />
                </div>
              </div>
              <button>Criar prefeitura e gerar convite</button>
            </form>

            {createdOrg && (
              <div className="success-panel">
                <div>
                  <strong>Prefeitura criada</strong>
                  <p>Tenant: {createdOrg.tenantSlug}</p>
                </div>
                <label className="token-box">
                  <span>Convite inicial</span>
                  <input readOnly value={createdOrg.invitationToken} />
                </label>
              </div>
            )}
          </Card>

          <div className="auth-grid compact">
            <Card title="Definir senha do primeiro admin">
              <form onSubmit={(event) => submit(event, async () => {
                if (accept.token.trim() === config.setupToken.trim()) {
                  throw new Error("Esse campo precisa do token de convite da prefeitura. O setup token serve apenas para criar a prefeitura.");
                }
                const result = await api.post<AuthState>("/auth/invites/accept", accept);
                updateAuth(result);
                goDashboard();
                return "Primeiro administrador ativado.";
              })}>
                <div className="form-grid">
                  <Field label="Token do convite" value={accept.token} onChange={(token) => setAccept({ ...accept, token })} />
                  <Field label="Nome" value={accept.name} onChange={(name) => setAccept({ ...accept, name })} />
                  <Field label="Senha" type="password" value={accept.password} onChange={(password) => setAccept({ ...accept, password })} />
                </div>
                <p className="hint">Esse token aparece depois de criar a prefeitura. Ele e diferente do setup token.</p>
                <button>Ativar admin e entrar</button>
              </form>
            </Card>

            <Card title="Ja tenho usuario">
              <form onSubmit={(event) => submit(event, async () => {
                const result = await api.post<AuthState>("/auth/login", login);
                updateAuth(result);
                goDashboard();
                return "Login realizado.";
              })}>
                <div className="form-grid">
                  <Field label="Slug da prefeitura" value={login.tenantSlug} onChange={(tenantSlug) => setLogin({ ...login, tenantSlug })} />
                  <Field label="Email" value={login.email} onChange={(email) => setLogin({ ...login, email })} />
                  <Field label="Senha" type="password" value={login.password} onChange={(password) => setLogin({ ...login, password })} />
                </div>
                <button>Entrar</button>
              </form>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
