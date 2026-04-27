import { Request, Response } from 'express';
import GuiaModel from '../models/Guia';
import { normalizeRomaneioRouteIds } from '../models/romaneioFilters';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
  BusinessError,
  ConflictError,
  validateRequired,
  handleDatabaseError
} from '../../../utils/errorHandler';

export const guiaController = {
  // Listar todas as guias
  async listarGuias(req: Request, res: Response) {
    try {

      const guias = await GuiaModel.listarGuias();
      
      res.json({ success: true, data: guias });
    } catch (error) {
      console.error('❌ [GuiaController] Erro ao listar guias:', error);
      res.status(500).json({ success: false, error: 'Erro ao listar guias' });
    }
  },

  // Criar nova guia
  async criarGuia(req: Request, res: Response) {
    try {
      const { mes, ano, nome, observacao } = req.body;

      // Verificar se já existe uma guia para o mesmo mês/ano
      const guias = await GuiaModel.listarGuias();
      const guiaExistente = guias.find(g => g.mes === mes && g.ano === ano);

      if (guiaExistente) {
        return res.status(400).json({ 
          success: false, 
          error: 'Já existe uma guia para este mês/ano' 
        });
      }

      const guia = await GuiaModel.criarGuia({
        mes,
        ano,
        nome,
        observacao
      });

      res.json({ success: true, data: guia });
    } catch (error) {
      console.error('Erro ao criar guia:', error);
      res.status(500).json({ success: false, error: 'Erro ao criar guia' });
    }
  },

  // Buscar guia por ID
  async buscarGuia(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const guia = await GuiaModel.buscarGuia(parseInt(id));

      if (!guia) {
        return res.status(404).json({ 
          success: false, 
          error: 'Guia não encontrada' 
        });
      }

      const produtos = await GuiaModel.listarProdutosPorGuia(parseInt(id));
      
      res.json({ 
        success: true, 
        data: {
          ...guia,
          produtosEscola: produtos
        }
      });
    } catch (error) {
      console.error('Erro ao buscar guia:', error);
      res.status(500).json({ success: false, error: 'Erro ao buscar guia' });
    }
  },

  // Atualizar guia
  async atualizarGuia(req: Request, res: Response) {
    try {

      const { id } = req.params;
      const { observacao } = req.body;

      const guia = await GuiaModel.buscarGuia(parseInt(id));
      if (!guia) {
        return res.status(404).json({ success: false, error: 'Guia não encontrada' });
      }

      const guiaAtualizada = await GuiaModel.atualizarGuia(parseInt(id), { observacao });
      res.json({ success: true, data: guiaAtualizada });
    } catch (error) {
      console.error('Erro ao atualizar guia:', error);
      res.status(500).json({ success: false, error: 'Erro ao atualizar guia' });
    }
  },

  // Deletar guia
  async deletarGuia(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const guia = await GuiaModel.buscarGuia(parseInt(id));

      if (!guia) {
        return res.status(404).json({ 
          success: false, 
          error: 'Guia não encontrada' 
        });
      }

      const deletado = await GuiaModel.deletarGuia(parseInt(id));
      if (deletado) {
        res.json({ success: true, message: 'Guia deletada com sucesso' });
      } else {
        res.status(400).json({ success: false, error: 'Erro ao deletar guia' });
      }
    } catch (error) {
      console.error('Erro ao deletar guia:', error);
      res.status(500).json({ success: false, error: 'Erro ao deletar guia' });
    }
  },

  // Adicionar produto à guia
  async adicionarProdutoGuia(req: Request, res: Response) {
    try {

      const { guiaId } = req.params;
      
      // Validar parâmetros obrigatórios
      const produtoId = parseInt(req.body.produtoId);
      const escolaId = parseInt(req.body.escolaId);
      
      if (isNaN(produtoId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID do produto inválido' 
        });
      }
      
      if (isNaN(escolaId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID da escola inválido' 
        });
      }
      
      const guia = await GuiaModel.buscarGuia(parseInt(guiaId));
      
      if (!guia) {
        return res.status(404).json({ success: false, error: 'Guia não encontrada' });
      }

      if (guia.status !== 'aberta') {
        return res.status(400).json({ 
          success: false, 
          error: 'Não é possível adicionar produtos em uma guia fechada ou cancelada' 
        });
      }

      const guiaProduto = await GuiaModel.adicionarProdutoGuia({
        guia_id: parseInt(guiaId),
        produto_id: produtoId,
        escola_id: escolaId,
        quantidade: req.body.quantidade,
        unidade: req.body.unidade || 'un',
        lote: req.body.lote,
        observacao: req.body.observacao,
        para_entrega: req.body.para_entrega !== undefined ? req.body.para_entrega : true,
        status: req.body.status || 'pendente',
        data_entrega: req.body.dataProgramada || null
      });

      const guiaProdutoCompleto = await GuiaModel.buscarProdutoGuia(guiaProduto.id);
      res.json({ success: true, data: guiaProdutoCompleto });
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      res.status(500).json({ success: false, error: 'Erro ao adicionar produto' });
    }
  },

  // Remover produto da guia
  async removerProdutoGuia(req: Request, res: Response) {
    try {

      const { guiaId, produtoId, escolaId } = req.params;
      const guia = await GuiaModel.buscarGuia(parseInt(guiaId));
      
      if (!guia) {
        return res.status(404).json({ success: false, error: 'Guia não encontrada' });
      }

      if (guia.status !== 'aberta') {
        return res.status(400).json({ 
          success: false, 
          error: 'Não é possível remover produtos de uma guia fechada ou cancelada' 
        });
      }

      const produtos = await GuiaModel.listarProdutosPorGuia(parseInt(guiaId));
      const produtoParaRemover = produtos.find(p => 
        p.produto_id === parseInt(produtoId) && 
        p.escola_id === parseInt(escolaId)
      );

      if (!produtoParaRemover) {
        return res.status(404).json({ success: false, error: 'Produto não encontrado na guia' });
      }

      const deletado = await GuiaModel.removerProdutoGuia(produtoParaRemover.id);
      if (!deletado) {
        return res.status(400).json({ success: false, error: 'Erro ao remover produto' });
      }

      res.json({ success: true, message: 'Produto removido da guia com sucesso' });
    } catch (error) {
      console.error('Erro ao remover produto:', error);
      res.status(500).json({ success: false, error: 'Erro ao remover produto' });
    }
  },

  // Remover item da guia pelo ID direto
  async removerItemGuia(req: Request, res: Response) {
    try {
      const { itemId } = req.params;
      
      if (!itemId) {
        return res.status(400).json({ success: false, error: 'ID do item é obrigatório' });
      }

      const deletado = await GuiaModel.removerProdutoGuia(parseInt(itemId));
      
      if (!deletado) {
        return res.status(404).json({ success: false, error: 'Item não encontrado ou erro ao remover' });
      }

      res.json({ success: true, message: 'Item removido com sucesso' });
    } catch (error) {
      console.error('Erro ao remover item:', error);
      res.status(500).json({ success: false, error: 'Erro ao remover item' });
    }
  },

  // Listar produtos de uma guia
  async listarProdutosGuia(req: Request, res: Response) {
    try {
      const { guiaId } = req.params;
      const { escolaId } = req.query;

      const guia = await GuiaModel.buscarGuia(parseInt(guiaId));
      if (!guia) {
        return res.status(404).json({ success: false, error: 'Guia não encontrada' });
      }

      let produtos = await GuiaModel.listarProdutosPorGuia(parseInt(guiaId));
      
      if (escolaId) {
        produtos = produtos.filter(p => p.escola_id === parseInt(escolaId as string));
      }

      produtos.sort((a, b) => {
        const escolaA = (a as Record<string,any>).escola_nome || '';
        const escolaB = (b as Record<string,any>).escola_nome || '';
        const produtoA = (a as Record<string,any>).produto_nome || '';
        const produtoB = (b as Record<string,any>).produto_nome || '';
        
        if (escolaA !== escolaB) {
          return escolaA.localeCompare(escolaB);
        }
        return produtoA.localeCompare(produtoB);
      });

      res.json({ success: true, data: produtos });
    } catch (error) {
      console.error('Erro ao listar produtos:', error);
      res.status(500).json({ success: false, error: 'Erro ao listar produtos' });
    }
  },

  // Atualizar dados de entrega
  async atualizarEntrega(req: Request, res: Response) {
    try {

      const { guiaId, produtoId, escolaId } = req.params;
      const { 
        entrega_confirmada, 
        quantidade_entregue, 
        data_entrega, 
        nome_quem_recebeu, 
        nome_quem_entregou 
      } = req.body;

      if (!guiaId || !produtoId || !escolaId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Parâmetros inválidos: guiaId, produtoId e escolaId são obrigatórios' 
        });
      }

      const guiaIdNum = parseInt(guiaId);
      const produtoIdNum = parseInt(produtoId);
      const escolaIdNum = parseInt(escolaId);

      if (isNaN(guiaIdNum) || isNaN(produtoIdNum) || isNaN(escolaIdNum)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Parâmetros devem ser números válidos' 
        });
      }

      const produtos = await GuiaModel.listarProdutosPorGuia(guiaIdNum);
      const produto = produtos.find(p => 
        p.produto_id === produtoIdNum && 
        p.escola_id === escolaIdNum
      );

      if (!produto) {
        return res.status(404).json({ success: false, error: 'Produto não encontrado na guia' });
      }

      const produtoAtualizado = await GuiaModel.atualizarProdutoGuia(produto.id, {
        entrega_confirmada,
        quantidade_entregue,
        data_entrega,
        nome_quem_recebeu,
        nome_quem_entregou,
        status: entrega_confirmada === true ? 'entregue' : entrega_confirmada === false ? 'pendente' : undefined
      });

      res.json({ success: true, data: produtoAtualizado });
    } catch (error) {
      console.error('Erro ao atualizar entrega:', error);
      res.status(500).json({ success: false, error: 'Erro ao atualizar dados de entrega' });
    }
  },

  // Atualizar campo para_entrega de um item
  async atualizarParaEntrega(req: Request, res: Response) {
    try {

      const { itemId } = req.params;
      const { para_entrega } = req.body;

      if (!itemId || isNaN(Number(itemId))) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID do item é obrigatório e deve ser um número' 
        });
      }

      if (para_entrega === undefined || typeof para_entrega !== 'boolean') {
        return res.status(400).json({ 
          success: false, 
          error: 'Campo para_entrega é obrigatório e deve ser um boolean' 
        });
      }

      const item = await GuiaModel.buscarProdutoGuia(Number(itemId));
      if (!item) {
        return res.status(404).json({ 
          success: false, 
          error: 'Item não encontrado' 
        });
      }

      const itemAtualizado = await GuiaModel.atualizarProdutoGuia(Number(itemId), {
        para_entrega
      });

      res.json({ 
        success: true, 
        data: itemAtualizado,
        message: `Item ${para_entrega ? 'marcado' : 'desmarcado'} para entrega`
      });
    } catch (error) {
      console.error('Erro ao atualizar para_entrega:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar campo para_entrega' 
      });
    }
  },

  // Listar todos os itens de uma guia
  async listarItensGuia(req: Request, res: Response) {
    try {

      const { guiaId } = req.params;
      const guia = await GuiaModel.buscarGuia(parseInt(guiaId));
      
      if (!guia) {
        return res.status(404).json({ success: false, error: 'Guia não encontrada' });
      }

      const itens = await GuiaModel.listarProdutosPorGuia(parseInt(guiaId));
      
      const itensFormatados = itens.map(item => ({
        id: item.id,
        produto_nome: (item as Record<string,any>).produto_nome || 'Produto não identificado',
        quantidade: item.quantidade || 0,
        unidade: item.unidade || (item as Record<string,any>).produto_unidade || 'un',
        quantidade_demanda: (item as Record<string,any>).quantidade_demanda || item.quantidade || 0,
        lote: item.lote || null,
        escola_nome: (item as Record<string,any>).escola_nome || 'Escola não identificada',
        escola_id: item.escola_id,
        produto_id: item.produto_id,
        guia_id: item.guia_id,
        status: item.status || 'pendente',
        data_entrega: item.data_entrega || null,
      }));

      res.json({ success: true, data: itensFormatados });
    } catch (error) {
      console.error('Erro ao listar itens da guia:', error);
      res.status(500).json({ success: false, error: 'Erro ao listar itens da guia' });
    }
  },

  // Listar produtos de uma escola para um mês/ano específico
  async listarProdutosPorEscola(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;
      const { mes, ano } = req.query;

      if (!mes || !ano) {
        return res.status(400).json({ success: false, error: 'Mês e ano são obrigatórios' });
      }

      const produtos = await GuiaModel.listarProdutosPorEscola(
        parseInt(escolaId),
        parseInt(mes as string),
        parseInt(ano as string)
      );

      res.json({ success: true, data: produtos });
    } catch (error) {
      console.error('Erro ao listar produtos por escola:', error);
      res.status(500).json({ success: false, error: 'Erro ao listar produtos por escola' });
    }
  },

  // Adicionar produto para uma escola (cria guia se necessário)
  async adicionarProdutoEscola(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;
      const { produtoId, quantidade, unidade, data_entrega, observacao, status, mes_competencia, ano_competencia } = req.body;

      if (!data_entrega) {
        return res.status(400).json({ success: false, error: 'Data de entrega é obrigatória' });
      }

      // Determinar mês/ano de competência
      // Se fornecido explicitamente, usar. Caso contrário, usar o mês/ano da data de entrega
      let mes: number;
      let ano: number;

      if (mes_competencia && ano_competencia) {
        // Usuário especificou explicitamente o mês de competência
        mes = parseInt(mes_competencia);
        ano = parseInt(ano_competencia);
      } else {
        // Usar o mês/ano da data de entrega como competência
        const data = new Date(data_entrega);
        mes = data.getMonth() + 1;
        ano = data.getFullYear();
      }

      // Validar mês e ano
      if (mes < 1 || mes > 12) {
        return res.status(400).json({ success: false, error: 'Mês de competência inválido (deve ser entre 1 e 12)' });
      }

      if (ano < 2020 || ano > 2100) {
        return res.status(400).json({ success: false, error: 'Ano de competência inválido' });
      }

      // Buscar ou criar guia para o mês/ano de competência
      let guia = await GuiaModel.buscarGuiaPorMesAno(mes, ano);
      
      if (!guia) {
        guia = await GuiaModel.criarGuia({
          mes,
          ano,
          nome: `Guia ${mes}/${ano}`,
          observacao: 'Gerada automaticamente ao adicionar produto'
        });
      }

      // Adicionar produto à guia
      const guiaProduto = await GuiaModel.adicionarProdutoGuia({
        guia_id: guia.id,
        produto_id: parseInt(produtoId),
        escola_id: parseInt(escolaId),
        quantidade,
        unidade: unidade || 'un',
        lote: null,
        observacao,
        para_entrega: true,
        status: status || 'pendente',
        data_entrega
      });

      res.json({ 
        success: true, 
        data: guiaProduto,
        info: {
          mes_competencia: mes,
          ano_competencia: ano,
          data_entrega: data_entrega,
          entrega_antecipada: new Date(data_entrega) < new Date(ano, mes - 1, 1)
        }
      });
    } catch (error) {
      console.error('Erro ao adicionar produto para escola:', error);
      res.status(500).json({ success: false, error: 'Erro ao adicionar produto para escola' });
    }
  },

  // Atualizar produto da escola (NOVO)
  async atualizarProdutoEscola(req: Request, res: Response) {
    try {
      const { itemId } = req.params;
      const { quantidade, unidade, observacao, status, data_entrega } = req.body;

      const produtoGuia = await GuiaModel.atualizarProdutoGuia(parseInt(itemId), {
        quantidade,
        unidade,
        observacao,
        status,
        data_entrega
      });

      res.json({ success: true, data: produtoGuia });
    } catch (error) {
      console.error('Erro ao atualizar produto da escola:', error);
      res.status(500).json({ success: false, error: 'Erro ao atualizar produto da escola' });
    }
  },

  // Listar status das escolas para o mês/ano
  async listarStatusEscolas(req: Request, res: Response) {
    try {
      const { mes, ano, guia_id } = req.query;

      if (!mes || !ano) {
        return res.status(400).json({ 
          success: false, 
          error: 'Mês e ano são obrigatórios' 
        });
      }

      const escolas = await GuiaModel.listarStatusEscolas(
        Number(mes),
        Number(ano),
        guia_id ? Number(guia_id) : undefined
      );
      
      res.json(escolas);
    } catch (error) {
      console.error('❌ [GuiaController] Erro ao listar status escolas:', error);
      res.status(500).json({ success: false, error: 'Erro ao listar status escolas' });
    }
  },

  // Listar romaneio
  async listarRomaneio(req: Request, res: Response) {
    try {
      const { data_inicio, data_fim, escola_id, rota_id, rota_ids, status } = req.query;
      const rotaIds = normalizeRomaneioRouteIds({ rota_id, rota_ids });

      const items = await GuiaModel.listarRomaneio({
        dataInicio: data_inicio as string,
        dataFim: data_fim as string,
        escolaId: escola_id ? parseInt(escola_id as string) : undefined,
        rotaId: rota_id ? parseInt(rota_id as string) : undefined,
        rotaIds,
        status: status as string
      });

      res.json({ success: true, data: items });
    } catch (error) {
      console.error('Erro ao listar romaneio:', error);
      res.status(500).json({ success: false, error: 'Erro ao listar romaneio' });
    }
  },

  // Listar itens da guia agrupados por (produto, data_entrega) com quantidades por escola — para ajuste fino
  async listarItensParaAjuste(req: Request, res: Response) {
    try {
      const { guiaId } = req.params;
      const guia = await GuiaModel.buscarGuia(parseInt(guiaId));
      if (!guia) return res.status(404).json({ success: false, error: 'Guia não encontrada' });

      const itens = await GuiaModel.listarProdutosPorGuia(parseInt(guiaId));

      // Agrupar por (produto_id, data_entrega) → lista de { escola_id, quantidade, quantidade_demanda }
      const grupos = new Map<string, {
        produto_id: number; produto_nome: string; unidade: string; data_entrega: string | null;
        escolas: { id: number; nome: string; quantidade: number; quantidade_demanda: number }[];
      }>();

      for (const item of itens) {
        let dataKey = '';
        if (item.data_entrega) {
          // Handle both Date objects and strings
          const d = item.data_entrega as any;
          if (d instanceof Date) {
            dataKey = d.toISOString().split('T')[0];
          } else {
            dataKey = String(d).split('T')[0];
          }
        }
        const key = `${item.produto_id}__${dataKey}`;
        if (!grupos.has(key)) {
          grupos.set(key, {
            produto_id: item.produto_id,
            produto_nome: (item as Record<string,any>).produto_nome || '',
            unidade: (item as Record<string,any>).produto_unidade || (item as Record<string,any>).unidade || 'kg',
            data_entrega: dataKey || null,
            escolas: [],
          });
        }
        grupos.get(key)!.escolas.push({
          id: item.escola_id,
          nome: (item as Record<string,any>).escola_nome || '',
          quantidade: Number(item.quantidade) || 0,
          quantidade_demanda: Number((item as Record<string,any>).quantidade_demanda ?? item.quantidade) || 0,
          item_id: item.id,
        } as any);
      }

      res.json({ success: true, data: Array.from(grupos.values()) });
    } catch (error) {
      console.error('Erro ao listar itens para ajuste:', error);
      res.status(500).json({ success: false, error: 'Erro ao listar itens para ajuste' });
    }
  },

  // Salvar ajuste fino: recebe array de { item_id, quantidade }
  async salvarAjuste(req: Request, res: Response) {
    try {
      const { guiaId } = req.params;
      const { ajustes } = req.body as { ajustes: { item_id: number; quantidade: number }[] };

      if (!ajustes || !Array.isArray(ajustes)) {
        return res.status(400).json({ success: false, error: 'ajustes é obrigatório' });
      }

      const guia = await GuiaModel.buscarGuia(parseInt(guiaId));
      if (!guia) return res.status(404).json({ success: false, error: 'Guia não encontrada' });

      for (const aj of ajustes) {
        await GuiaModel.atualizarProdutoGuia(aj.item_id, { quantidade: aj.quantidade });
      }

      res.json({ success: true, total_ajustados: ajustes.length });
    } catch (error) {
      console.error('Erro ao salvar ajuste:', error);
      res.status(500).json({ success: false, error: 'Erro ao salvar ajuste' });
    }
  },

  // Listar competências com resumo de status
  async listarCompetencias(req: Request, res: Response) {    try {
      
      const competencias = await GuiaModel.listarCompetencias();
      
      res.json({ success: true, data: competencias });
    } catch (error) {
      console.error('❌ [GuiaController] Erro ao listar competências:', error);
      res.status(500).json({ success: false, error: 'Erro ao listar competências' });
    }
  }
};
