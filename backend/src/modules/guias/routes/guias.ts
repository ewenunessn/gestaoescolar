import express from 'express';
import GuiaModel from '../models/Guia';
import { devAuthMiddleware as authenticateToken } from '../../../middlewares';

const router = express.Router();

// Listar todas as guias
router.get('/', authenticateToken, async (req, res) => {
  try {
    const guias = await GuiaModel.listarGuias();
    res.json(guias);
  } catch (error) {
    console.error('Erro ao listar guias:', error);
    res.status(500).json({ error: 'Erro ao listar guias' });
  }
});

// Buscar guia por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const guia = await GuiaModel.buscarGuia(id);
    
    if (!guia) {
      return res.status(404).json({ error: 'Guia não encontrada' });
    }

    const produtos = await GuiaModel.listarProdutosPorGuia(id);
    
    res.json({
      ...guia,
      produtos
    });
  } catch (error) {
    console.error('Erro ao buscar guia:', error);
    res.status(500).json({ error: 'Erro ao buscar guia' });
  }
});

// Criar nova guia
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { mes, ano, observacao } = req.body;
    
    if (!mes || !ano) {
      return res.status(400).json({ error: 'Mês e ano são obrigatórios' });
    }

    const guia = await GuiaModel.criarGuia({
      mes,
      ano,
      observacao
    });

    res.status(201).json(guia);
  } catch (error) {
    console.error('Erro ao criar guia:', error);
    res.status(500).json({ error: 'Erro ao criar guia' });
  }
});

// Atualizar guia
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { mes, ano, observacao } = req.body;

    const guia = await GuiaModel.atualizarGuia(id, {
      mes,
      ano,
      observacao
    });

    if (!guia) {
      return res.status(404).json({ error: 'Guia não encontrada' });
    }

    res.json(guia);
  } catch (error) {
    console.error('Erro ao atualizar guia:', error);
    res.status(500).json({ error: 'Erro ao atualizar guia' });
  }
});

// Deletar guia
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await GuiaModel.deletarGuia(id);

    if (!success) {
      return res.status(404).json({ error: 'Guia não encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar guia:', error);
    res.status(500).json({ error: 'Erro ao deletar guia' });
  }
});

// Listar produtos de uma guia
router.get('/:id/produtos', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const produtos = await GuiaModel.listarProdutosPorGuia(id);
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao listar produtos da guia:', error);
    res.status(500).json({ error: 'Erro ao listar produtos da guia' });
  }
});

// Adicionar produto à guia
router.post('/:id/produtos', authenticateToken, async (req, res) => {
  try {
    const guiaId = parseInt(req.params.id);
    const { produto_id, escola_id, quantidade, unidade } = req.body;

    if (!produto_id || !escola_id || !quantidade || !unidade) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const produtoGuia = await GuiaModel.adicionarProdutoGuia({
      guia_id: guiaId,
      produto_id,
      escola_id,
      quantidade,
      unidade
    });

    res.status(201).json(produtoGuia);
  } catch (error) {
    console.error('Erro ao adicionar produto à guia:', error);
    res.status(500).json({ error: 'Erro ao adicionar produto à guia' });
  }
});

// Atualizar produto na guia
router.put('/:id/produtos/:produtoId', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.produtoId);
    const { quantidade, unidade } = req.body;

    const produtoGuia = await GuiaModel.atualizarProdutoGuia(id, {
      quantidade,
      unidade
    });

    if (!produtoGuia) {
      return res.status(404).json({ error: 'Produto não encontrado na guia' });
    }

    res.json(produtoGuia);
  } catch (error) {
    console.error('Erro ao atualizar produto na guia:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto na guia' });
  }
});

// Remover produto da guia
router.delete('/:id/produtos/:produtoId', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.produtoId);
    const success = await GuiaModel.removerProdutoGuia(id);

    if (!success) {
      return res.status(404).json({ error: 'Produto não encontrado na guia' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover produto da guia:', error);
    res.status(500).json({ error: 'Erro ao remover produto da guia' });
  }
});

export default router;
