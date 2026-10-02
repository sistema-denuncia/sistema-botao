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
    cadastroForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value;
      const confirmarEmail = document.getElementById('confirmarEmail').value;
      const senha = document.getElementById('senha').value;
      const confirmarSenha = document.getElementById('confirmarSenha').value;

      if (email !== confirmarEmail) {
        alert('Os e-mails digitados não coincidem!');
        return;
      }

      if (senha !== confirmarSenha) {
        alert('As senhas digitadas não coincidem!');
        return;
      }

      alert('Cadastro efetuado com sucesso!');
      window.location.href = '/';
    });
  }
});
