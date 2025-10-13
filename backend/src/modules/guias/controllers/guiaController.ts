import { Request, Response } from 'express';
import GuiaModel from '../models/Guia';

export const guiaController = {
  // Listar todas as guias
  async listarGuias(req: Request, res: Response) {
    try {
      const { mes, ano, status } = req.query;
      const where: any = {};
      
      if (mes) where.mes = parseInt(mes as string);
      if (ano) where.ano = parseInt(ano as string);
      if (status) where.status = status;

      const guias = await GuiaModel.listarGuias();

      res.json({ success: true, data: guias });
    } catch (error) {
      console.error('Erro ao listar guias:', error);
      res.status(500).json({ success: false, error: 'Erro ao listar guias' });
    }
  },

  // Criar nova guia
  async criarGuia(req: Request, res: Response) {
    try {
      const { mes, ano, observacao } = req.body;

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
      const { observacao, status } = req.body;

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
      const { produtoId, escolaId, quantidade, unidade, observacao, para_entrega } = req.body;

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

      // As validações de produto e escola serão feitas no banco de dados

      const guiaProduto = await GuiaModel.adicionarProdutoGuia({
        guia_id: parseInt(guiaId),
        produto_id: parseInt(produtoId),
        escola_id: parseInt(escolaId),
        quantidade,
        unidade,
        lote: req.body.lote,
        observacao: req.body.observacao,
        para_entrega: para_entrega !== undefined ? para_entrega : true
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

      // Remover produto da guia
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
      
      // Filtrar por escola se especificado
      if (escolaId) {
        produtos = produtos.filter(p => p.escola_id === parseInt(escolaId as string));
      }

      // Ordenar por escola e produto
      produtos.sort((a, b) => {
        const escolaA = (a as any).escola_nome || '';
        const escolaB = (b as any).escola_nome || '';
        const produtoA = (a as any).produto_nome || '';
        const produtoB = (b as any).produto_nome || '';
        
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

      // Validar parâmetros
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

      // Buscar o produto na guia
      const produtos = await GuiaModel.listarProdutosPorGuia(guiaIdNum);
      const produto = produtos.find(p => 
        p.produto_id === produtoIdNum && 
        p.escola_id === escolaIdNum
      );

      if (!produto) {
        return res.status(404).json({ success: false, error: 'Produto não encontrado na guia' });
      }

      // Atualizar dados de entrega
      const produtoAtualizado = await GuiaModel.atualizarProdutoGuia(produto.id, {
        entrega_confirmada,
        quantidade_entregue,
        data_entrega,
        nome_quem_recebeu,
        nome_quem_entregou
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
  }
};