import { FormEvent } from "react";
import { GoApi, toIdList, toNumber } from "../../api/client";
import { Card, DataTable, Field, SelectField } from "../../components/ui";
import { EducationModality, Meal, Menu, MenuPreparation, Preparation, PreparationProduct, Product } from "../../types/domain";

export function MenuBuilderPage({
  api,
  products,
  modalities,
  preparations,
  preparationProducts,
  setPreparationProducts,
  meals,
  menus,
  menuPreparations,
  setMenuPreparations,
  preparationForm,
  setPreparationForm,
  prepProduct,
  setPrepProduct,
  mealForm,
  setMealForm,
  menuForm,
  setMenuForm,
  menuPrep,
  setMenuPrep,
  refreshLists,
  run,
  submit,
}: {
  api: GoApi;
  products: Product[];
  modalities: EducationModality[];
  preparations: Preparation[];
  preparationProducts: PreparationProduct[];
  setPreparationProducts: (rows: PreparationProduct[]) => void;
  meals: Meal[];
  menus: Menu[];
  menuPreparations: MenuPreparation[];
  setMenuPreparations: (rows: MenuPreparation[]) => void;
  preparationForm: Record<string, string>;
  setPreparationForm: (form: Record<string, string>) => void;
  prepProduct: { preparationId: string; productId: string; educationModalityId: string; perCapitaAmount: string; perCapitaUnit: string };
  setPrepProduct: (form: { preparationId: string; productId: string; educationModalityId: string; perCapitaAmount: string; perCapitaUnit: string }) => void;
  mealForm: Record<string, string>;
  setMealForm: (form: Record<string, string>) => void;
  menuForm: { name: string; year: string; month: string; startDate: string; endDate: string; educationModalityIds: string };
  setMenuForm: (form: { name: string; year: string; month: string; startDate: string; endDate: string; educationModalityIds: string }) => void;
  menuPrep: { menuId: string; day: string; mealId: string; preparationId: string };
  setMenuPrep: (form: { menuId: string; day: string; mealId: string; preparationId: string }) => void;
  refreshLists: () => Promise<void>;
  run: (work: () => Promise<string | void>) => Promise<void>;
  submit: (event: FormEvent, work: () => Promise<string | void>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="actions lg:col-span-2">
        <button
          className="secondary"
          onClick={() =>
            void run(async () => {
              await refreshLists();
              return "Listas atualizadas.";
            })
          }
        >
          Atualizar listas
        </button>
      </div>
      <Card title="Preparacoes">
        <form
          onSubmit={(event) =>
            submit(event, async () => {
              await api.post<Preparation>("/preparations/", { ...preparationForm, active: true });
              await refreshLists();
              return "Preparacao criada.";
            })
          }
        >
          <div className="form-grid">
            <Field label="Nome" value={preparationForm.name} onChange={(name) => setPreparationForm({ ...preparationForm, name })} />
            <Field label="Tipo" value={preparationForm.preparationType} onChange={(preparationType) => setPreparationForm({ ...preparationForm, preparationType })} />
          </div>
          <button>Criar preparacao</button>
        </form>
        <DataTable rows={preparations} columns={[{ label: "ID", render: (row) => row.id }, { label: "Nome", render: (row) => row.name }, { label: "Tipo", render: (row) => row.preparationType }]} />
      </Card>

      <Card title="Produtos da preparacao">
        <form
          onSubmit={(event) =>
            submit(event, async () => {
              await api.post(`/preparations/${prepProduct.preparationId}/products/`, {
                productId: toNumber(prepProduct.productId),
                educationModalityId: prepProduct.educationModalityId ? toNumber(prepProduct.educationModalityId) : null,
                perCapitaAmount: prepProduct.perCapitaAmount,
                perCapitaUnit: prepProduct.perCapitaUnit,
                active: true,
              });
              setPreparationProducts(await api.get<PreparationProduct[]>(`/preparations/${prepProduct.preparationId}/products/?limit=100`));
              return "Produto adicionado na preparacao.";
            })
          }
        >
          <div className="form-grid">
            <SelectField label="Preparacao" value={prepProduct.preparationId} onChange={(preparationId) => setPrepProduct({ ...prepProduct, preparationId })}>
              <option value="">Selecione</option>
              {preparations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Produto" value={prepProduct.productId} onChange={(productId) => setPrepProduct({ ...prepProduct, productId })}>
              <option value="">Selecione</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Modalidade" value={prepProduct.educationModalityId} onChange={(educationModalityId) => setPrepProduct({ ...prepProduct, educationModalityId })}>
              <option value="">Todas</option>
              {modalities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <Field label="Per capita" value={prepProduct.perCapitaAmount} onChange={(perCapitaAmount) => setPrepProduct({ ...prepProduct, perCapitaAmount })} />
            <SelectField label="Unidade" value={prepProduct.perCapitaUnit} onChange={(perCapitaUnit) => setPrepProduct({ ...prepProduct, perCapitaUnit })}>
              <option value="g">g</option>
              <option value="ml">ml</option>
            </SelectField>
          </div>
          <button>Adicionar produto</button>
        </form>
        <DataTable rows={preparationProducts} columns={[{ label: "ID", render: (row) => row.id }, { label: "Produto", render: (row) => row.productName || row.productId }, { label: "Per capita", render: (row) => `${row.perCapitaAmount}${row.perCapitaUnit}` }]} />
      </Card>

      <Card title="Refeicoes">
        <form
          onSubmit={(event) =>
            submit(event, async () => {
              await api.post<Meal>("/meals/", { name: mealForm.name, code: mealForm.code, sortOrder: toNumber(mealForm.sortOrder), active: true });
              await refreshLists();
              return "Refeicao criada.";
            })
          }
        >
          <div className="form-grid">
            <Field label="Nome" value={mealForm.name} onChange={(name) => setMealForm({ ...mealForm, name })} />
            <Field label="Codigo" value={mealForm.code} onChange={(code) => setMealForm({ ...mealForm, code })} />
            <Field label="Ordem" value={mealForm.sortOrder} onChange={(sortOrder) => setMealForm({ ...mealForm, sortOrder })} />
          </div>
          <button>Criar refeicao</button>
        </form>
        <DataTable rows={meals} columns={[{ label: "ID", render: (row) => row.id }, { label: "Nome", render: (row) => row.name }, { label: "Codigo", render: (row) => row.code }]} />
      </Card>

      <Card title="Cardapios">
        <form
          onSubmit={(event) =>
            submit(event, async () => {
              await api.post<Menu>("/menus/", {
                name: menuForm.name,
                year: toNumber(menuForm.year),
                month: toNumber(menuForm.month),
                startDate: menuForm.startDate,
                endDate: menuForm.endDate,
                educationModalityIds: toIdList(menuForm.educationModalityIds),
                active: true,
              });
              await refreshLists();
              return "Cardapio criado.";
            })
          }
        >
          <div className="form-grid">
            <Field label="Nome" value={menuForm.name} onChange={(name) => setMenuForm({ ...menuForm, name })} />
            <Field label="Ano" value={menuForm.year} onChange={(yearValue) => setMenuForm({ ...menuForm, year: yearValue })} />
            <Field label="Mes" value={menuForm.month} onChange={(monthValue) => setMenuForm({ ...menuForm, month: monthValue })} />
            <Field label="Inicio" value={menuForm.startDate} onChange={(startDate) => setMenuForm({ ...menuForm, startDate })} />
            <Field label="Fim" value={menuForm.endDate} onChange={(endDate) => setMenuForm({ ...menuForm, endDate })} />
            <Field label="IDs modalidades" value={menuForm.educationModalityIds} onChange={(educationModalityIds) => setMenuForm({ ...menuForm, educationModalityIds })} />
          </div>
          <button>Criar cardapio</button>
        </form>
        <DataTable rows={menus} columns={[{ label: "ID", render: (row) => row.id }, { label: "Nome", render: (row) => row.name }, { label: "Periodo", render: (row) => `${row.startDate} a ${row.endDate}` }]} />
      </Card>

      <Card title="Preparacao no cardapio">
        <form
          onSubmit={(event) =>
            submit(event, async () => {
              await api.post(`/menus/${menuPrep.menuId}/preparations/`, {
                day: toNumber(menuPrep.day),
                mealId: toNumber(menuPrep.mealId),
                preparationId: toNumber(menuPrep.preparationId),
                active: true,
              });
              setMenuPreparations(await api.get<MenuPreparation[]>(`/menus/${menuPrep.menuId}/preparations/?limit=100`));
              return "Preparacao adicionada ao cardapio.";
            })
          }
        >
          <div className="form-grid">
            <SelectField label="Cardapio" value={menuPrep.menuId} onChange={(menuId) => setMenuPrep({ ...menuPrep, menuId })}>
              <option value="">Selecione</option>
              {menus.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <Field label="Dia" value={menuPrep.day} onChange={(day) => setMenuPrep({ ...menuPrep, day })} />
            <SelectField label="Refeicao" value={menuPrep.mealId} onChange={(mealId) => setMenuPrep({ ...menuPrep, mealId })}>
              <option value="">Selecione</option>
              {meals.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Preparacao" value={menuPrep.preparationId} onChange={(preparationId) => setMenuPrep({ ...menuPrep, preparationId })}>
              <option value="">Selecione</option>
              {preparations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
          </div>
          <button>Adicionar</button>
        </form>
        <DataTable rows={menuPreparations} columns={[{ label: "ID", render: (row) => row.id }, { label: "Dia", render: (row) => row.day }, { label: "Refeicao", render: (row) => row.mealName }, { label: "Preparacao", render: (row) => row.preparationName }]} />
      </Card>
    </div>
  );
}
