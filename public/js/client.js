const btn = document.getElementById('btnEmergencia');
const status = document.getElementById('status');
const usuarioLogado = document.getElementById('usuarioLogado');
const btnSair = document.getElementById('btnSair');

let envioEmCurso = false;
let sessaoValida = false;

function mostrarStatus(mensagem, tipo = '') {
  status.innerText = mensagem;
  status.parentElement.dataset.tipo = tipo;
}

async function enviarEmergencia() {
  if (!sessaoValida) {
    window.location.href = '/login';
    return;
  }

  envioEmCurso = true;
  btn.disabled = true;
  btn.classList.add('enviando');
  btn.querySelector('.texto-botao').textContent = 'ENVIANDO ALERTA';
  mostrarStatus('Obtendo localização...', 'alerta');

  try {
    const dados = {
      tipo: 'EMERGENCIA',
      prioridade: 'ALTA',
      dispositivo: navigator.userAgent,
      localizacao: await obterLocalizacao(),
    };
    const acuracia = dados.localizacao?.acuracia;
    if (Number.isFinite(acuracia) && acuracia > 5000) {
      mostrarStatus('Localização imprecisa. Enviando mesmo assim...', 'alerta');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    mostrarStatus('Enviando alerta para a central...', 'alerta');
    const resposta = await window.apiFetch('/api/emergencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    const resultado = await resposta.json().catch(() => {
      throw new Error(`Resposta inesperada do servidor (HTTP ${resposta.status}).`);
    });
    if (!resposta.ok || !resultado.sucesso) throw new Error(resultado.mensagem || `Erro do servidor: ${resposta.status}`);

    let mensagemSucesso;
    if (resultado.duplicado) {
      mensagemSucesso = `Chamado em aberto. ${resultado.quantidadeAcionamentos} acionamentos registrados.`;
    } else {
      mensagemSucesso = `Emergência registrada! Protocolo: ${resultado.protocolo}`;
    }
    mostrarStatus(mensagemSucesso, 'sucesso');
  } catch (erro) {
    const mensagem = erro instanceof TypeError
      ? 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
      : erro.message;
    mostrarStatus(mensagem || 'Não foi possível enviar o alerta. Tente novamente.', 'erro');
    console.error('Erro ao enviar alerta:', erro);
  } finally {
    envioEmCurso = false;
    btn.disabled = false;
    btn.classList.remove('enviando');
    btn.querySelector('.texto-botao').textContent = 'TOQUE PARA ALERTAR';
  }
}

btn.addEventListener('click', () => {
  if (!envioEmCurso) enviarEmergencia();
});

btnSair.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
});

async function verificarSessao() {
  btn.disabled = true;
  mostrarStatus('Verificando sua conta...', 'alerta');

  try {
    const resposta = await fetch('/api/auth/sessao');
    if (!resposta.ok) {
      window.location.href = '/login';
      return;
    }
    const resultado = await resposta.json();
    sessaoValida = true;
    usuarioLogado.textContent = `Olá, ${resultado.usuario.nome}`;
    btn.disabled = false;
    mostrarStatus('Pronto para receber um acionamento');
  } catch (erro) {
    mostrarStatus('Não foi possível verificar seu acesso. Tente novamente.', 'erro');
    console.error('Erro ao verificar sessão:', erro);
  }
}

async function obterLocalizacao() {
  // Uma única leitura de GPS (getCurrentPosition): pega a posição mais rápida
  // disponível, sem esperar múltiplas amostras para calibrar/refinar a
  // precisão. Isso agiliza o envio do alerta de emergência.
  const TIMEOUT_MS = 5000;

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null, acuracia: null });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          acuracia: Number.isFinite(coords.accuracy) ? coords.accuracy : null,
        });
      },
      (erro) => {
        // Não bloqueia o envio do alerta: a emergência é registrada mesmo sem
        // localização, mas registramos o motivo para eventual diagnóstico.
        console.warn('Não foi possível obter a localização:', erro.message);
        resolve({ latitude: null, longitude: null, acuracia: null });
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: TIMEOUT_MS }
    );
  });
}

console.log('Botão de emergência carregado.');
verificarSessao();
