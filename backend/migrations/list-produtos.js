const {Client}=require('pg');
const c=new Client({connectionString:'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'});
c.connect().then(()=>c.query('SELECT id,nome FROM produtos ORDER BY id LIMIT 10'))
.then(r=>{console.log('Produtos disponíveis:');r.rows.forEach(p=>console.log(`  ${p.id} - ${p.nome}`));c.end();});
