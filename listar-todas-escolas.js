const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const SISTEMA_PRINCIPAL_ID = '00000000-0000-0000-0000-000000000000';

async function listarEscolas() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('🏫 Listando todas as escolas do Sistema Principal...\n');
    
    const result = await client.query(`
      SELECT 
        id,
        nome,
        endereco,
        municipio,
        telefone,
        nome_gestor,
        administracao,
        ativo
      FROM escolas 
      WHERE tenant_id = $1
      ORDER BY nome
    `, [SISTEMA_PRINCIPAL_ID]);
    
    console.log(`📊 Total: ${result.rows.length} escolas\n`);
    
    result.rows.forEach((escola, index) => {
      console.log(`${(index + 1).toString().padStart(2, '0')}. ${escola.nome}`);
      console.log(`    Endereço: ${escola.endereco || 'Não informado'}`);
      console.log(`    Município: ${escola.municipio || 'Não informado'}`);
      console.log(`    Telefone: ${escola.telefone || 'Não informado'}`);
      console.log(`    Gestor: ${escola.nome_gestor || 'Não informado'}`);
      console.log(`    Administração: ${escola.administracao || 'Não informado'}`);
      console.log(`    Status: ${escola.ativo ? 'Ativa' : 'Inativa'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

listarEscolas();
