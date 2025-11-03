const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { connectDB, executeQuery } = require('./db');
const http = require('http');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));


// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/uploads/posts');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
        }
    }
});

// Configuração para fotos de perfil
const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/uploads/profiles');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const profileUpload = multer({ 
    storage: profileStorage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB para fotos de perfil
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
        }
    }
});


// Log de requisições
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// ===== ROTAS DE AUTENTICAÇÃO =====

// Cadastro
app.post('/api/auth/cadastro', async (req, res) => { // Rota para cadastrar um novo usuário
    try {
        const { nome, email, senha, biografia, telefone, data_nascimento, localizacao } = req.body; // Pega os dados do corpo da requisição

        // Validação dos campos obrigatórios
        if (!nome || !email || !senha) {
            return res.json({ success: false, message: 'Nome, email e senha são obrigatórios' });
        }

        // Verifica se email já existe
        const existing = await executeQuery('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.json({ success: false, message: 'Este email já está cadastrado' });
        }

        // Insere novo usuário no banco de dados
        const result = await executeQuery(`
            INSERT INTO usuarios (nome, email, senha, biografia, telefone, data_nascimento, localizacao)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [nome, email, senha, biografia || null, telefone || null, data_nascimento || null, localizacao || null]);

        console.log('✅ Usuário cadastrado:', { id: result.insertId, nome, email, senha: senha });

        res.json({
            success: true,
            message: 'Usuário cadastrado com sucesso!',
            data: { id: result.insertId, nome, email }
        });

    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        res.json({ success: false, message: 'Erro interno do servidor: ' + error.message });
    }
});

// Atualizar usuário
app.put('/api/users/update', async (req, res) => { // Atualiza informações do usuário
    try {
        const { usuario_id, nome, email, senha, descricao } = req.body;

        // Validação de campos obrigatórios
        if (!usuario_id || !nome || !email) {
            return res.json({ success: false, message: 'ID do usuário, nome e email são obrigatórios' });
        }

        // Verifica se usuário existe
        const userExists = await executeQuery('SELECT id FROM usuarios WHERE id = ?', [usuario_id]);
        if (userExists.length === 0) {
            return res.json({ success: false, message: 'Usuário não encontrado' });
        }

        // Verifica se o email já está sendo usado por outro usuário
        const emailExists = await executeQuery('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, usuario_id]);
        if (emailExists.length > 0) {
            return res.json({ success: false, message: 'Este email já está sendo usado por outro usuário' });
        }

        // Prepara query de atualização
        let updateQuery = 'UPDATE usuarios SET nome = ?, email = ?, descricao = ?';
        let updateParams = [nome, email, descricao || null];

        // Adiciona nova senha, se fornecida
        if (senha) {
            updateQuery += ', senha = ?';
            updateParams.push(senha);
        }

        updateQuery += ' WHERE id = ?';
        updateParams.push(usuario_id);

        // Executa atualização
        await executeQuery(updateQuery, updateParams);

        console.log('✅ Usuário atualizado:', { id: usuario_id, nome, email });

        res.json({
            success: true,
            message: 'Perfil atualizado com sucesso!',
            data: { id: usuario_id, nome, email, descricao }
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar usuário:', error);
        res.json({ success: false, message: 'Erro interno do servidor: ' + error.message });
    }
});

// Upload de avatar
app.post('/api/users/upload-avatar', profileUpload.single('avatar'), async (req, res) => { // Upload de imagem de perfil do usuário
    try {
        const { usuario_id } = req.body;

        // Verifica se ID e arquivo foram enviados
        if (!usuario_id || !req.file) {
            return res.json({ success: false, message: 'Usuário e arquivo são obrigatórios' });
        }

        // Caminho da imagem
        const avatarPath = `/uploads/profiles/${req.file.filename}`;


        // Atualiza no banco de dados
        await executeQuery('UPDATE usuarios SET foto_perfil = ? WHERE id = ?', [avatarPath, usuario_id]);

        console.log('✅ Avatar atualizado para usuário:', usuario_id);

        res.json({
            success: true,
            message: 'Foto de perfil atualizada com sucesso!',
            data: { foto_perfil: avatarPath }
        });

    } catch (error) {
        console.error('❌ Erro ao fazer upload do avatar:', error);
        res.json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => { // Rota de login do usuário
    try {
        const { email, senha } = req.body;

        // Valida dados
        if (!email || !senha) {
            return res.json({ success: false, message: 'Email e senha são obrigatórios' });
        }

        // Buscar usuário com e-mail e senha.
        const users = await executeQuery('SELECT * FROM usuarios WHERE email = ? AND senha = ?', [email, senha]);

        // Se não achar usuário, falha
        if (users.length === 0) {
            console.log('❌ Login falhou:', email);
            return res.json({ success: false, message: 'Email ou senha incorretos' });
        }

        const user = users[0];
        console.log('✅ Login sucesso:', { id: user.id, nome: user.nome, email: user.email, senha: senha });
        delete user.senha; // Remover senha da resposta

        res.json({
            success: true,
            message: 'Login realizado com sucesso!',
            data: { usuario: user, redirectTo: '/public/html/feed.html' }
        });

    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.json({ success: false, message: 'Erro interno do servidor' });
    }
});

// ===== ROTAS DE POSTAGENS =====

// Criar postagem
app.post('/api/posts/postar', upload.single('photo'), async (req, res) => { // Cria uma nova postagem. Pode ter conteúdo de texto e/ou uma imagem enviada via Multer
    try {
        const { usuario_id, conteudo } = req.body; // Extrai dados do corpo da requisição

        if (!usuario_id || (!conteudo && !req.file)) { // Validação: precisa de texto ou imagem
            return res.json({ success: false, message: 'Usuário e conteúdo (ou imagem) são obrigatórios' });
        }

        // Caminho da imagem, caso foi enviada
        const imagePath = req.file ? `/uploads/posts/${req.file.filename}` : null;

        // Insere postagem no banco de dados
        const result = await executeQuery(
            'INSERT INTO postagens (usuario_id, conteudo, imagem) VALUES (?, ?, ?)',
            [usuario_id, conteudo || '', imagePath]
        );

        console.log('✅ Postagem criada:', result.insertId);

        res.json({
            success: true,
            message: 'Postagem criada com sucesso!',
            data: { id: result.insertId, usuario_id, conteudo, imagem: imagePath }
        });

    } catch (error) {
        console.error('❌ Erro ao criar postagem:', error);
        res.json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Obter feed
app.get('/api/posts/feed', async (req, res) => { // Retorna uma lista de postagens recentes + comentários

    try {
        const posts = await executeQuery(`
            SELECT 
                p.id, p.conteudo, p.imagem, p.curtidas, p.data_criacao as created_at,
                u.id as usuario_id, u.nome as usuario_nome, u.email as usuario_email, u.foto_perfil
            FROM postagens p
            JOIN usuarios u ON p.usuario_id = u.id
            WHERE p.ativo = true
            ORDER BY p.data_criacao DESC
            LIMIT 20
        `); // Busca as 20 postagens mais recentes ativas

        // Para cada post, busca até 3 comentários
        for (let post of posts) {
            const comments = await executeQuery(`
                SELECT 
                    c.id, c.conteudo, c.data_criacao as created_at,
                    u.id as usuario_id, u.nome as usuario_nome, u.foto_perfil
                FROM comentarios c
                JOIN usuarios u ON c.usuario_id = u.id
                WHERE c.postagem_id = ? AND c.ativo = true
                ORDER BY c.data_criacao ASC
                LIMIT 3
            `, [post.id]);

            post.comentarios_lista = comments; // Adiciona comentários dentro do objeto do post
        }

        res.json({ success: true, data: posts }); // Retorna o feed com comentários 

    } catch (error) {
        console.error('❌ Erro ao obter feed:', error);
        res.json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Curtir postagem
app.post('/api/posts/curtir', async (req, res) => { // Adiciona ou remove curtida em uma postagem
    try {
        const { postagem_id, usuario_id } = req.body;

        if (!postagem_id || !usuario_id) { // Validação
            return res.json({ success: false, message: 'Postagem e usuário são obrigatórios' });
        }

        // Verificar se usuário já curtiu
        const existing = await executeQuery('SELECT id FROM curtidas WHERE postagem_id = ? AND usuario_id = ?', [postagem_id, usuario_id]);

        let acao;
        if (existing.length > 0) {
            // Se já foi curtida, remove curtida
            await executeQuery('DELETE FROM curtidas WHERE postagem_id = ? AND usuario_id = ?', [postagem_id, usuario_id]);
            acao = 'descurtiu';
        } else {
            // Se não curtiu, adiciona curtida
            await executeQuery('INSERT INTO curtidas (postagem_id, usuario_id) VALUES (?, ?)', [postagem_id, usuario_id]);
            acao = 'curtiu';
        }

        // Conta total de curtidas
        const total = await executeQuery('SELECT COUNT(*) as count FROM curtidas WHERE postagem_id = ?', [postagem_id]);
        const totalCurtidas = total[0].count;

        // Atualiza contador na postagem
        await executeQuery('UPDATE postagens SET curtidas = ? WHERE id = ?', [totalCurtidas, postagem_id]);

        res.json({
            success: true,
            message: `Postagem ${acao} com sucesso!`,
            data: { postagem_id, usuario_id, acao, total_curtidas: totalCurtidas }
        });

    } catch (error) {
        console.error('❌ Erro ao curtir:', error);
        res.json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Comentar postagem
app.post('/api/posts/comentar', async (req, res) => { // Adiciona comentário em uma postagem
    try {
        const { postagem_id, usuario_id, conteudo } = req.body;

        if (!postagem_id || !usuario_id || !conteudo) { // Validação
            return res.json({ success: false, message: 'Todos os campos são obrigatórios' });
        }

        // Insere comentário no banco
        const result = await executeQuery('INSERT INTO comentarios (postagem_id, usuario_id, conteudo) VALUES (?, ?, ?)',
            [postagem_id, usuario_id, conteudo]);

        // Conta total de comentários
        const total = await executeQuery('SELECT COUNT(*) as count FROM comentarios WHERE postagem_id = ?', [postagem_id]);
        const totalComentarios = total[0].count;

        // Atualiza contador de comentários na tabela postagens
        await executeQuery('UPDATE postagens SET comentarios = ? WHERE id = ?', [totalComentarios, postagem_id]);

        console.log('✅ Comentário adicionado:', result.insertId);

        res.json({
            success: true,
            message: 'Comentário adicionado com sucesso!',
            data: { id: result.insertId, postagem_id, usuario_id, conteudo }
        });

    } catch (error) {
        console.error('❌ Erro ao comentar:', error);
        res.json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Deletar postagem (apenas para administradores)
app.delete('/api/posts/deletar/:id', async (req, res) => { // Remove postagem (se for criador ou admin)
    try {
        const postId = req.params.id; // ID da postagem vindo da URL
        const { usuario_id } = req.body; // ID do usuário enviado no body

        if (!postId || !usuario_id) { // Validação
            return res.json({ success: false, message: 'Post ID e usuário são obrigatórios' });
        }

        // Verificar se o usuário é o criador do post ou administrador
        const post = await executeQuery('SELECT * FROM postagens WHERE id = ?', [postId]);
        const user = await executeQuery('SELECT * FROM usuarios WHERE id = ?', [usuario_id]);

        if (post.length === 0) {
            return res.json({ success: false, message: 'Postagem não encontrada' });
        }

        if (user.length === 0) {
            return res.json({ success: false, message: 'Usuário não encontrado' });
        }

        // Verificar se é o criador do post ou admin (email específico)
        const isOwner = post[0].usuario_id === parseInt(usuario_id);
        const isAdmin = user[0].email === 'admin@networkup.com' || user[0].email === 'teste@teste.com';

        if (!isOwner && !isAdmin) {
            return res.json({ success: false, message: 'Você não tem permissão para deletar este post' });
        }

        // Deleta comentários primeiro
        await executeQuery('DELETE FROM comentarios WHERE postagem_id = ?', [postId]);

        // Deleta curtidas
        await executeQuery('DELETE FROM curtidas WHERE postagem_id = ?', [postId]);

        // Deleta postagem
        await executeQuery('DELETE FROM postagens WHERE id = ?', [postId]);

        console.log('✅ Postagem deletada:', postId, 'por usuário:', usuario_id);

        res.json({
            success: true,
            message: 'Postagem deletada com sucesso!',
            data: { postagem_id: postId }
        });

    } catch (error) {
        console.error('❌ Erro ao deletar postagem:', error);
        res.json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Obter informações de um usuário específico
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        if (!userId) {
            return res.json({ success: false, message: 'ID do usuário é obrigatório' });
        }

        // Buscar informações do usuário
        const users = await executeQuery('SELECT id, nome, email, foto_perfil, descricao, data_criacao FROM usuarios WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.json({ success: false, message: 'Usuário não encontrado' });
        }

        const user = users[0];

        // Buscar posts do usuário
        const posts = await executeQuery(`
            SELECT 
                p.id, p.conteudo, p.imagem, p.curtidas, p.comentarios, p.data_criacao as created_at
            FROM postagens p
            WHERE p.usuario_id = ? AND p.ativo = true
            ORDER BY p.data_criacao DESC
            LIMIT 10
        `, [userId]);

        // Contar total de posts
        const totalPosts = await executeQuery('SELECT COUNT(*) as count FROM postagens WHERE usuario_id = ? AND ativo = true', [userId]);

        res.json({
            success: true,
            data: {
                user: user,
                posts: posts,
                stats: {
                    total_posts: totalPosts[0].count
                }
            }
        });

    } catch (error) {
        console.error('❌ Erro ao obter usuário:', error);
        res.json({ success: false, message: 'Erro interno do servidor' });
    }
});

// ===== ROTAS FRONTEND =====

// Página inicial - redirecionar para home
app.get('/', (req, res) => {
    res.sendFile('html/home.html', { root: '../public' });
});

app.get('/home', (req, res) => {
    res.sendFile('html/home.html', { root: '../public' });
});

app.get('/inicial', (req, res) => {
    res.sendFile('html/home.html', { root: '../public' });
});

app.get('/login-teste', (req, res) => {
    res.sendFile('html/login-teste.html', { root: '../public' });
});

app.get('/login', (req, res) => {
    res.sendFile('html/login.html', { root: '../public' });
});

app.get('/cadastro', (req, res) => {
    res.sendFile('html/cadastro.html', { root: '../public' });
});

app.get('/feed', (req, res) => {
    res.sendFile('html/feed.html', { root: '../public' });
});

app.get('/chat', (req, res) => {
    res.sendFile('html/chat.html', { root: '../public' });
});

app.get('/profile', (req, res) => {
    res.sendFile('html/profile.html', { root: '../public' });
});

// Info da API
app.get('/api', (req, res) => {
    res.json({
        message: 'Around the World está funcionando!',
        version: '1.0.0',
        endpoints: {
            'POST /api/auth/cadastro': 'Cadastrar usuário',
            'POST /api/auth/login': 'Fazer login',
            'POST /api/posts/postar': 'Criar postagem',
            'GET /api/posts/feed': 'Obter feed',
            'POST /api/posts/curtir': 'Curtir postagem',
            'POST /api/posts/comentar': 'Comentar postagem',
            'GET /api/users/:id': 'Obter perfil de usuário'
        }
    });
});

// 404
app.use('*', (req, res) => { // Caso rota não exista
    if (req.originalUrl.startsWith('/api/')) { // Se for rota de API, retorna JSON de erro
        res.status(404).json({ success: false, message: 'Endpoint não encontrado' });
    } else {  // Caso contrário, redireciona para home
        res.sendFile('html/home.html', { root: '../public' });
    }
});

// // Iniciar servidor
async function startServer() {
    try {
        // conecta ao banco
        await connectDB();

        // inicia servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
        });
        // Se erro, encerra
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Executa a função para iniciar
startServer();
