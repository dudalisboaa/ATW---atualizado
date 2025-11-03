// Configurações da API
const API_BASE_URL = 'http://localhost:3002/api';

document.addEventListener('DOMContentLoaded', function() {
    // FORÇAR LIMPEZA COMPLETA PARA DEBUG
    console.log('🧹 Limpando localStorage para debug...');
    localStorage.clear();
    sessionStorage.clear();
    
    // Aguardar um pouco antes de verificar usuário
    setTimeout(() => {
        // Verificar se usuário já está logado
        const currentUser = getCurrentUser();
        if (currentUser) {
            console.log('✅ Usuário já logado, redirecionando...');
            window.location.href = '/public/html/feed.html';
            return;
        }
        
        console.log('📝 Usuário não logado, carregando página de cadastro');
    }, 100);
    
    // Configurar formulário de cadastro
    const cadastroForm = document.getElementById('registerForm'); // Seleciona formulário de cadastro 
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', handleRegister); // Adiciona evento de envio que chama função handleRegister
        
        // Configurar validação em tempo real
        setupFormValidation();
    }
    
    // Configurar toggle de senha
    const toggleBtns = document.querySelectorAll('.toggle-password'); // Seleciona todos os botões de mostrar/ocultar senha
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            togglePassword(input.id);
        });
    });
});

// Função de cadastro
async function handleRegister(event) {
    event.preventDefault(); // Impede o recarregamento da página no submit

    const form = event.target; // Formulário enviado
    const formData = new FormData(form); // Coleta dados do formulário
    const data = Object.fromEntries(formData.entries()); // Converte dados em objeto JS
    const submitButton = form.querySelector('button[type="submit"]'); // Pega botão de envio
    
    
    // Verifica se campos obrigatórios estão preenchidos
    if (!data.nome || !data.email || !data.senha) {
        showToast('Por favor, preencha todos os campos obrigatórios', 'error');
        return;
    }
    
    if (!validateEmail(data.email)) { // Verifica se e-mail é válido
        showToast('E-mail inválido', 'error');
        return;
    }
    
    if (!validatePassword(data.senha)) { // Verifica se senha tem mínimo de 6 caracteres
        showToast('A senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }
    
    if (data.confirmSenha && data.senha !== data.confirmSenha) { // Confirmação de senha
        showToast('As senhas não coincidem', 'error');
        return;
    }
    
    setButtonLoading(submitButton, true); // Altera botão para estado "carregando"

    
    try {
        console.log('📝 Tentando cadastro:', data.email);
        
        const response = await fetch(`${API_BASE_URL}/auth/cadastro`, { // Faz requisição POST para cadastrar usuário
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data) // Envia dados convertidos em JSON
        });
        
        const result = await response.json(); // Converte resposta em objeto
        
        if (result.success) { // Se cadastro foi bem-sucedido
            console.log('✅ Cadastro realizado com sucesso!');
            console.log('👤 Dados do usuário cadastrado:', result.data);
            showToast('Cadastro realizado com sucesso!', 'success');
            
            // Fazer login automático após cadastro
            console.log('🔐 Fazendo login automático...');
            
            // Faz login automático
            try {
                const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: data.email,
                        senha: data.senha
                    }) // Usa dados cadastrados
                });
                
                const loginResult = await loginResponse.json();
                
                if (loginResult.success) {
                    console.log('✅ Login automático realizado!');
                    console.log('👤 Usuário logado:', loginResult.data.usuario);
                    
                    // Salvar dados do usuário no localStorage
                    localStorage.setItem('currentUser', JSON.stringify(loginResult.data.usuario));
                    
                    showToast('Bem-vindo! Redirecionando para o feed...', 'success');
                    
                    // Redirecionar para o feed imediatamente
                    setTimeout(() => {
                        console.log('🔄 Redirecionando para o feed...');
                        window.location.href = '/public/html/feed.html';
                    }, 1000);
                } else { // Caso login automático falhe
                    console.log('⚠️ Login automático falhou:', loginResult.message);
                    showToast('Cadastro realizado! Redirecionando para o login...', 'success');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1500);
                }
            } catch (loginError) {
                console.error('❌ Erro no login automático:', loginError);
                showToast('Cadastro realizado! Redirecionando para o login...', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);
            }
        } else {
            console.log('❌ Cadastro falhou:', result.message);
            showToast(result.message || 'Erro no cadastro', 'error');
        }
    } catch (error) { // Caso haja erro de conexão
        console.error('❌ Erro no cadastro:', error);
        showToast('Erro de conexão. Verifique se o servidor está rodando.', 'error');
    } finally { // Volta botão ao estado normal
        setButtonLoading(submitButton, false);
    }
}

