document.addEventListener('DOMContentLoaded', () => {
  const openCalendarBtn = document.getElementById('openCalendar');
  const hiddenDatePicker = document.getElementById('hiddenDatePicker');
  const diaInput = document.getElementById('dia');
  const mesInput = document.getElementById('mes');
  const anoInput = document.getElementById('ano');
  const cpfInput = document.getElementById('cpf');
  const cadastroForm = document.getElementById('cadastroForm');

  if (openCalendarBtn && hiddenDatePicker) {
    openCalendarBtn.addEventListener('click', () => {
      if (hiddenDatePicker.showPicker) {
        hiddenDatePicker.showPicker();
      } else {
        hiddenDatePicker.click();
      }
    });

    hiddenDatePicker.addEventListener('change', (e) => {
      if (e.target.value) {
        const [ano, mes, dia] = e.target.value.split('-');
        diaInput.value = dia;
        mesInput.value = mes;
        anoInput.value = ano;
      }
    });
  }

  if (cpfInput) {
    cpfInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      e.target.value = value.substring(0, 14);
    });
  }

  if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nome = document.getElementById('nomeCompleto').value.trim();
      const cpf = cpfInput.value;
      const dataNascimento = hiddenDatePicker.value;
      const email = document.getElementById('email').value;
      const confirmarEmail = document.getElementById('confirmarEmail').value;
      const senha = document.getElementById('senha').value;
      const confirmarSenha = document.getElementById('confirmarSenha').value;
      const mensagem = document.getElementById('mensagemCadastro');
      const botao = cadastroForm.querySelector('[type="submit"]');

      if (email !== confirmarEmail) {
        mensagem.textContent = 'Os e-mails digitados não coincidem.';
        return;
      }

      if (senha !== confirmarSenha) {
        mensagem.textContent = 'As senhas digitadas não coincidem.';
        return;
      }

      if (!dataNascimento) {
        mensagem.textContent = 'Selecione sua data de nascimento.';
        return;
      }

      botao.disabled = true;
      mensagem.textContent = 'Salvando cadastro...';
      try {
        const resposta = await fetch('/api/auth/cadastro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, cpf, dataNascimento, email, senha }),
        });
        const resultado = await resposta.json();
        if (!resposta.ok || !resultado.sucesso) {
          throw new Error(resultado.mensagem || `Falha no cadastro (HTTP ${resposta.status}).`);
        }

        mensagem.textContent = 'Cadastro realizado. Redirecionando para o login...';
        window.setTimeout(() => { window.location.href = '/login'; }, 1200);
      } catch (erro) {
        mensagem.textContent = erro.message || 'Não foi possível concluir o cadastro.';
      } finally {
        botao.disabled = false;
      }
    });
  }
});
