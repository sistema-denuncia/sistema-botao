(function (root, factory) {
  const validacaoDataNascimento = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = validacaoDataNascimento;
  } else {
    root.validacaoDataNascimento = validacaoDataNascimento;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const IDADE_MINIMA = 18;

  function obterDataMaximaPermitida(hoje = new Date()) {
    const ano = hoje.getUTCFullYear() - IDADE_MINIMA;
    const mes = hoje.getUTCMonth() + 1;
    const ultimoDiaDoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const dia = Math.min(hoje.getUTCDate(), ultimoDiaDoMes);

    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  function validarDataNascimento(dataNascimento, hoje = new Date()) {
    if (typeof dataNascimento !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
      return 'Informe uma data de nascimento válida no formato DD/MM/AAAA.';
    }

    const [ano, mes, dia] = dataNascimento.split('-').map(Number);
    const data = new Date(0);
    data.setUTCHours(0, 0, 0, 0);
    data.setUTCFullYear(ano, mes - 1, dia);

    if (ano < 1
      || data.getUTCFullYear() !== ano
      || data.getUTCMonth() !== mes - 1
      || data.getUTCDate() !== dia) {
      return 'Informe uma data de nascimento válida no formato DD/MM/AAAA.';
    }

    let idade = hoje.getUTCFullYear() - ano;
    const aniversarioAindaNaoOcorreu = hoje.getUTCMonth() + 1 < mes
      || (hoje.getUTCMonth() + 1 === mes && hoje.getUTCDate() < dia);
    if (aniversarioAindaNaoOcorreu) idade -= 1;

    if (idade < IDADE_MINIMA) {
      return 'Você precisa ter pelo menos 18 anos para se cadastrar.';
    }

    return null;
  }

  return { obterDataMaximaPermitida, validarDataNascimento };
}));
