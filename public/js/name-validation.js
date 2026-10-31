(function (root, factory) {
  const validarNomeCompleto = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = validarNomeCompleto;
  } else {
    root.validarNomeCompleto = validarNomeCompleto;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const palavrasOfensivas = new Set([
    'arrombada', 'arrombado', 'babaca', 'bosta', 'buceta', 'bundao', 'bundona',
    'cagao', 'cagona', 'canalha', 'caralho', 'corno', 'cretino', 'cretina',
    'cuzao', 'cuzona', 'desgracada', 'desgracado', 'escrota', 'escroto',
    'fdp', 'foda', 'fodida', 'fodido', 'fudida', 'fudido', 'imbecil',
    'idiota', 'lazarenta', 'lazarento', 'merda', 'otaria', 'otario',
    'piranha', 'porra', 'puta', 'puto', 'retardada', 'retardado',
    'safada', 'safado', 'vagabunda', 'vagabundo', 'vaca', 'viado',
    'viadinho'
  ]);
  const particulas = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);

  return function validarNomeCompleto(nome) {
    if (typeof nome !== 'string') {
      return 'Informe seu nome e sobrenome.';
    }

    const nomeNormalizado = nome.trim().replace(/\s+/g, ' ');
    if (nomeNormalizado.length > 120
      || !/^[\p{L}]+(?:[ '-][\p{L}]+)*$/u.test(nomeNormalizado)) {
      return 'Informe nome e sobrenome usando apenas letras, espaços, hífens ou apóstrofos.';
    }

    const palavras = nomeNormalizado
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .split(/[ '-]+/);

    if (palavras.filter((palavra) => !particulas.has(palavra)).length < 2) {
      return 'Informe seu nome e sobrenome.';
    }

    if (palavras.some((palavra) => palavrasOfensivas.has(palavra))) {
      return 'Não é permitido usar palavrões ou ofensas no nome.';
    }

    return null;
  };
}));
