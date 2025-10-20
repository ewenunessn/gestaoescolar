import { Request, Response } from 'express';
import RotaModel from '../models/Rota';
import EntregaModel from '../models/Entrega';
import ConfiguracaoEntregaModel from '../models/ConfiguracaoEntrega';

class RotaController {
  // Rotas de Entrega
  async listarRotas(req: Request, res: Response) {
    try {
      const rotas = await RotaModel.listarRotas();
      res.json(rotas);
    } catch (error) {
      console.error('Erro ao listar rotas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async buscarRota(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      const rota = await RotaModel.buscarRota(Number(id));
      
      if (!rota) {
        return res.status(404).json({ error: 'Rota não encontrada' });
      }

      res.json(rota);
    } catch (error) {
      console.error('Erro ao buscar rota:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async criarRota(req: Request, res: Response) {
    try {
      const { nome, descricao, cor } = req.body;

      if (!nome || nome.trim().length === 0) {
        return res.status(400).json({ error: 'Nome da rota é obrigatório' });
      }

      const rota = await RotaModel.criarRota({
        nome: nome.trim(),
        descricao: descricao?.trim(),
        cor: cor || '#1976d2'
      });

      res.status(201).json({
        message: 'Rota criada com sucesso',
        rota
      });
    } catch (error) {
      console.error('Erro ao criar rota:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async atualizarRota(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nome, descricao, cor } = req.body;

      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      const rota = await RotaModel.atualizarRota(Number(id), {
        nome: nome?.trim(),
        descricao: descricao?.trim(),
        cor
      });

      res.json({
        message: 'Rota atualizada com sucesso',
        rota
      });
    } catch (error) {
      console.error('Erro ao atualizar rota:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async deletarRota(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      const sucesso = await RotaModel.deletarRota(Number(id));

      if (!sucesso) {
        return res.status(404).json({ error: 'Rota não encontrada' });
      }

      res.json({ message: 'Rota desativada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar rota:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Escolas da Rota
  async listarEscolasRota(req: Request, res: Response) {
    try {
      const { rotaId } = req.params;

      if (!rotaId || isNaN(Number(rotaId))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      const escolas = await RotaModel.listarEscolasRota(Number(rotaId));
      res.json(escolas);
    } catch (error) {
      console.error('Erro ao listar escolas da rota:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async adicionarEscolaRota(req: Request, res: Response) {
    try {
      const { rotaId } = req.params;
      const { escolaId, ordem, observacao } = req.body;

      if (!rotaId || isNaN(Number(rotaId))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      if (!escolaId || isNaN(Number(escolaId))) {
        return res.status(400).json({ error: 'ID da escola é obrigatório e deve ser um número' });
      }

      const escolaRota = await RotaModel.adicionarEscolaRota(
        Number(rotaId),
        Number(escolaId),
        ordem ? Number(ordem) : undefined,
        observacao
      );

      res.status(201).json({
        message: 'Escola adicionada à rota com sucesso',
        escolaRota
      });
    } catch (error) {
      console.error('Erro ao adicionar escola à rota:', error);
      
      if (error instanceof Error && error.message.includes('já está associada')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async removerEscolaRota(req: Request, res: Response) {
    try {
      const { rotaId, escolaId } = req.params;

      if (!rotaId || isNaN(Number(rotaId))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      if (!escolaId || isNaN(Number(escolaId))) {
        return res.status(400).json({ error: 'ID da escola é obrigatório e deve ser um número' });
      }

      const sucesso = await RotaModel.removerEscolaRota(Number(rotaId), Number(escolaId));

      if (!sucesso) {
        return res.status(404).json({ error: 'Associação não encontrada' });
      }

      res.json({ message: 'Escola removida da rota com sucesso' });
    } catch (error) {
      console.error('Erro ao remover escola da rota:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async atualizarOrdemEscolas(req: Request, res: Response) {
    try {
      const { rotaId } = req.params;
      const { escolasOrdem } = req.body;

      if (!rotaId || isNaN(Number(rotaId))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      if (!Array.isArray(escolasOrdem)) {
        return res.status(400).json({ error: 'escolasOrdem deve ser um array' });
      }

      const sucesso = await RotaModel.atualizarOrdemEscolas(Number(rotaId), escolasOrdem);

      if (!sucesso) {
        return res.status(400).json({ error: 'Erro ao atualizar ordem das escolas' });
      }

      res.json({ message: 'Ordem das escolas atualizada com sucesso' });
    } catch (error) {
      console.error('Erro ao atualizar ordem das escolas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Planejamento de Entregas
  async listarPlanejamentos(req: Request, res: Response) {
    try {
      const { guiaId, rotaId } = req.query;

      const planejamentos = await RotaModel.listarPlanejamentos(
        guiaId ? Number(guiaId) : undefined,
        rotaId ? Number(rotaId) : undefined
      );

      res.json(planejamentos);
    } catch (error) {
      console.error('Erro ao listar planejamentos:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async criarPlanejamento(req: Request, res: Response) {
    try {
      const { guiaId, rotaId, dataPlanejada, responsavel, observacao } = req.body;

      if (!guiaId || isNaN(Number(guiaId))) {
        return res.status(400).json({ error: 'ID da guia é obrigatório e deve ser um número' });
      }

      if (!rotaId || isNaN(Number(rotaId))) {
        return res.status(400).json({ error: 'ID da rota é obrigatório e deve ser um número' });
      }

      const planejamento = await RotaModel.criarPlanejamento({
        guia_id: Number(guiaId),
        rota_id: Number(rotaId),
        data_planejada: dataPlanejada,
        responsavel: responsavel?.trim(),
        observacao: observacao?.trim()
      });

      res.status(201).json({
        message: 'Planejamento criado com sucesso',
        planejamento
      });
    } catch (error) {
      console.error('Erro ao criar planejamento:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async atualizarPlanejamento(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { dataPlanejada, responsavel, observacao, status } = req.body;

      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'ID do planejamento é obrigatório e deve ser um número' });
      }

      const planejamento = await RotaModel.atualizarPlanejamento(Number(id), {
        data_planejada: dataPlanejada,
        responsavel: responsavel?.trim(),
        observacao: observacao?.trim(),
        status
      });

      res.json({
        message: 'Planejamento atualizado com sucesso',
        planejamento
      });
    } catch (error) {
      console.error('Erro ao atualizar planejamento:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async deletarPlanejamento(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: 'ID do planejamento é obrigatório e deve ser um número' });
      }

      const sucesso = await RotaModel.deletarPlanejamento(Number(id));

      if (!sucesso) {
        return res.status(404).json({ error: 'Planejamento não encontrado' });
      }

      res.json({ message: 'Planejamento removido com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar planejamento:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Escolas disponíveis
  async listarEscolasDisponiveis(req: Request, res: Response) {
    try {
      const escolas = await RotaModel.listarEscolasDisponiveis();
      res.json(escolas);
    } catch (error) {
      console.error('Erro ao listar escolas disponíveis:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async verificarEscolaEmRota(req: Request, res: Response) {
    try {
      const { escolaId } = req.params;

      if (!escolaId || isNaN(Number(escolaId))) {
        return res.status(400).json({ error: 'ID da escola é obrigatório e deve ser um número' });
      }

      const resultado = await RotaModel.verificarEscolaEmRota(Number(escolaId));
      res.json(resultado);
    } catch (error) {
      console.error('Erro ao verificar escola em rota:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Para o módulo de entregas
  async listarRotasComEntregas(req: Request, res: Response) {
    try {
      const { guiaId } = req.query;

      const rotas = await RotaModel.listarRotasComEntregas(
        guiaId ? Number(guiaId) : undefined
      );

      res.json(rotas);
    } catch (error) {
      console.error('Erro ao listar rotas com entregas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
  async criarPlanejamentoAvancado(req: Request, res: Response) {
    try {
      const { guiaId, rotaIds, dataPlanejada, observacao, itensSelecionados } = req.body;

      if (!guiaId || !rotaIds || !Array.isArray(rotaIds) || rotaIds.length === 0) {
        return res.status(400).json({ 
          error: 'Guia ID e pelo menos uma rota são obrigatórios' 
        });
      }

      const planejamentos = [];

      // Criar um planejamento para cada rota selecionada
      for (const rotaId of rotaIds) {
        const observacaoCompleta = `${observacao || ''} - Itens selecionados: ${itensSelecionados?.length || 0}`;
        
        const planejamento = await RotaModel.criarPlanejamento({
          guia_id: guiaId,
          rota_id: rotaId,
          data_planejada: dataPlanejada || null,
          responsavel: null,
          observacao: observacaoCompleta
        });

        planejamentos.push(planejamento);
      }

      res.json({ 
        message: `${planejamentos.length} planejamento(s) criado(s) com sucesso`,
        planejamentos 
      });
    } catch (error) {
      console.error('Erro ao criar planejamento avançado:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Métodos com filtros da configuração ativa
  async listarRotasFiltradas(req: Request, res: Response) {
    try {
      // Buscar configuração ativa
      const configuracao = await ConfiguracaoEntregaModel.buscarConfiguracaoAtiva();
      
      if (!configuracao) {
        // Se não há configuração, retornar todas as rotas
        return this.listarRotasComEntregas(req, res);
      }

      console.log('🔍 Configuração encontrada:', {
        id: configuracao.id,
        guiaId: configuracao.guia_id,
        rotasSelecionadas: configuracao.rotas_selecionadas
      });

      // Buscar todas as rotas básicas primeiro
      const todasRotasBasicas = await RotaModel.listarRotas();
      console.log('📋 Todas as rotas básicas:', todasRotasBasicas.map(r => ({ id: r.id, nome: r.nome })));
      
      // Filtrar apenas as rotas selecionadas na configuração
      const rotasBasicasFiltradas = todasRotasBasicas.filter(rota => 
        configuracao.rotas_selecionadas.includes(rota.id)
      );
      
      console.log('✅ Rotas básicas filtradas:', rotasBasicasFiltradas.map(r => ({ id: r.id, nome: r.nome })));

      // Para cada rota filtrada, buscar dados de entregas
      const rotasFiltradas = [];
      
      for (const rota of rotasBasicasFiltradas) {
        try {
          // Buscar dados de entregas para esta rota específica
          const rotasComEntregas = await RotaModel.listarRotasComEntregas(configuracao.guia_id);
          const rotaComEntregas = rotasComEntregas.find(r => r.id === rota.id);
          
          if (rotaComEntregas) {
            // Se tem dados de entregas, usar esses dados
            rotasFiltradas.push(rotaComEntregas);
          } else {
            // Se não tem dados de entregas, criar estrutura básica
            rotasFiltradas.push({
              id: rota.id,
              nome: rota.nome,
              descricao: rota.descricao,
              cor: rota.cor,
              guia_id: configuracao.guia_id,
              status: 'planejado',
              responsavel: null,
              data_planejada: null,
              mes: null,
              ano: null,
              total_escolas: rota.total_escolas || 0,
              total_itens: 0,
              itens_entregues: 0
            });
          }
        } catch (error) {
          console.error(`Erro ao buscar dados de entregas para rota ${rota.id}:`, error);
          // Em caso de erro, incluir rota básica
          rotasFiltradas.push({
            id: rota.id,
            nome: rota.nome,
            descricao: rota.descricao,
            cor: rota.cor,
            guia_id: configuracao.guia_id,
            status: 'planejado',
            responsavel: null,
            data_planejada: null,
            mes: null,
            ano: null,
            total_escolas: rota.total_escolas || 0,
            total_itens: 0,
            itens_entregues: 0
          });
        }
      }

      console.log('🎯 Rotas finais filtradas:', rotasFiltradas.map(r => ({ id: r.id, nome: r.nome, total_escolas: r.total_escolas })));
      res.json(rotasFiltradas);
    } catch (error) {
      console.error('Erro ao listar rotas filtradas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async listarEscolasFiltradas(req: Request, res: Response) {
    try {
      const { rotaId, guiaId } = req.query;

      // Buscar configuração ativa
      const configuracao = await ConfiguracaoEntregaModel.buscarConfiguracaoAtiva();
      
      if (!configuracao) {
        // Se não há configuração, usar método normal do EntregaController
        const { rotaId, guiaId } = req.query;
        const escolas = await EntregaModel.listarEscolasComEntregas(
          guiaId ? Number(guiaId) : undefined,
          rotaId ? Number(rotaId) : undefined
        );
        return res.json(escolas);
      }

      // Verificar se a rota está nas rotas selecionadas
      if (rotaId && !configuracao.rotas_selecionadas.includes(Number(rotaId))) {
        return res.json([]); // Rota não selecionada, retornar vazio
      }

      // Usar a guia da configuração se não especificada
      const guiaIdFinal = guiaId || configuracao.guia_id;

      // Buscar escolas normalmente
      const escolas = await EntregaModel.listarEscolasComEntregas(Number(guiaIdFinal), Number(rotaId));
      
      // Filtrar escolas que têm itens selecionados na configuração
      const escolasFiltradas = escolas.filter(escola => {
        // Verificar se a escola tem pelo menos um item selecionado
        // Por enquanto, retornar todas as escolas da rota
        // TODO: Implementar filtro por itens específicos
        return true;
      });

      res.json(escolasFiltradas);
    } catch (error) {
      console.error('Erro ao listar escolas filtradas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Configuração de Entrega
  async buscarConfiguracaoAtiva(req: Request, res: Response) {
    try {
      const configuracao = await ConfiguracaoEntregaModel.buscarConfiguracaoAtiva();
      
      if (!configuracao) {
        return res.status(404).json({ 
          success: false,
          message: 'Nenhuma configuração ativa encontrada' 
        });
      }

      res.json({ 
        success: true,
        data: {
          id: configuracao.id,
          guiaId: configuracao.guia_id,
          rotasSelecionadas: configuracao.rotas_selecionadas,
          itensSelecionados: configuracao.itens_selecionados,
          ativa: configuracao.ativa,
          created_at: configuracao.created_at,
          updated_at: configuracao.updated_at
        }
      });
    } catch (error) {
      console.error('Erro ao buscar configuração ativa:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async salvarConfiguracao(req: Request, res: Response) {
    try {
      const { guiaId, rotasSelecionadas, itensSelecionados, ativa } = req.body;

      if (!guiaId || !Array.isArray(rotasSelecionadas) || !Array.isArray(itensSelecionados)) {
        return res.status(400).json({ 
          success: false,
          error: 'Dados inválidos. Verifique guiaId, rotasSelecionadas e itensSelecionados' 
        });
      }

      const configuracao = await ConfiguracaoEntregaModel.criarConfiguracao({
        guia_id: guiaId,
        rotas_selecionadas: rotasSelecionadas,
        itens_selecionados: itensSelecionados,
        ativa: ativa !== false // Default true
      });

      res.json({ 
        success: true,
        message: 'Configuração de entrega salva com sucesso!',
        data: {
          id: configuracao.id,
          guiaId: configuracao.guia_id,
          rotasSelecionadas: configuracao.rotas_selecionadas,
          itensSelecionados: configuracao.itens_selecionados,
          ativa: configuracao.ativa,
          created_at: configuracao.created_at,
          updated_at: configuracao.updated_at
        }
      });
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  async listarConfiguracoes(req: Request, res: Response) {
    try {
      const configuracoes = await ConfiguracaoEntregaModel.listarConfiguracoes();
      
      const configuracoesMapeadas = configuracoes.map(config => ({
        id: config.id,
        guiaId: config.guia_id,
        rotasSelecionadas: config.rotas_selecionadas,
        itensSelecionados: config.itens_selecionados,
        ativa: config.ativa,
        created_at: config.created_at,
        updated_at: config.updated_at
      }));

      res.json({ 
        success: true,
        data: configuracoesMapeadas
      });
    } catch (error) {
      console.error('Erro ao listar configurações:', error);
      res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}

export default new RotaController();