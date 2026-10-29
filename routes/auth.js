const crypto = require('crypto');
const http = require('http');
const https = require('https');
const express = require('express');

const router = express.Router();
const COOKIE_NAME = 'one_touch_sessao';
const DURACAO_SESSAO_SEGUNDOS = 12 * 60 * 60;

function criarToken(usuario) {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo) throw new Error('SESSION_SECRET não está configurada.');

  const payload = Buffer.from(JSON.stringify({
    usuarioId: usuario.id,
    nome: usuario.nome,
    exp: Math.floor(Date.now() / 1000) + DURACAO_SESSAO_SEGUNDOS,
  })).toString('base64url');
  const assinatura = crypto.createHmac('sha256', segredo).update(payload).digest('base64url');
  return `${payload}.${assinatura}`;
}

function lerToken(token) {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || typeof token !== 'string') return null;

  const [payload, assinatura] = token.split('.');
  if (!payload || !assinatura) return null;

  const assinaturaEsperada = crypto.createHmac('sha256', segredo)
    .update(payload)
    .digest();
  let assinaturaRecebida;
  try {
    assinaturaRecebida = Buffer.from(assinatura, 'base64url');
  } catch {
    return null;
  }
  if (assinaturaRecebida.length !== assinaturaEsperada.length
    || !crypto.timingSafeEqual(assinaturaEsperada, assinaturaRecebida)) {
    return null;
  }

  try {
    const sessao = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(sessao.usuarioId) || sessao.usuarioId <= 0
      || typeof sessao.nome !== 'string' || sessao.exp <= Date.now() / 1000) {
      return null;
    }
    return sessao;
  } catch {
    return null;
  }
}

function obterCookie(req) {
  const cookies = req.headers.cookie || '';
  const item = cookies.split(';').map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));
  return item ? decodeURIComponent(item.slice(COOKIE_NAME.length + 1)) : null;
}

function configurarCookie(res, token, maxAge = DURACAO_SESSAO_SEGUNDOS) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
  );
}

function encaminharParaPolicia(caminho, body) {
  return new Promise((resolve, reject) => {
    if (!process.env.POLICIA_API_KEY) {
      const erro = new Error('POLICIA_API_KEY não está configurada no serviço do botão.');
      erro.statusCode = 503;
      reject(erro);
      return;
    }

    const base = process.env.POLICIA_SERVER_URL || 'http://localhost:3001';
    let url;
    try {
      url = new URL(caminho, `${base.replace(/\/+$/, '')}/`);
    } catch {
      const erro = new Error('POLICIA_SERVER_URL inválida.');
      erro.statusCode = 503;
      reject(erro);
      return;
    }

    const transport = url.protocol === 'https:' ? https : http;
    const payload = JSON.stringify(body);
    const request = transport.request(url, {
      method: 'POST',
      timeout: Number(process.env.POLICIA_TIMEOUT_MS || 5000),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.POLICIA_API_KEY,
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (response) => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = { mensagem: data || 'Resposta inválida do serviço policial.' };
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve({ statusCode: response.statusCode, body: json });
          return;
        }
        const erro = new Error(json.mensagem || 'O serviço policial recusou a solicitação.');
        erro.statusCode = response.statusCode;
        reject(erro);
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('Tempo limite excedido ao contatar o serviço policial.'));
    });
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

function autenticarSessao(req, res, next) {
  const sessao = lerToken(obterCookie(req));
  if (!sessao) {
    return res.status(401).json({ sucesso: false, mensagem: 'Entre na sua conta para continuar.' });
  }
  req.usuario = sessao;
  next();
}

router.post('/cadastro', async (req, res) => {
  try {
    const resposta = await encaminharParaPolicia('/api/usuarios', req.body || {});
    res.status(resposta.statusCode).json(resposta.body);
  } catch (err) {
    console.error('Falha ao encaminhar cadastro:', err.message);
    res.status(err.statusCode || 502).json({
      sucesso: false,
      mensagem: err.statusCode
        ? err.message
        : 'Não foi possível comunicar com o sistema policial.',
    });
  }
});

router.post('/login', async (req, res) => {
  if (!process.env.SESSION_SECRET) {
    return res.status(503).json({
      sucesso: false,
      mensagem: 'SESSION_SECRET não está configurada no serviço do botão.',
    });
  }

  try {
    const resposta = await encaminharParaPolicia('/api/usuarios/login', req.body || {});
    const { usuario } = resposta.body;
    const token = criarToken(usuario);
    configurarCookie(res, token);
    res.json({ sucesso: true, usuario });
  } catch (err) {
    console.error('Falha ao autenticar usuário:', err.message);
    res.status(err.statusCode || 502).json({
      sucesso: false,
      mensagem: err.statusCode
        ? err.message
        : 'Não foi possível comunicar com o sistema policial.',
    });
  }
});

router.get('/sessao', autenticarSessao, (req, res) => {
  res.json({
    sucesso: true,
    usuario: { id: req.usuario.usuarioId, nome: req.usuario.nome },
  });
});

router.post('/logout', (req, res) => {
  configurarCookie(res, '', 0);
  res.json({ sucesso: true });
});

module.exports = { router, autenticarSessao };
