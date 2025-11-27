const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string do Neon (corrigida)
const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function applyToNeon() {
  try {
    console.log('🚀 Aplicando correções de constraints no NEON (Produção)...\n');
    
    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'APPLY_TO_NEON.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Dividir em comandos individuais (separados por ponto e vírgula)
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📋 Total de comandos a executar: ${commands.length}\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      
      // Pular comentários e comandos SELECT de verificação
      if (cmd.startsWith('--') || cmd.toUpperCase().startsWith('SELECT')) {
        continue;
      }
      
      try {
        await neonPool.query(cmd);
        successCount++;
        
        // Mostrar progresso a cada 5 comandos
        if ((i + 1) % 5 === 0) {
          console.log(`   ✅ Executados ${i + 1}/${commands.length} comandos...`);
        }
      } catch (error) {
        if (error.message.includes('já existe') || error.message.includes('does not exist')) {
          skipCount++;
        } else {
          console.log(`   ⚠️ Erro no comando ${i + 1}: ${error.message.substring(0, 100)}`);
          errorCount++;
        }
      }
    }
    
    console.log('\n📊 RESUMO:');
    console.log(`   ✅ Executados com sucesso: ${successCount}`);
    console.log(`   ⚠️ Pulados (já existem): ${skipCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log('');
    
    // Verificar resultado final
    console.log('🔍 Verificando constraints criadas...\n');
    
    const tables = ['escolas', 'modalidades', 'produtos', 'fornecedores', 'usuarios', 'contratos', 'pedidos', 'faturamentos'];
    
    for (const table of tables) {
      const result = await neonPool.query(`
        SELECT 
          conname as constraint_name,
          pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = $1::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) LIKE '%tenant_id%'
        ORDER BY conname;
      `, [table]);
      
      if (result.rows.length > 0) {
        console.log(`✅ ${table}:`);
        result.rows.forEach(row => {
          console.log(`   - ${row.constraint_name}`);
        });
      } else {
        console.log(`⚠️ ${table}: Nenhuma constraint com tenant_id encontrada`);
      }
    }
    
    console.log('\n✅ PROCESSO CONCLUÍDO!\n');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    await neonPool.end();
  }
}

applyToNeon();
