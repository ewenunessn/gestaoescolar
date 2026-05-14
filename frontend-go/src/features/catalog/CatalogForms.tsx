import { FormEvent, useEffect } from "react";
import { GoApi, toNumber } from "../../api/client";
import { Button } from "../../components/ui/button";
import { Card, Field, PageLayout, SelectField } from "../../components/ui";
import { Contract, EducationModality, Product, School, Supplier } from "../../types/domain";

type Submit = (event: FormEvent, work: () => Promise<string | void>) => void;
type Refresh = () => Promise<void>;

const activeOptions = (
  <>
    <option value="true">Ativo</option>
    <option value="false">Inativo</option>
  </>
);

function boolFromString(value: string) {
  return value === "true";
}

function FormActions({ listLabel, onBack }: { listLabel: string; onBack: () => void }) {
  return (
    <div className="mt-5 flex items-center justify-end gap-3">
      <Button type="button" variant="outline" onClick={onBack}>
        Voltar para {listLabel}
      </Button>
      <Button type="submit">Salvar</Button>
    </div>
  );
}

export function SchoolFormPage({
  api,
  item,
  form,
  setForm,
  refreshLists,
  submit,
  onBack,
}: {
  api: GoApi;
  item?: School;
  form: Record<string, string>;
  setForm: (form: Record<string, string>) => void;
  refreshLists: Refresh;
  submit: Submit;
  onBack: () => void;
}) {
  useEffect(() => {
    if (!item) return;
    setForm({
      name: item.name || "",
      code: item.code || "",
      address: item.address || "",
      city: item.city || "",
      mapsAddress: item.mapsAddress || "",
      phone: item.phone || "",
      email: item.email || "",
      managerName: item.managerName || "",
      administrationType: item.administrationType || "municipal",
      active: String(item.active),
    });
  }, [item?.id]);

  return (
    <PageLayout breadcrumbs={["Dashboard", "Cadastros", "Escolas", item ? "Editar" : "Nova"]} title={item ? "Editar escola" : "Nova escola"}>
      <Card title="Dados da escola">
        <form
          onSubmit={(event) =>
            submit(event, async () => {
              const payload = { ...form, active: boolFromString(form.active ?? "true") };
              if (item) await api.put<School>(`/schools/${item.id}`, payload);
              else await api.post<School>("/schools/", payload);
              await refreshLists();
              onBack();
              return item ? "Escola atualizada." : "Escola criada.";
            })
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Nome" value={form.name || ""} onChange={(name) => setForm({ ...form, name })} />
            <Field label="Codigo" value={form.code || ""} onChange={(code) => setForm({ ...form, code })} />
            <Field label="Municipio" value={form.city || ""} onChange={(city) => setForm({ ...form, city })} />
            <Field label="Endereco" value={form.address || ""} onChange={(address) => setForm({ ...form, address })} />
            <Field label="Endereco no mapa" value={form.mapsAddress || ""} onChange={(mapsAddress) => setForm({ ...form, mapsAddress })} />
            <Field label="Telefone" value={form.phone || ""} onChange={(phone) => setForm({ ...form, phone })} />
            <Field label="Email" value={form.email || ""} onChange={(email) => setForm({ ...form, email })} />
            <Field label="Responsavel" value={form.managerName || ""} onChange={(managerName) => setForm({ ...form, managerName })} />
            <SelectField label="Administracao" value={form.administrationType || "municipal"} onChange={(administrationType) => setForm({ ...form, administrationType })}>
              <option value="municipal">Municipal</option>
              <option value="state">Estadual</option>
              <option value="federal">Federal</option>
              <option value="private">Privada</option>
            </SelectField>
            <SelectField label="Status" value={form.active || "true"} onChange={(active) => setForm({ ...form, active })}>
              {activeOptions}
            </SelectField>
          </div>
          <FormActions listLabel="escolas" onBack={onBack} />
        </form>
      </Card>
    </PageLayout>
  );
}

export function ModalityFormPage({ api, item, form, setForm, refreshLists, submit, onBack }: { api: GoApi; item?: EducationModality; form: Record<string, string>; setForm: (form: Record<string, string>) => void; refreshLists: Refresh; submit: Submit; onBack: () => void }) {
  useEffect(() => {
    if (!item) return;
    setForm({ name: item.name || "", description: item.description || "", active: String(item.active) });
  }, [item?.id]);

  return (
    <PageLayout breadcrumbs={["Dashboard", "Cadastros", "Modalidades", item ? "Editar" : "Nova"]} title={item ? "Editar modalidade" : "Nova modalidade"}>
      <Card title="Dados da modalidade">
        <form
          onSubmit={(event) =>
            submit(event, async () => {
              const payload = { ...form, active: boolFromString(form.active ?? "true") };
              if (item) await api.put<EducationModality>(`/education-modalities/${item.id}`, payload);
              else await api.post<EducationModality>("/education-modalities/", payload);
              await refreshLists();
              onBack();
              return item ? "Modalidade atualizada." : "Modalidade criada.";
            })
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nome" value={form.name || ""} onChange={(name) => setForm({ ...form, name })} />
            <Field label="Descricao" value={form.description || ""} onChange={(description) => setForm({ ...form, description })} />
            <SelectField label="Status" value={form.active || "true"} onChange={(active) => setForm({ ...form, active })}>
              {activeOptions}
            </SelectField>
          </div>
          <FormActions listLabel="modalidades" onBack={onBack} />
        </form>
      </Card>
    </PageLayout>
  );
}

export function ProductFormPage({ api, item, form, setForm, refreshLists, submit, onBack }: { api: GoApi; item?: Product; form: Record<string, string>; setForm: (form: Record<string, string>) => void; refreshLists: Refresh; submit: Submit; onBack: () => void }) {
  useEffect(() => {
    if (!item) return;
    setForm({ name: item.name || "", description: item.description || "", unit: item.unit || "", category: item.category || "", correctionFactor: String(item.fator_correcao || 1), active: String(item.active) });
  }, [item?.id]);

  return (
    <PageLayout breadcrumbs={["Dashboard", "Cadastros", "Produtos", item ? "Editar" : "Novo"]} title={item ? "Editar produto" : "Novo produto"}>
      <Card title="Dados do produto">
        <form
          onSubmit={(event) =>
            submit(event, async () => {
              const payload = { name: form.name, description: form.description, unit: form.unit, category: form.category, fator_correcao: Number(form.correctionFactor || 1), active: boolFromString(form.active ?? "true") };
              if (item) await api.put<Product>(`/products/${item.id}`, payload);
              else await api.post<Product>("/products/", payload);
              await refreshLists();
              onBack();
              return item ? "Produto atualizado." : "Produto criado.";
            })
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Nome" value={form.name || ""} onChange={(name) => setForm({ ...form, name })} />
            <Field label="Descricao" value={form.description || ""} onChange={(description) => setForm({ ...form, description })} />
            <Field label="Unidade" value={form.unit || ""} onChange={(unit) => setForm({ ...form, unit })} />
            <Field label="Categoria" value={form.category || ""} onChange={(category) => setForm({ ...form, category })} />
            <Field label="Fator de correcao" type="number" value={form.correctionFactor || "1"} onChange={(correctionFactor) => setForm({ ...form, correctionFactor })} />
            <SelectField label="Status" value={form.active || "true"} onChange={(active) => setForm({ ...form, active })}>
              {activeOptions}
            </SelectField>
          </div>
          <FormActions listLabel="produtos" onBack={onBack} />
        </form>
      </Card>
    </PageLayout>
  );
}

export function SupplierFormPage({ api, item, form, setForm, refreshLists, submit, onBack }: { api: GoApi; item?: Supplier; form: Record<string, string>; setForm: (form: Record<string, string>) => void; refreshLists: Refresh; submit: Submit; onBack: () => void }) {
  useEffect(() => {
    if (!item) return;
    setForm({
      name: item.name || "",
      document: item.document || "",
      supplierType: item.supplierType || "conventional",
      address: item.address || "",
      city: item.city || "",
      state: item.state || "",
      postalCode: item.postalCode || "",
      contactName: item.contactName || "",
      phone: item.phone || "",
      email: item.email || "",
      active: String(item.active),
    });
  }, [item?.id]);

  return (
    <PageLayout breadcrumbs={["Dashboard", "Cadastros", "Fornecedores", item ? "Editar" : "Novo"]} title={item ? "Editar fornecedor" : "Novo fornecedor"}>
      <Card title="Dados do fornecedor">
        <form
          onSubmit={(event) =>
            submit(event, async () => {
              const payload = { ...form, active: boolFromString(form.active ?? "true") };
              if (item) await api.put<Supplier>(`/suppliers/${item.id}`, payload);
              else await api.post<Supplier>("/suppliers/", payload);
              await refreshLists();
              onBack();
              return item ? "Fornecedor atualizado." : "Fornecedor criado.";
            })
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Nome" value={form.name || ""} onChange={(name) => setForm({ ...form, name })} />
            <Field label="Documento" value={form.document || ""} onChange={(document) => setForm({ ...form, document })} />
            <SelectField label="Tipo" value={form.supplierType || "conventional"} onChange={(supplierType) => setForm({ ...form, supplierType })}>
              <option value="family_farming">Agricultura familiar</option>
              <option value="cooperative">Cooperativa</option>
              <option value="conventional">Convencional</option>
              <option value="individual">Pessoa fisica</option>
              <option value="other">Outro</option>
            </SelectField>
            <Field label="Endereco" value={form.address || ""} onChange={(address) => setForm({ ...form, address })} />
            <Field label="Municipio" value={form.city || ""} onChange={(city) => setForm({ ...form, city })} />
            <Field label="UF" value={form.state || ""} onChange={(state) => setForm({ ...form, state })} />
            <Field label="CEP" value={form.postalCode || ""} onChange={(postalCode) => setForm({ ...form, postalCode })} />
            <Field label="Contato" value={form.contactName || ""} onChange={(contactName) => setForm({ ...form, contactName })} />
            <Field label="Telefone" value={form.phone || ""} onChange={(phone) => setForm({ ...form, phone })} />
            <Field label="Email" value={form.email || ""} onChange={(email) => setForm({ ...form, email })} />
            <SelectField label="Status" value={form.active || "true"} onChange={(active) => setForm({ ...form, active })}>
              {activeOptions}
            </SelectField>
          </div>
          <FormActions listLabel="fornecedores" onBack={onBack} />
        </form>
      </Card>
    </PageLayout>
  );
}

export function ContractFormPage({ api, item, suppliers, form, setForm, refreshLists, submit, onBack }: { api: GoApi; item?: Contract; suppliers: Supplier[]; form: Record<string, string>; setForm: (form: Record<string, string>) => void; refreshLists: Refresh; submit: Submit; onBack: () => void }) {
  useEffect(() => {
    if (!item) return;
    setForm({
      number: item.number || "",
      supplierId: String(item.supplierId || ""),
      startDate: item.startDate || "",
      endDate: item.endDate || "",
      status: item.status || "active",
      contractType: item.contractType || "supply",
      notes: item.notes || "",
      active: String(item.active),
    });
  }, [item?.id]);

  return (
    <PageLayout breadcrumbs={["Dashboard", "Cadastros", "Contratos", item ? "Editar" : "Novo"]} title={item ? "Editar contrato" : "Novo contrato"}>
      <Card title="Dados do contrato">
        <form
          onSubmit={(event) =>
            submit(event, async () => {
              const payload = { ...form, supplierId: toNumber(form.supplierId), active: boolFromString(form.active ?? "true") };
              if (item) await api.put<Contract>(`/contracts/${item.id}`, payload);
              else await api.post<Contract>("/contracts/", payload);
              await refreshLists();
              onBack();
              return item ? "Contrato atualizado." : "Contrato criado.";
            })
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Numero" value={form.number || ""} onChange={(number) => setForm({ ...form, number })} />
            <SelectField label="Fornecedor" value={form.supplierId || ""} onChange={(supplierId) => setForm({ ...form, supplierId })}>
              <option value="">Selecione</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </SelectField>
            <Field label="Inicio" type="date" value={form.startDate || ""} onChange={(startDate) => setForm({ ...form, startDate })} />
            <Field label="Fim" type="date" value={form.endDate || ""} onChange={(endDate) => setForm({ ...form, endDate })} />
            <SelectField label="Status do contrato" value={form.status || "active"} onChange={(status) => setForm({ ...form, status })}>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="suspended">Suspenso</option>
              <option value="finished">Encerrado</option>
            </SelectField>
            <SelectField label="Tipo" value={form.contractType || "supply"} onChange={(contractType) => setForm({ ...form, contractType })}>
              <option value="supply">Fornecimento</option>
              <option value="service">Servico</option>
              <option value="mixed">Misto</option>
            </SelectField>
            <Field label="Observacoes" value={form.notes || ""} onChange={(notes) => setForm({ ...form, notes })} />
            <SelectField label="Status" value={form.active || "true"} onChange={(active) => setForm({ ...form, active })}>
              {activeOptions}
            </SelectField>
          </div>
          <FormActions listLabel="contratos" onBack={onBack} />
        </form>
      </Card>
    </PageLayout>
  );
}
