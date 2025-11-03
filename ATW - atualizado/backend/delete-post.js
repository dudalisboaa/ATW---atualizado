const { executeQuery, connectDB } = require('./db');

async function findAndDeletePost() {
    try {
        await connectDB();
        
        console.log('🔍 Buscando TODOS os posts (incluindo inativos)...');
        
        // Buscar TODOS os posts (incluindo inativos)
        const allPosts = await executeQuery(`
            SELECT 
                p.id, p.conteudo, p.usuario_id, p.data_criacao, p.ativo,
                u.nome as usuario_nome, u.email as usuario_email
            FROM postagens p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            ORDER BY p.data_criacao DESC
        `);
        
        console.log('📝 Todos os posts encontrados:');
        console.table(allPosts);
        
        // Buscar especificamente posts com "bom dia" ou "bom"
        const bomDiaPosts = await executeQuery(`
            SELECT 
                p.id, p.conteudo, p.usuario_id, p.data_criacao, p.ativo,
                u.nome as usuario_nome, u.email as usuario_email
            FROM postagens p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            WHERE p.conteudo LIKE '%bom%' OR p.conteudo LIKE '%dia%'
            ORDER BY p.data_criacao DESC
        `);
        
        console.log('\n🌅 Posts com "bom" ou "dia":');
        console.table(bomDiaPosts);
        
        if (bomDiaPosts.length > 0) {
            // Pegar o post mais recente
            const postToDelete = bomDiaPosts[0];
            
            console.log(`\n🗑️ Deletando post ID: ${postToDelete.id}`);
            console.log(`📄 Conteúdo: "${postToDelete.conteudo}"`);
            console.log(`👤 Autor: ${postToDelete.usuario_nome || 'Usuário não encontrado'}`);
            
            // Deletar comentários primeiro
            await executeQuery('DELETE FROM comentarios WHERE postagem_id = ?', [postToDelete.id]);
            console.log('✅ Comentários deletados');
            
            // Deletar curtidas
            await executeQuery('DELETE FROM curtidas WHERE postagem_id = ?', [postToDelete.id]);
            console.log('✅ Curtidas deletadas');
            
            // Deletar o post
            await executeQuery('DELETE FROM postagens WHERE id = ?', [postToDelete.id]);
            console.log('✅ Post deletado com sucesso!');
            
        } else {
            console.log('❌ Nenhum post encontrado');
            
            // Verificar usuários também
            console.log('\n� Usuários disponíveis:');
            const users = await executeQuery('SELECT id, nome, email FROM usuarios ORDER BY data_criacao DESC');
            console.table(users);
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
    
    process.exit(0);
}

findAndDeletePost();
