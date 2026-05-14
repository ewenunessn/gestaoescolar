import { FormEvent } from "react";
import { GoApi, toIdList } from "../../api/client";
import { Card, Field } from "../../components/ui";
import { DemandResponse } from "../../types/domain";

export function DemandPage({
  api,
  demand,
  setDemand,
  demandForm,
  setDemandForm,
  submit,
}: {
  api: GoApi;
  demand: DemandResponse | null;
  setDemand: (demand: DemandResponse) => void;
  demandForm: { competencia: string; data_inicio: string; data_fim: string; escola_ids: string; cardapio_ids: string };
  setDemandForm: (form: { competencia: string; data_inicio: string; data_fim: string; escola_ids: string; cardapio_ids: string }) => void;
  submit: (event: FormEvent, work: () => Promise<string | void>) => void;
}) {
  return (
    <Card title="Gerar necessidade por cardapio">
      <form
        onSubmit={(event) =>
          submit(event, async () => {
            const result = await api.post<DemandResponse>("/menu-demands/calculate", {
              competencia: demandForm.competencia,
              data_inicio: demandForm.data_inicio,
              data_fim: demandForm.data_fim,
              escola_ids: toIdList(demandForm.escola_ids),
              cardapio_ids: toIdList(demandForm.cardapio_ids),
              incluir_detalhes: true,
              usar_todos_dias_se_periodo_vazio: true,
            });
            setDemand(result);
            return "Necessidade calculada.";
          })
        }
      >
        <div className="form-grid five">
          <Field label="Competencia" value={demandForm.competencia} onChange={(competencia) => setDemandForm({ ...demandForm, competencia })} />
          <Field label="Inicio" value={demandForm.data_inicio} onChange={(data_inicio) => setDemandForm({ ...demandForm, data_inicio })} />
          <Field label="Fim" value={demandForm.data_fim} onChange={(data_fim) => setDemandForm({ ...demandForm, data_fim })} />
          <Field label="IDs escolas" value={demandForm.escola_ids} onChange={(escola_ids) => setDemandForm({ ...demandForm, escola_ids })} />
          <Field label="IDs cardapios" value={demandForm.cardapio_ids} onChange={(cardapio_ids) => setDemandForm({ ...demandForm, cardapio_ids })} />
        </div>
        <button>Calcular necessidade</button>
      </form>

      {demand && (
        <div className="result">
          <div className="metrics">
            <span>{demand.cardapios_encontrados} cardapios</span>
            <span>{demand.escolas_total} escolas</span>
            <span>{demand.combinacoes_escola_modalidade} combinacoes</span>
          </div>
          {demand.avisos?.map((warning) => (
            <div key={warning} className="info-panel">
              {warning}
            </div>
          ))}
          <h3>Demanda por produto</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Unidade</th>
                  <th>Kg</th>
                  <th>Ocorrencias</th>
                </tr>
              </thead>
              <tbody>
                {demand.demanda_por_produto.map((item) => (
                  <tr key={item.produto_id}>
                    <td>{item.produto_nome}</td>
                    <td>{item.unidade}</td>
                    <td>{item.quantidade_total_kg.toFixed(3)}</td>
                    <td>{item.ocorrencias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Consolidado por escola</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Escola</th>
                  <th>Modalidades</th>
                  <th>Alunos</th>
                  <th>Kg</th>
                </tr>
              </thead>
              <tbody>
                {demand.consolidado.map((item) => (
                  <tr key={item.escola_id}>
                    <td>{item.escola_nome}</td>
                    <td>{item.modalidades}</td>
                    <td>{item.numero_alunos}</td>
                    <td>{item.quantidade_total_kg.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
