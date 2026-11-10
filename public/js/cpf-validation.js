(function (root, factory) {
  const validarCpfCadastro = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = validarCpfCadastro;
  } else {
    root.validarCpfCadastro = validarCpfCadastro;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function calcularDigito(cpf, tamanho, pesoInicial) {
    const soma = cpf
      .slice(0, tamanho)
      .split('')
      .reduce((total, digito, indice) => total + Number(digito) * (pesoInicial - indice), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  }

  return function validarCpfCadastro(cpf) {
    if (typeof cpf !== 'string' || !/^[0-9]{11}$/.test(cpf)) {
      return 'O CPF deve conter exatamente 11 números.';
    }

    if (/^([0-9])\1{10}$/.test(cpf)) {
      return 'Informe um CPF válido.';
    }

    const primeiroDigito = calcularDigito(cpf, 9, 10);
    const segundoDigito = calcularDigito(cpf, 10, 11);
    if (Number(cpf[9]) !== primeiroDigito || Number(cpf[10]) !== segundoDigito) {
      return 'Informe um CPF válido.';
    }

    return null;
  };
}));
