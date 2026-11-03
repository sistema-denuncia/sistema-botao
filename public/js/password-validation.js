(function (root, factory) {
  const validarSenhaCadastro = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = validarSenhaCadastro;
  } else {
    root.validarSenhaCadastro = validarSenhaCadastro;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return function validarSenhaCadastro(senha) {
    if (typeof senha !== 'string'
      || senha.length < 8
      || !/[\p{Lu}]/u.test(senha)
      || !/[\p{Ll}]/u.test(senha)) {
      return 'A senha deve ter pelo menos 8 caracteres, incluindo uma letra maiúscula e uma minúscula.';
    }

    return null;
  };
}));
