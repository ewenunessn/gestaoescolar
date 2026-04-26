// Controller de escola-modalidades para PostgreSQL
import { Request, Response } from "express";
import db from "../../../database";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware";
import { cacheService } from "../../../utils/cacheService";
import {
  gerarRelatorioAlunosModalidades,
  listarHistoricoAlunosModalidades,
  registrarHistoricoAlunoModalidade,
} from "../services/escolaModalidadeHistoricoService";

function getUsuarioId(req: Request): number | null {
  return (req as AuthenticatedRequest).user?.id || null;
}

async function invalidarCachesAlunos() {
  cacheService.invalidateEntity("escolas");
  cacheService.invalidateEntity("modalidades");
  await cacheService.del("dashboard:stats");
}

export async function listarEscolaModalidades(req: Request, res: Response) {
  try {
    const escolaModalidades = await db.all(`
      SELECT
        em.id,
        em.escola_id,
        em.modalidade_id,
        em.quantidade_alunos,
        em.created_at,
        em.updated_at,
        e.nome as escola_nome,
        m.nome as modalidade_nome
      FROM escola_modalidades em
      LEFT JOIN escolas e ON em.escola_id = e.id
      LEFT JOIN modalidades m ON em.modalidade_id = m.id
      ORDER BY e.nome, m.nome
    `);

    res.json({
      success: true,
      data: escolaModalidades,
      total: escolaModalidades.length,
    });
  } catch (error) {
    console.error("Erro ao listar escola-modalidades:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar escola-modalidades",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

export async function buscarEscolaModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const escolaModalidade = await db.get(`
      SELECT
        em.id,
        em.escola_id,
        em.modalidade_id,
        em.quantidade_alunos,
        e.nome as escola_nome,
        m.nome as modalidade_nome
      FROM escola_modalidades em
      LEFT JOIN escolas e ON em.escola_id = e.id
      LEFT JOIN modalidades m ON em.modalidade_id = m.id
      WHERE em.id = $1
    `, [id]);

    if (!escolaModalidade) {
      return res.status(404).json({
        success: false,
        message: "Escola-modalidade nao encontrada",
      });
    }

    res.json({
      success: true,
      data: escolaModalidade,
    });
  } catch (error) {
    console.error("Erro ao buscar escola-modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar escola-modalidade",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

export async function listarModalidadesPorEscola(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;

    const modalidades = await db.all(`
      SELECT
        em.id,
        em.escola_id,
        em.modalidade_id,
        em.quantidade_alunos,
        em.created_at,
        em.updated_at,
        m.nome as modalidade_nome
      FROM escola_modalidades em
      LEFT JOIN modalidades m ON em.modalidade_id = m.id
      WHERE em.escola_id = $1
      ORDER BY m.nome
    `, [escola_id]);

    res.json({
      success: true,
      data: modalidades,
      total: modalidades.length,
    });
  } catch (error) {
    console.error("Erro ao listar modalidades por escola:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar modalidades por escola",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

export async function criarEscolaModalidade(req: Request, res: Response) {
  try {
    const { escola_id, modalidade_id, quantidade_alunos, vigente_de, observacao } = req.body;
    const escolaId = Number(escola_id);
    const modalidadeId = Number(modalidade_id);
    const quantidadeAlunos = Number(quantidade_alunos);

    if (!Number.isFinite(escolaId) || !Number.isFinite(modalidadeId)) {
      return res.status(400).json({
        success: false,
        message: "Escola e modalidade sao obrigatorias",
      });
    }

    if (!Number.isFinite(quantidadeAlunos) || quantidadeAlunos < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantidade de alunos deve ser um numero valido",
      });
    }

    const resultData = await db.transaction(async (client) => {
      const existingResult = await client.query(`
        SELECT *
        FROM escola_modalidades
        WHERE escola_id = $1 AND modalidade_id = $2
      `, [escolaId, modalidadeId]);
      const existing = existingResult.rows[0];

      if (!quantidadeAlunos || quantidadeAlunos === 0) {
        if (existing) {
          await client.query(`
            DELETE FROM escola_modalidades
            WHERE escola_id = $1 AND modalidade_id = $2
          `, [escolaId, modalidadeId]);

          await registrarHistoricoAlunoModalidade(client, {
            escola_id: escolaId,
            modalidade_id: modalidadeId,
            quantidade_alunos: 0,
            quantidade_anterior: Number(existing.quantidade_alunos) || 0,
            operacao: "delete",
            vigente_de,
            observacao,
            usuario_id: getUsuarioId(req),
          });
        }

        return {
          message: "Registro removido com sucesso",
          data: null,
        };
      }

      if (existing) {
        if (Number(existing.quantidade_alunos) === quantidadeAlunos) {
          return {
            message: "Escola-modalidade salva com sucesso",
            data: existing,
          };
        }

        const updated = await client.query(`
          UPDATE escola_modalidades SET
            quantidade_alunos = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `, [quantidadeAlunos, existing.id]);

        await registrarHistoricoAlunoModalidade(client, {
          escola_id: escolaId,
          modalidade_id: modalidadeId,
          quantidade_alunos: quantidadeAlunos,
          quantidade_anterior: Number(existing.quantidade_alunos) || 0,
          operacao: "update",
          vigente_de,
          observacao,
          usuario_id: getUsuarioId(req),
        });

        return {
          message: "Escola-modalidade salva com sucesso",
          data: updated.rows[0],
        };
      }

      const inserted = await client.query(`
        INSERT INTO escola_modalidades (escola_id, modalidade_id, quantidade_alunos, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING *
      `, [escolaId, modalidadeId, quantidadeAlunos]);

      await registrarHistoricoAlunoModalidade(client, {
        escola_id: escolaId,
        modalidade_id: modalidadeId,
        quantidade_alunos: quantidadeAlunos,
        quantidade_anterior: null,
        operacao: "create",
        vigente_de,
        observacao,
        usuario_id: getUsuarioId(req),
      });

      return {
        message: "Escola-modalidade salva com sucesso",
        data: inserted.rows[0],
      };
    });

    await invalidarCachesAlunos();

    res.json({
      success: true,
      message: resultData.message,
      data: resultData.data,
    });
  } catch (error) {
    console.error("Erro ao criar escola-modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar escola-modalidade",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

export async function editarEscolaModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { quantidade_alunos, vigente_de, observacao } = req.body;

    if (quantidade_alunos === undefined || quantidade_alunos === null) {
      return res.status(400).json({
        success: false,
        message: "Quantidade de alunos e obrigatoria",
      });
    }

    const quantidadeAlunos = Number(quantidade_alunos);
    if (!Number.isFinite(quantidadeAlunos) || quantidadeAlunos < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantidade de alunos deve ser um numero positivo",
      });
    }

    const result = await db.transaction(async (client) => {
      const existingResult = await client.query(`
        SELECT *
        FROM escola_modalidades
        WHERE id = $1
      `, [id]);
      const existing = existingResult.rows[0];
      if (!existing) return null;

      if (Number(existing.quantidade_alunos) === quantidadeAlunos) {
        return existing;
      }

      const updated = await client.query(`
        UPDATE escola_modalidades SET
          quantidade_alunos = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [quantidadeAlunos, id]);

      await registrarHistoricoAlunoModalidade(client, {
        escola_id: Number(existing.escola_id),
        modalidade_id: Number(existing.modalidade_id),
        quantidade_alunos: quantidadeAlunos,
        quantidade_anterior: Number(existing.quantidade_alunos) || 0,
        operacao: "update",
        vigente_de,
        observacao,
        usuario_id: getUsuarioId(req),
      });

      return updated.rows[0];
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Escola-modalidade nao encontrada",
      });
    }

    await invalidarCachesAlunos();

    res.json({
      success: true,
      message: "Escola-modalidade atualizada com sucesso",
      data: result,
    });
  } catch (error) {
    console.error("Erro ao editar escola-modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar escola-modalidade",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

export async function removerEscolaModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { vigente_de, observacao } = req.body || {};

    const result = await db.transaction(async (client) => {
      const existingResult = await client.query(`
        SELECT *
        FROM escola_modalidades
        WHERE id = $1
      `, [id]);
      const existing = existingResult.rows[0];
      if (!existing) return null;

      const deleted = await client.query(`
        DELETE FROM escola_modalidades
        WHERE id = $1
        RETURNING *
      `, [id]);

      await registrarHistoricoAlunoModalidade(client, {
        escola_id: Number(existing.escola_id),
        modalidade_id: Number(existing.modalidade_id),
        quantidade_alunos: 0,
        quantidade_anterior: Number(existing.quantidade_alunos) || 0,
        operacao: "delete",
        vigente_de,
        observacao,
        usuario_id: getUsuarioId(req),
      });

      return deleted.rows[0];
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Escola-modalidade nao encontrada",
      });
    }

    await invalidarCachesAlunos();

    res.json({
      success: true,
      message: "Escola-modalidade removida com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover escola-modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover escola-modalidade",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

export async function listarHistoricoEscolaModalidades(req: Request, res: Response) {
  try {
    const historico = await listarHistoricoAlunosModalidades(req.query as any);

    res.json({
      success: true,
      data: historico,
      total: historico.length,
    });
  } catch (error) {
    console.error("Erro ao listar historico de alunos por modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar historico de alunos por modalidade",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

export async function relatorioAlunosModalidades(req: Request, res: Response) {
  try {
    const relatorio = await gerarRelatorioAlunosModalidades(req.query as any);

    res.json({
      success: true,
      data: relatorio,
    });
  } catch (error) {
    console.error("Erro ao gerar relatorio de alunos por modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao gerar relatorio de alunos por modalidade",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

// Aliases para compatibilidade com as rotas existentes
export const atualizarEscolaModalidade = editarEscolaModalidade;
export const deletarEscolaModalidade = removerEscolaModalidade;
