document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const mensagem = document.getElementById('mensagemLogin');
      const botao = loginForm.querySelector('[type="submit"]');
      botao.disabled = true;
      mensagem.textContent = 'Validando acesso...';

      try {
        const resposta = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: document.getElementById('loginEmail').value,
            senha: document.getElementById('loginSenha').value,
          }),
        });
        const resultado = await resposta.json();
        if (!resposta.ok || !resultado.sucesso) {
          throw new Error(resultado.mensagem || `Falha no login (HTTP ${resposta.status}).`);
        }
        window.location.href = '/';
      } catch (erro) {
        mensagem.textContent = erro.message || 'Não foi possível entrar na conta.';
      } finally {
        botao.disabled = false;
      }
    });
  }
});
