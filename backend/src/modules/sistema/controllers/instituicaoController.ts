import { Request, Response } from 'express';
import { Instituicao, InstituicaoInput } from '../models/Instituicao';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import db from '../../../database';

// Configuração do multer para upload de logo
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/logos');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, gif, svg)'));
    }
  }
});

// Buscar configurações da instituição
const buscarInstituicao = async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT * FROM instituicoes 
      WHERE ativo = true 
      ORDER BY id DESC 
      LIMIT 1
    `);

    let instituicao = result.rows[0];

    if (!instituicao) {
      // Criar registro padrão se não existir
      const insertResult = await db.query(`
        INSERT INTO instituicoes (nome, ativo) 
        VALUES ($1, $2) 
        RETURNING *
      `, ['Secretaria Municipal de Educação', true]);
      
      instituicao = insertResult.rows[0];
    }

    res.json(instituicao);
  } catch (error) {
    console.error('Erro ao buscar instituição:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: (error as Error).message 
    });
  }
};

// Atualizar configurações da instituição
const atualizarInstituicao = async (req: Request, res: Response) => {
  try {
    const {
      nome,
      cnpj,
      endereco,
      telefone,
      email,
      site,
      secretario_nome,
      secretario_cargo,
      departamento,
      pdf_templates
    } = req.body;

    // Buscar instituição atual
    const currentResult = await db.query(`
      SELECT * FROM instituicoes 
      WHERE ativo = true 
      ORDER BY id DESC 
      LIMIT 1
    `);

    let instituicao = currentResult.rows[0];

    const dadosAtualizacao: any = {
      nome,
      cnpj,
      endereco,
      telefone,
      email,
      site,
      secretario_nome,
      secretario_cargo: secretario_cargo || 'Secretário(a) de Educação',
      departamento,
      pdf_templates: pdf_templates ? JSON.stringify(pdf_templates) : undefined,
    };

    // Se foi enviado um arquivo de logo
    if (req.file) {
      // Remover logo anterior se existir
      if (instituicao && instituicao.logo_url && !instituicao.logo_url.startsWith('data:')) {
        try {
          const logoPath = path.join(__dirname, '../../uploads/logos', path.basename(instituicao.logo_url));
          await fs.unlink(logoPath);
        } catch (error) {
        }
      }

      dadosAtualizacao.logo_url = `/uploads/logos/${req.file.filename}`;
    }

    let result;
    if (instituicao) {
      // Atualizar registro existente
      result = await db.query(`
        UPDATE instituicoes 
        SET nome = $1, cnpj = $2, endereco = $3, telefone = $4, email = $5, 
            site = $6, secretario_nome = $7, secretario_cargo = $8, logo_url = COALESCE($9, logo_url),
            departamento = $10, pdf_templates = COALESCE($11, pdf_templates),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $12
        RETURNING *
      `, [
        dadosAtualizacao.nome,
        dadosAtualizacao.cnpj,
        dadosAtualizacao.endereco,
        dadosAtualizacao.telefone,
        dadosAtualizacao.email,
        dadosAtualizacao.site,
        dadosAtualizacao.secretario_nome,
        dadosAtualizacao.secretario_cargo,
        dadosAtualizacao.logo_url,
        dadosAtualizacao.departamento,
        dadosAtualizacao.pdf_templates,
        instituicao.id
      ]);
    } else {
      // Criar novo registro
      result = await db.query(`
        INSERT INTO instituicoes (nome, cnpj, endereco, telefone, email, site, secretario_nome, secretario_cargo, logo_url, ativo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        dadosAtualizacao.nome,
        dadosAtualizacao.cnpj,
        dadosAtualizacao.endereco,
        dadosAtualizacao.telefone,
        dadosAtualizacao.email,
        dadosAtualizacao.site,
        dadosAtualizacao.secretario_nome,
        dadosAtualizacao.secretario_cargo,
        dadosAtualizacao.logo_url,
        true
      ]);
    }

    res.json({
      message: 'Configurações da instituição atualizadas com sucesso',
      instituicao: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar instituição:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: (error as Error).message 
    });
  }
};

// Upload de logo via base64
const uploadLogoBase64 = async (req: Request, res: Response) => {
  try {
    const { logoBase64 } = req.body;

    if (!logoBase64) {
      return res.status(400).json({ message: 'Logo em base64 é obrigatória' });
    }

    // Buscar instituição atual
    const currentResult = await db.query(`
      SELECT * FROM instituicoes 
      WHERE ativo = true 
      ORDER BY id DESC 
      LIMIT 1
    `);

    let result;
    if (currentResult.rows[0]) {
      // Atualizar registro existente
      result = await db.query(`
        UPDATE instituicoes 
        SET logo_url = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [logoBase64, currentResult.rows[0].id]);
    } else {
      // Criar novo registro
      result = await db.query(`
        INSERT INTO instituicoes (nome, logo_url, ativo)
        VALUES ($1, $2, $3)
        RETURNING *
      `, ['Secretaria Municipal de Educação', logoBase64, true]);
    }

    res.json({
      message: 'Logo atualizada com sucesso',
      instituicao: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao fazer upload da logo:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: (error as Error).message 
    });
  }
};

// Salvar template PDF por nome (ex: 'guia_entrega', 'comprovante')
const salvarTemplate = async (req: Request, res: Response) => {
  try {
    const { nome } = req.params;
    const { template } = req.body;

    if (!template) return res.status(400).json({ message: 'Template é obrigatório' });

    const current = await db.query(`SELECT id, pdf_templates FROM instituicoes WHERE ativo = true ORDER BY id DESC LIMIT 1`);
    if (!current.rows[0]) return res.status(404).json({ message: 'Instituição não encontrada' });

    const templates = current.rows[0].pdf_templates || {};
    templates[nome] = template;

    await db.query(
      `UPDATE instituicoes SET pdf_templates = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [JSON.stringify(templates), current.rows[0].id]
    );

    res.json({ message: 'Template salvo com sucesso', nome, template });
  } catch (error) {
    console.error('Erro ao salvar template:', error);
    res.status(500).json({ message: 'Erro interno', error: (error as Error).message });
  }
};

export {
  buscarInstituicao,
  atualizarInstituicao,
  uploadLogoBase64,
  salvarTemplate,
  upload
};