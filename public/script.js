// Alternar entre as telas
const loginCard = document.getElementById('login-card');
const registerCard = document.getElementById('register-card');

document.getElementById('go-to-register').addEventListener('click', (e) => {
  e.preventDefault();
  loginCard.classList.add('hidden');
  registerCard.classList.remove('hidden');
});

document.getElementById('go-to-login').addEventListener('click', (e) => {
  e.preventDefault();
  registerCard.classList.add('hidden');
  loginCard.classList.remove('hidden');
});

// Captura de dados do formulário de Login
document.getElementById('form-login').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const senha = document.getElementById('login-senha').value;

  console.log('Dados de Login:', { email, senha });
  alert('Login efetuado! (Integre com o back-end)');
});

// Captura de dados do formulário de Cadastro
document.getElementById('form-register').addEventListener('submit', (e) => {
  e.preventDefault();
  const dadosCadastro = {
    nome: document.getElementById('reg-nome').value,
    cpf: document.getElementById('reg-cpf').value,
    email: document.getElementById('reg-email').value,
    telefone: document.getElementById('reg-telefone').value,
    senha: document.getElementById('reg-senha').value,
    preferenciaAnonima: document.getElementById('reg-anonimo').checked
  };

  console.log('Dados do Cadastro:', dadosCadastro);
  alert('Cadastro realizado com sucesso!');
});