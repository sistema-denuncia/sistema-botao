const express = require('express');
const rateLimit = require('express-rate-limit');
const http = require('http');
const https = require('https');

const router = express.Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.EMERGENCIA_RATE_LIMIT || 10),
  standardHeaders: true,
  legacyHeaders: false,
});

function encaminharParaPolicia(body) {
  return new Promise((resolve, reject) => {
    const base = process.env.POLICIA_SERVER_URL || 'http://localhost:3001';
    const url = new URL(`${base}/api/emergencia`);
    const transport = url.protocol === 'https:' ? https : http;
    const payload = JSON.stringify(body);

    const request = transport.request(url, {
      method: 'POST',
      timeout: Number(process.env.POLICIA_TIMEOUT_MS || 5000),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.POLICIA_API_KEY || '',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (response) => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = { mensagem: data }; }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          return resolve({ statusCode: response.statusCode, body: json });
        }

        const erro = new Error(json.mensagem || 'Backend da polícia recusou o alerta.');
        erro.statusCode = response.statusCode;
        reject(erro);
      });
    });

    request.on('timeout', () => request.destroy(new Error('Tempo limite excedido ao contatar a polícia.')));
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

router.post('/', limiter, async (req, res) => {
  const { clienteId, tipo, prioridade, dispositivo, localizacao } = req.body;

  if (!clienteId) {
    return res.status(400).json({ sucesso: false, mensagem: 'Identificador do acionamento ausente.' });
  }

  if (!process.env.POLICIA_API_KEY) {
    return res.status(503).json({ sucesso: false, mensagem: 'Serviço de emergência não configurado.' });
  }

  try {
    const resposta = await encaminharParaPolicia({
      clienteId,
      tipo: tipo || 'EMERGENCIA',
      prioridade: prioridade || 'ALTA',
      dispositivo,
      localizacao,
    });

    res.status(resposta.statusCode).json(resposta.body);
  } catch (err) {
    console.error('Falha ao encaminhar emergência:', err.message);
    res.status(err.statusCode || 502).json({
      sucesso: false,
      mensagem: 'Não foi possível comunicar com o sistema da polícia.',
    });
  }
});

module.exports = router;