// Função para obter usuário atual
function getCurrentUser() { // Recupera usuário salvo no localStorage
    try {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error('Erro ao recuperar usuário:', error);
        localStorage.removeItem('currentUser');
        return null;
    }
}

// Validação de email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validação de senha
function validatePassword(password) {
    return password.length >= 6;
}

// Toggle senha
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password');
    
    if (input && button) {
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈';
            button.setAttribute('title', 'Ocultar senha');
        } else {
            input.type = 'password';
            button.textContent = '👁️';
            button.setAttribute('title', 'Mostrar senha');
        }
    }
}

// Função global para ser chamada pelo HTML
window.togglePassword = togglePassword;

// Loading button
function setButtonLoading(button, loading = true) { // Altera botão para estado de carregando
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
        button.textContent = 'Cadastrando...';
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        button.textContent = 'Cadastrar';
    }
}

// Configura validação dos campos de formulario de cadastro
function setupFormValidation() {
    const inputs = document.querySelectorAll('input[required]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
    });
}

// Validar campo individual
function validateField(input) {
    const formGroup = input.closest('.form-group');
    let isValid = true;
    let message = '';
    
    // Validações específicas
    if (input.type === 'email' && input.value) {
        if (!validateEmail(input.value)) {
            isValid = false;
            message = 'E-mail inválido';
        }
    } else if (input.type === 'password' && input.value) {
        if (!validatePassword(input.value)) {
            isValid = false;
            message = 'Senha deve ter pelo menos 6 caracteres';
        }
    } else if (input.name === 'confirmSenha' && input.value) {
        const senhaInput = document.getElementById('senha');
        if (senhaInput && input.value !== senhaInput.value) {
            isValid = false;
            message = 'As senhas não coincidem';
        }
    }
    
    // Verificar se campo obrigatório está vazio
    if (input.required && !input.value.trim()) {
        isValid = false;
        message = 'Este campo é obrigatório';
    }
    
    // Aplicar estilos visuais
    if (isValid) {
        formGroup.classList.remove('invalid');
        formGroup.classList.add('valid');
    } else {
        formGroup.classList.remove('valid');
        formGroup.classList.add('invalid');
        showFieldError(input, message);
    }
    
    return isValid;
}

// Mostrar erro no campo
function showFieldError(input, message) {
    const formGroup = input.closest('.form-group');
    let errorElement = formGroup.querySelector('.error-message');
    
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.style.cssText = `
            color: #dc2626;
            font-size: 0.8em;
            margin-top: 4px;
        `;
        formGroup.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
}

// Limpar erro do campo
function clearFieldError(input) {
    const formGroup = input.closest('.form-group');
    formGroup.classList.remove('invalid');
    
    const errorElement = formGroup.querySelector('.error-message');
    if (errorElement) {
        errorElement.textContent = '';
    }
}

// Função para mostrar toast (mensagem temporária)
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Criar container se não existir
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(container);
    }
    
    // Estilos do toast
    toast.style.cssText = `
        background: ${type === 'success' ? '#A7C0BE' : type === 'error' ? '#dc2626' : '#4D6772'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    container.appendChild(toast);
    
    // Mostrar toast
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover toast após 4 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 4000); // some após 4 segundos
}