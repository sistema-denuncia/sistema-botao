const loginMessage = document.getElementById('login-message');
const agentLoginMessage = document.getElementById('agent-login-message');
const registerMessage = document.getElementById('register-message');
const loginForms = document.querySelectorAll('#form-login, #form-agent-login');
const registerForm = document.getElementById('form-register');

loginForms.forEach((loginForm) => loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const message = form.id === 'form-agent-login' ? agentLoginMessage : loginMessage;
  message.textContent = '';
  button.disabled = true;

  try {
    const loginPath = form.id === 'form-agent-login'
      ? '/api/usuarios/login/agente'
      : '/api/usuarios/login/administrador';
    const response = await window.apiFetch(loginPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: form.elements.usuario.value,
        senha: form.elements.senha.value,
      }),
    });
    const result = await response.json();
    message.textContent = response.ok
      ? 'Login realizado com sucesso.'
      : result.erro || 'Não foi possível validar o acesso.';
    message.classList.toggle('success', response.ok);
    if (response.ok && form.id !== 'form-agent-login' && result.usuario.cargo === 'ADMINISTRADOR') {
      window.location.assign('tela-adm-opcoes.html');
    }
  } catch {
    message.textContent = 'Não foi possível conectar ao servidor.';
    message.classList.remove('success');
  } finally {
    button.disabled = false;
  }
}));

if (registerForm) registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  registerMessage.textContent = '';

  const senha = form.elements.senha.value;
  if (senha.length < 6 || senha.length > 128 || !/[\p{Lu}]/u.test(senha) || !/[^\p{L}\p{N}\s]/u.test(senha)) {
    registerMessage.textContent = 'A senha precisa ter de 6 a 128 caracteres, uma letra maiúscula e um caractere especial.';
    registerMessage.classList.remove('success');
    form.elements.senha.focus();
    return;
  }

  button.disabled = true;

  try {
    const response = await window.apiFetch('/api/usuarios/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.elements.nome.value,
        usuario: form.elements.usuario.value,
        cargo: form.elements.cargo.value,
        senha,
      }),
    });
    const result = await response.json();
    registerMessage.textContent = result.mensagem || result.erro || 'Não foi possível cadastrar o usuário.';
    registerMessage.classList.toggle('success', response.ok);
    if (response.ok) form.reset();
  } catch {
    registerMessage.textContent = 'Não foi possível conectar ao servidor.';
    registerMessage.classList.remove('success');
  } finally {
    button.disabled = false;
  }
});