import { Express } from "express";

type OpenApiDocument = Record<string, any>;

const jsonContent = {
  "application/json": {
    schema: {
      $ref: "#/components/schemas/ApiSuccessEnvelope",
    },
  },
};

const errorContent = {
  "application/json": {
    schema: {
      $ref: "#/components/schemas/ApiErrorEnvelope",
    },
  },
};

const validationContent = {
  "application/json": {
    schema: {
      $ref: "#/components/schemas/ValidationErrorEnvelope",
    },
  },
};

function collectionPath(tag: string, summary: string) {
  return {
    get: {
      tags: [tag],
      summary: `Listar ${summary}`,
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
        { name: "sort", in: "query", schema: { type: "string" } },
        { name: "order", in: "query", schema: { type: "string", enum: ["ASC", "DESC", "asc", "desc"] } },
      ],
      responses: {
        "200": { description: "Lista retornada com envelope padrao", content: jsonContent },
        "401": { description: "Nao autenticado", content: errorContent },
      },
    },
    post: {
      tags: [tag],
      summary: `Criar ${summary}`,
      responses: {
        "201": { description: "Registro criado", content: jsonContent },
        "400": { description: "Requisicao invalida", content: errorContent },
        "422": { description: "Erro de validacao", content: validationContent },
      },
    },
  };
}

function itemPath(tag: string, summary: string) {
  return {
    get: {
      tags: [tag],
      summary: `Buscar ${summary} por ID`,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      responses: {
        "200": { description: "Registro retornado", content: jsonContent },
        "404": { description: "Registro nao encontrado", content: errorContent },
      },
    },
    put: {
      tags: [tag],
      summary: `Atualizar ${summary}`,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      responses: {
        "200": { description: "Registro atualizado", content: jsonContent },
        "404": { description: "Registro nao encontrado", content: errorContent },
        "422": { description: "Erro de validacao", content: validationContent },
      },
    },
    delete: {
      tags: [tag],
      summary: `Remover ${summary}`,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      responses: {
        "200": { description: "Registro removido", content: jsonContent },
        "404": { description: "Registro nao encontrado", content: errorContent },
        "409": { description: "Conflito de relacionamento", content: errorContent },
      },
    },
  };
}

export function buildOpenApiDocument(): OpenApiDocument {
  return {
    openapi: "3.0.3",
    info: {
      title: "Sistema de Gestao Escolar API",
      version: "2.0.0",
      description: "Contrato publico das APIs REST com envelope padrao, paginacao e erros de validacao.",
    },
    servers: [
      { url: "http://localhost:3000", description: "Desenvolvimento local" },
      { url: "https://gestaoescolar-backend.vercel.app", description: "Producao" },
    ],
    tags: [
      { name: "Autenticacao" },
      { name: "Usuarios" },
      { name: "Contratos" },
      { name: "Fornecedores" },
      { name: "Produtos" },
      { name: "Escolas" },
      { name: "Guias" },
      { name: "Entregas" },
      { name: "Estoque" },
    ],
    paths: {
      "/api/auth/login": {
        post: {
          tags: ["Autenticacao"],
          summary: "Autenticar usuario",
          responses: {
            "200": { description: "Usuario autenticado", content: jsonContent },
            "401": { description: "Credenciais invalidas", content: errorContent },
            "422": { description: "Erro de validacao", content: validationContent },
          },
        },
      },
      "/api/usuarios": collectionPath("Usuarios", "usuarios"),
      "/api/usuarios/me": {
        get: {
          tags: ["Usuarios"],
          summary: "Obter usuario autenticado",
          responses: {
            "200": { description: "Usuario autenticado", content: jsonContent },
            "401": { description: "Nao autenticado", content: errorContent },
          },
        },
      },
      "/api/contratos": collectionPath("Contratos", "contratos"),
      "/api/contratos/{id}": itemPath("Contratos", "contrato"),
      "/api/fornecedores": collectionPath("Fornecedores", "fornecedores"),
      "/api/fornecedores/{id}": itemPath("Fornecedores", "fornecedor"),
      "/api/produtos": collectionPath("Produtos", "produtos"),
      "/api/produtos/{id}": itemPath("Produtos", "produto"),
      "/api/escolas": collectionPath("Escolas", "escolas"),
      "/api/escolas/{id}": itemPath("Escolas", "escola"),
      "/api/guias": collectionPath("Guias", "guias"),
      "/api/guias/{id}": itemPath("Guias", "guia"),
      "/api/entregas": collectionPath("Entregas", "entregas"),
      "/api/entregas/{id}": itemPath("Entregas", "entrega"),
      "/api/estoque-central": collectionPath("Estoque", "estoque central"),
      "/api/estoque-escolar": collectionPath("Estoque", "estoque escolar"),
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ApiSuccessEnvelope: {
          type: "object",
          required: ["success", "data"],
          properties: {
            success: { type: "boolean", example: true },
            data: {
              description: "Objeto, lista ou null. Listas sempre ficam dentro de data.",
            },
            meta: { $ref: "#/components/schemas/PaginationMeta" },
            message: { type: "string" },
          },
        },
        ApiErrorEnvelope: {
          type: "object",
          required: ["success", "message", "error"],
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string", example: "NOT_FOUND" },
                message: { type: "string" },
              },
            },
          },
        },
        ValidationErrorEnvelope: {
          allOf: [
            { $ref: "#/components/schemas/ApiErrorEnvelope" },
            {
              type: "object",
              required: ["errors", "fields"],
              properties: {
                errors: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["field", "message", "code"],
                    properties: {
                      field: { type: "string", example: "email" },
                      message: { type: "string", example: "Email invalido" },
                      code: { type: "string", example: "invalid_string" },
                    },
                  },
                },
                fields: {
                  type: "object",
                  additionalProperties: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          ],
        },
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 25 },
            total: { type: "integer", example: 100 },
            totalPages: { type: "integer", example: 4 },
            hasNext: { type: "boolean", example: true },
            hasPrev: { type: "boolean", example: false },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  };
}

export function registerOpenApiDocs(app: Express) {
  app.get("/api/openapi.json", (_req, res) => {
    res.json(buildOpenApiDocument());
  });

  app.get("/api/docs", (_req, res) => {
    res.type("html").send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sistema de Gestao Escolar API</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; color: #17202a; background: #f7f9fb; }
      main { max-width: 960px; margin: 0 auto; padding: 40px 24px; }
      h1 { margin: 0 0 8px; font-size: 32px; }
      p { line-height: 1.6; }
      code, pre { background: #edf2f7; border-radius: 6px; }
      code { padding: 2px 6px; }
      pre { padding: 16px; overflow: auto; }
      a { color: #0f5db8; }
      section { margin-top: 28px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Sistema de Gestao Escolar API</h1>
      <p>Documentacao OpenAPI 3.0.3 com endpoints canonicos, envelope de resposta, paginacao e erros padronizados.</p>
      <section>
        <h2>Especificacao</h2>
        <p><a href="/api/openapi.json">Abrir /api/openapi.json</a></p>
      </section>
      <section>
        <h2>Envelope padrao</h2>
        <pre>{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 0,
    "totalPages": 0,
    "hasNext": false,
    "hasPrev": false
  }
}</pre>
      </section>
    </main>
  </body>
</html>`);
  });
}
