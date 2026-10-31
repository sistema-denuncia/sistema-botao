document.addEventListener('DOMContentLoaded', () => {
  const openCalendarBtn = document.getElementById('openCalendar');
  const hiddenDatePicker = document.getElementById('hiddenDatePicker');
  const diaInput = document.getElementById('dia');
  const mesInput = document.getElementById('mes');
  const anoInput = document.getElementById('ano');
  const cpfInput = document.getElementById('cpf');
  const cadastroForm = document.getElementById('cadastroForm');
  const camposDataNascimento = [diaInput, mesInput, anoInput];
  const maxDataNascimento = window.validacaoDataNascimento.obterDataMaximaPermitida();

  hiddenDatePicker.max = maxDataNascimento;

  function montarDataNascimento() {
    if (!camposDataNascimento.every((campo) => /^\d+$/.test(campo.value))) return '';
    if (diaInput.value.length !== 2 || mesInput.value.length !== 2 || anoInput.value.length !== 4) {
      return '';
    }
    return `${anoInput.value}-${mesInput.value}-${diaInput.value}`;
  }

  function sincronizarDataDigitada() {
    const dataNascimento = montarDataNascimento();
    hiddenDatePicker.value = dataNascimento
      && !window.validacaoDataNascimento.validarDataNascimento(dataNascimento)
      ? dataNascimento
      : '';
  }

  camposDataNascimento.forEach((campo, indice) => {
    campo.addEventListener('input', () => {
      campo.value = campo.value.replace(/\D/g, '').slice(0, campo.maxLength);
      sincronizarDataDigitada();

      if (campo.value.length === campo.maxLength && camposDataNascimento[indice + 1]) {
        camposDataNascimento[indice + 1].focus();
      }
    });

    campo.addEventListener('keydown', (evento) => {
      if (evento.key === 'Backspace' && !campo.value && camposDataNascimento[indice - 1]) {
        camposDataNascimento[indice - 1].focus();
      }
    });
  });

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
        const erroData = window.validacaoDataNascimento.validarDataNascimento(e.target.value);
        if (erroData) {
          e.target.value = '';
          return;
        }

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
      const dataNascimento = montarDataNascimento();
      const email = document.getElementById('email').value;
      const confirmarEmail = document.getElementById('confirmarEmail').value;
      const senha = document.getElementById('senha').value;
      const confirmarSenha = document.getElementById('confirmarSenha').value;
      const mensagem = document.getElementById('mensagemCadastro');
      const botao = cadastroForm.querySelector('[type="submit"]');
      const erroNome = window.validarNomeCompleto(nome);

      if (erroNome) {
        mensagem.textContent = erroNome;
        return;
      }

      const erroSenha = window.validarSenhaCadastro(senha);
      if (erroSenha) {
        mensagem.textContent = erroSenha;
        return;
      }

      if (email !== confirmarEmail) {
        mensagem.textContent = 'Os e-mails digitados não coincidem.';
        return;
      }

      if (senha !== confirmarSenha) {
        mensagem.textContent = 'As senhas digitadas não coincidem.';
        return;
      }

      const erroDataNascimento = window.validacaoDataNascimento.validarDataNascimento(dataNascimento);
      if (erroDataNascimento) {
        mensagem.textContent = erroDataNascimento;
        diaInput.focus();
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
