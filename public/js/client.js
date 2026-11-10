const btn = document.getElementById('btnEmergencia');
const btnDesativar = document.getElementById('btnDesativar');
const status = document.getElementById('status');
const usuarioLogado = document.getElementById('usuarioLogado');
const btnSair = document.getElementById('btnSair');

let envioEmCurso = false;
let sessaoValida = false;
let emergenciaAtiva = false;
let intervaloRastreamento = null;
let contagemEnvios = 0;
const INTERVALO_MS = 10000; // Atualiza a cada 10 segundos

function mostrarStatus(mensagem, tipo = '') {
  if (status) {
    status.innerText = mensagem;
    if (status.parentElement) {
      status.parentElement.dataset.tipo = tipo;
    }
  }
}

async function obterLocalizacao() {
  const TIMEOUT_MS = 6000;

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
        console.warn('Não foi possível obter a localização:', erro.message);
        resolve({ latitude: null, longitude: null, acuracia: null });
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: TIMEOUT_MS }
    );
  });
}

async function enviarAtualizacaoLocalizacao() {
  if (!emergenciaAtiva || envioEmCurso) return;
  envioEmCurso = true;

  try {
    const localizacao = await obterLocalizacao();
    const dados = {
      tipo: 'EMERGENCIA',
      prioridade: 'ALTA',
      dispositivo: navigator.userAgent,
      localizacao,
      rastreamento: true,
    };

    const resposta = await window.apiFetch('/api/emergencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });

    if (resposta.ok) {
      contagemEnvios++;
      const agora = new Date().toLocaleTimeString('pt-BR');
      const acuraciaTxt = Number.isFinite(localizacao?.acuracia)
        ? ` (±${Math.round(localizacao.acuracia)}m)`
        : '';
      mostrarStatus(`Rastreamento ativo • Posição enviada às ${agora}${acuraciaTxt} • ${contagemEnvios} envio(s)`, 'sucesso');
    }
  } catch (erro) {
    console.warn('Erro ao atualizar localização em segundo plano:', erro);
    mostrarStatus('Tentando restabelecer conexão GPS...', 'alerta');
  } finally {
    envioEmCurso = false;
  }
}

function iniciarLoopRastreamento() {
  if (intervaloRastreamento) {
    clearInterval(intervaloRastreamento);
  }
  intervaloRastreamento = setInterval(enviarAtualizacaoLocalizacao, INTERVALO_MS);
}

async function iniciarEmergencia() {
  if (!sessaoValida) {
    window.location.href = '/login';
    return;
  }

  if (emergenciaAtiva) {
    // Se o usuário clicar novamente enquanto já ativo, força envio imediato
    mostrarStatus('Atualizando localização agora...', 'alerta');
    await enviarAtualizacaoLocalizacao();
    return;
  }

  envioEmCurso = true;
  emergenciaAtiva = true;
  sessionStorage.setItem('emergenciaAtiva', 'true');

  btn.classList.add('enviando', 'ativo');
  btn.querySelector('.texto-botao').textContent = 'ENVIANDO ALERTA';
  if (btnDesativar) btnDesativar.classList.remove('hidden');

  mostrarStatus('Obtendo localização inicial...', 'alerta');

  try {
    const localizacao = await obterLocalizacao();
    localizacaoObtida = Number.isFinite(localizacao.latitude)
      && Number.isFinite(localizacao.longitude)
      && Number.isFinite(localizacao.acuraciaMetros);

    const dados = {
      tipo: 'EMERGENCIA',
      prioridade: 'ALTA',
      dispositivo: navigator.userAgent,
      localizacao: await obterLocalizacao(),
      rastreamento: false,
    };
      localizacao,
    };
    const acuracia = dados.localizacao.acuraciaMetros;
    if (Number.isFinite(acuracia) && acuracia > 5000) {
      mostrarStatus('Localização imprecisa. Enviando mesmo assim...', 'alerta');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else if (!localizacaoObtida) {
      mostrarStatus('Localização não pôde ser obtida. Enviando alerta sem localização...', 'alerta');
    }

    if (localizacaoObtida) mostrarStatus('Enviando alerta para a central...', 'alerta');
    const resposta = await window.apiFetch('/api/emergencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });

    const resultado = await resposta.json().catch(() => {
      throw new Error(`Resposta inesperada do servidor (HTTP ${resposta.status}).`);
    });

    if (!resposta.ok || !resultado.sucesso) {
      throw new Error(resultado.mensagem || `Erro do servidor: ${resposta.status}`);
    }

    contagemEnvios = 1;
    btn.classList.remove('enviando');
    btn.querySelector('.texto-botao').textContent = 'EMERGÊNCIA ATIVA';

    const protocoloTxt = resultado.protocolo ? ` • Protocolo: ${resultado.protocolo}` : '';
    mostrarStatus(`🚨 Emergência registrada!${protocoloTxt} Transmitindo localização a cada 10s...`, 'sucesso');

    iniciarLoopRastreamento();
  } catch (erro) {
    const mensagem = erro instanceof TypeError
      ? 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
      : erro.message;
    mostrarStatus(mensagem || 'Não foi possível enviar o alerta. Tente novamente.', 'erro');
    console.error('Erro ao enviar alerta inicial:', erro);

    // Reverte o estado em caso de falha no primeiro envio
    emergenciaAtiva = false;
    sessionStorage.removeItem('emergenciaAtiva');
    btn.classList.remove('ativo', 'enviando');
    btn.disabled = false;
    btn.querySelector('.texto-botao').textContent = 'TOQUE PARA ALERTAR';
    if (btnDesativar) btnDesativar.classList.add('hidden');
  } finally {
    envioEmCurso = false;
  }
}

function encerrarEmergencia() {
  if (!confirm('Deseja realmente encerrar a transmissão e desativar o alerta de emergência?')) {
    return;
  }

  emergenciaAtiva = false;
  sessionStorage.removeItem('emergenciaAtiva');

  if (intervaloRastreamento) {
    clearInterval(intervaloRastreamento);
    intervaloRastreamento = null;
  }

  contagemEnvios = 0;
  btn.classList.remove('ativo', 'enviando');
  btn.disabled = false;
  btn.querySelector('.texto-botao').textContent = 'TOQUE PARA ALERTAR';
  if (btnDesativar) btnDesativar.classList.add('hidden');

  mostrarStatus('Transmissão encerrada. Pronto para receber um novo acionamento.');
}

btn.addEventListener('click', () => {
  if (!envioEmCurso) {
    iniciarEmergencia();
  }
});

if (btnDesativar) {
  btnDesativar.addEventListener('click', encerrarEmergencia);
}

btnSair.addEventListener('click', async () => {
  if (emergenciaAtiva) {
    if (!confirm('Você possui uma emergência em andamento. Deseja sair e encerrar a transmissão?')) {
      return;
    }
    encerrarEmergencia();
  }
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

    // Se já havia uma emergência ativa gravada no navegador, retoma o rastreamento
    if (sessionStorage.getItem('emergenciaAtiva') === 'true') {
      emergenciaAtiva = true;
      btn.classList.add('ativo');
      btn.querySelector('.texto-botao').textContent = 'EMERGÊNCIA ATIVA';
      if (btnDesativar) btnDesativar.classList.remove('hidden');
      mostrarStatus('Retomando rastreamento de emergência...', 'sucesso');
      iniciarLoopRastreamento();
      enviarAtualizacaoLocalizacao();
    } else {
      mostrarStatus('Pronto para receber um acionamento');
    }
  } catch (erro) {
    mostrarStatus('Não foi possível verificar seu acesso. Tente novamente.', 'erro');
    console.error('Erro ao verificar sessão:', erro);
  }
}

async function obterLocalizacao() {
  const TIMEOUT_MS = 5000;

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Não foi possível obter a localização: geolocalização não disponível neste navegador.');
      resolve({ latitude: null, longitude: null, acuraciaMetros: null });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          acuraciaMetros: coords.accuracy,
        });
      },
      (erro) => {
        console.warn('Não foi possível obter a localização:', erro.message);
        resolve({ latitude: null, longitude: null, acuraciaMetros: null });
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: TIMEOUT_MS }
    );
  });
}

console.log('Botão de emergência carregado.');
verificarSessao();
