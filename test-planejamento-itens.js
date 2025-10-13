const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar ao banco de dados
const dbPath = path.join(__dirname, 'backend', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Testando dados de planejamento e itens...\n');

// Verificar planejamentos existentes
db.all("SELECT * FROM planejamento_entregas ORDER BY id DESC LIMIT 5", (err, rows) => {
    if (err) {
        console.error('Erro ao buscar planejamentos:', err);
        return;
    }
    
    console.log('=== PLANEJAMENTOS RECENTES ===');
    rows.forEach(row => {
        console.log(`ID: ${row.id}, Guia: ${row.guia_id}, Equipe: ${row.equipe_id}, Status: ${row.status}`);
    });
    console.log('');
    
    if (rows.length > 0) {
        const planejamentoId = rows[0].id;
        console.log(`=== ITENS DO PLANEJAMENTO ${planejamentoId} ===`);
        
        // Verificar itens do planejamento mais recente
        db.all(`
            SELECT 
                pi.*,
                p.nome as produto_nome,
                p.unidade as produto_unidade
            FROM planejamento_itens pi
            JOIN produtos p ON pi.produto_id = p.id
            WHERE pi.planejamento_id = ?
            ORDER BY p.nome
        `, [planejamentoId], (err, itens) => {
            if (err) {
                console.error('Erro ao buscar itens:', err);
                return;
            }
            
            if (itens.length === 0) {
                console.log('Nenhum item encontrado para este planejamento!');
                
                // Verificar se existem itens na tabela
                db.all("SELECT COUNT(*) as total FROM planejamento_itens", (err, count) => {
                    if (err) {
                        console.error('Erro ao contar itens:', err);
                        return;
                    }
                    console.log(`Total de itens na tabela planejamento_itens: ${count[0].total}`);
                });
            } else {
                itens.forEach(item => {
                    console.log(`- ${item.produto_nome} (ID: ${item.produto_id})`);
                    console.log(`  Lote: ${item.lote || 'N/A'}`);
                    console.log(`  Todas escolas: ${item.incluir_todas_escolas ? 'Sim' : 'Não'}`);
                    console.log(`  Observações: ${item.observacoes || 'N/A'}`);
                    console.log('');
                });
            }
            
            console.log(`=== ESCOLAS DO PLANEJAMENTO ${planejamentoId} ===`);
            
            // Verificar escolas do planejamento
            db.all(`
                SELECT 
                    pe.*,
                    e.nome as escola_nome,
                    e.endereco as escola_endereco
                FROM planejamento_escolas pe
                JOIN escolas e ON pe.escola_id = e.id
                WHERE pe.planejamento_id = ?
                ORDER BY pe.ordem_entrega
            `, [planejamentoId], (err, escolas) => {
                if (err) {
                    console.error('Erro ao buscar escolas:', err);
                    return;
                }
                
                if (escolas.length === 0) {
                    console.log('Nenhuma escola encontrada para este planejamento!');
                } else {
                    escolas.forEach(escola => {
                        console.log(`${escola.ordem_entrega}. ${escola.escola_nome}`);
                        console.log(`   Endereço: ${escola.escola_endereco}`);
                        console.log(`   Observações: ${escola.observacoes || 'N/A'}`);
                        console.log('');
                    });
                }
                
                db.close();
            });
        });
    } else {
        console.log('Nenhum planejamento encontrado!');
        db.close();
    }
});