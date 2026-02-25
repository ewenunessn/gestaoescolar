const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'https://gestaoescolar-backend.vercel.app';
const EMAIL = process.env.EMAIL || 'ewertonnunes@gmail.com';
const SENHA = process.env.SENHA || '@Nunes8922';

const ESCOLA_ID = process.env.ESCOLA_ID ? Number(process.env.ESCOLA_ID) : null;
const PRODUTO_ID = process.env.PRODUTO_ID ? Number(process.env.PRODUTO_ID) : null;

const QUANTIDADE = Number(process.env.QUANTIDADE || '1');
const UNIDADE = process.env.UNIDADE || 'un';
const DATA_ENTREGA = process.env.DATA_ENTREGA || new Date().toISOString().slice(0,10);
const OBS = process.env.OBS || 'Teste via script';
const STATUS = process.env.STATUS || 'pendente';

async function login() {
  const { data } = await axios.post(`${BASE_URL}/api/usuarios/login`, {
    email: EMAIL,
    senha: SENHA
  });
  if (!data || !data.token) throw new Error('Falha ao autenticar');
  return data.token;
}

async function pickEscola(token) {
  if (ESCOLA_ID) return ESCOLA_ID;
  const { data } = await axios.get(`${BASE_URL}/api/escolas`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const list = data.data || data;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('Nenhuma escola encontrada');
  }
  return list[0].id;
}

async function pickProduto(token) {
  if (PRODUTO_ID) return PRODUTO_ID;
  const { data } = await axios.get(`${BASE_URL}/api/produtos`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const list = data.data || data;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('Nenhum produto encontrado');
  }
  return list[0].id;
}

async function adicionarProdutoEscola(token, escolaId, produtoId) {
  const body = {
    produtoId,
    quantidade: QUANTIDADE,
    unidade: UNIDADE,
    data_entrega: DATA_ENTREGA,
    observacao: OBS,
    status: STATUS
  };
  const { data } = await axios.post(
    `${BASE_URL}/api/guias/escola/${escolaId}/produtos`,
    body,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

(async () => {
  try {
    const token = await login();
    const escolaId = await pickEscola(token);
    const produtoId = await pickProduto(token);
    const result = await adicionarProdutoEscola(token, escolaId, produtoId);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    if (e.response) {
      console.error('HTTP', e.response.status, e.response.data);
    } else {
      console.error(e.message || e);
    }
    process.exit(1);
  }
})();