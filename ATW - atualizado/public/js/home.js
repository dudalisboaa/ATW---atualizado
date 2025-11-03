// Script da página home do NetworkUp
document.addEventListener('DOMContentLoaded', function() {
    console.log('ATW - Página Home carregada');
    
    // Verificar se há usuário logado para mostrar informações adicionais se necessário
    const user = JSON.parse(localStorage.getItem('currentUser'));
    
    if (user) {
        console.log('Usuário logado encontrado:', user.nome);
        // Usuário pode navegar livremente pela home mesmo estando logado
    }
    
    // Adicionar eventos aos botões se necessário
    const loginBtn = document.querySelector('a[href="/login"]');
    const cadastroBtn = document.querySelector('a[href="/cadastro"]');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            console.log('Navegando para login');
        });
    }
    
    if (cadastroBtn) {
        cadastroBtn.addEventListener('click', function(e) {
            console.log('Navegando para cadastro');
        });
    }
});
