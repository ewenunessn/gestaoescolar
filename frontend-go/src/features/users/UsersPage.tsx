import { FormEvent } from "react";
import { AuthState, GoApi, toIdList } from "../../api/client";
import { Card, Field, SelectField } from "../../components/ui";

type InviteForm = {
  name: string;
  email: string;
  role: string;
  schoolIds: string;
};

type AcceptForm = {
  token: string;
  name: string;
  password: string;
};

export function UsersPage({
  api,
  auth,
  invite,
  setInvite,
  accept,
  setAccept,
  submit,
}: {
  api: GoApi;
  auth: AuthState;
  invite: InviteForm;
  setInvite: (invite: InviteForm) => void;
  accept: AcceptForm;
  setAccept: (accept: AcceptForm) => void;
  submit: (event: FormEvent, work: () => Promise<string | void>) => void;
}) {
  return (
    <Card title="Convidar usuario da organizacao">
      <form
        onSubmit={(event) =>
          submit(event, async () => {
            const result = await api.post<{ invitationToken: string }>("/auth/invites", {
              name: invite.name,
              email: invite.email,
              role: invite.role,
              schools: toIdList(invite.schoolIds).map((schoolId) => ({ schoolId, role: "school_user" })),
            });
            setAccept({ ...accept, token: result.invitationToken, name: invite.name });
            return "Convite criado. Token copiado para a tela de aceite.";
          })
        }
      >
        <div className="form-grid four">
          <Field label="Nome" value={invite.name} onChange={(name) => setInvite({ ...invite, name })} />
          <Field label="Email" value={invite.email} onChange={(email) => setInvite({ ...invite, email })} />
          <SelectField label="Papel" value={invite.role} onChange={(role) => setInvite({ ...invite, role })}>
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </SelectField>
          <Field label="IDs escolas" value={invite.schoolIds} onChange={(schoolIds) => setInvite({ ...invite, schoolIds })} />
        </div>
        <button>Convidar</button>
      </form>
      {auth.schools && auth.schools.length > 0 && <div className="info-panel">Escolas do usuario atual: {auth.schools.map((item) => `${item.schoolId} (${item.role})`).join(", ")}</div>}
    </Card>
  );
}
