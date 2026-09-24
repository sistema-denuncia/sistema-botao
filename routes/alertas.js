// ============================================================
//  botao-emergencia-web/routes/alertas.js
// ============================================================

const express   = require('express');
const router    = express.Router();
const rateLimit = require('express-rate-limit');
const https     = require('https');
const http      = require('http');

// ── Flag: banco disponível ou não ────────────────────────────
// Troque para true quando o MySQL estiver pronto
const BANCO_ATIVO = false;

const db = BANCO_ATIVO ? require('../db') : null;

// ── Armazenamento em memória (usado enquanto não há banco) ────
let alertasMemoria = [];

// ── Rate limit ────────────────────────────────────────────────
const alertaLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max     : 5,
  message : { erro: 'Muitos alertas enviados. Aguarde antes de tentar novamente.' },
});

// ── Constantes ────────────────────────────────────────────────
const TIPOS_VALIDOS  = ['incêndio', 'médico', 'segurança', 'outro'];
const STATUS_VALIDOS = ['pendente', 'atendido', 'falso_alarme'];

const POLICIA_URL = process.env.POLICIA_SERVER_URL || 'http://localhost:3001';
const POLICIA_KEY = process.env.POLICIA_API_KEY;

function getIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress
  );
}

// ── Notificar backend da polícia ──────────────────────────────
async function notificarPolicia(alerta) {
  if (!POLICIA_KEY) {
    console.warn('⚠️  POLICIA_API_KEY não definida — notificação não enviada.');
    return;
  }

  try {
    const payload = JSON.stringify({
      apiKey     : POLICIA_KEY,
      tipo       : alerta.tipo,
      localizacao: { latitude: alerta.latitude, longitude: alerta.longitude },
      origem     : 'botao-emergencia-web',
      alertaId   : alerta.id,
    });

    const url     = new URL(`${POLICIA_URL}/api/emergencia`);
    const lib     = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname,
      port    : url.port || (url.protocol === 'https:' ? 443 : 80),
      path    : url.pathname,
      method  : 'POST',
      headers : {
        'Content-Type'  : 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    await new Promise((resolve, reject) => {
      const req = lib.request(options, (res) => {
        console.log(`📡 Polícia notificada — status HTTP: ${res.statusCode}`);
        resolve();
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

  } catch (err) {
    console.error('⚠️  Falha ao notificar backend da polícia:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────
//  POST /alertas
// ─────────────────────────────────────────────────────────────
router.post('/', alertaLimiter, async (req, res) => {
  const { tipo, descricao, latitude, longitude } = req.body;
  const ip = getIP(req);

  if (!tipo || tipo.trim() === '') {
    return res.status(400).json({ erro: 'O campo "tipo" é obrigatório.' });
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo inválido.', validos: TIPOS_VALIDOS });
  }

  try {
    let alertaSalvo;

    if (BANCO_ATIVO) {
      const [result] = await db.execute(
        `INSERT INTO alertas (tipo, descricao, latitude, longitude, ip_origem)
         VALUES (?, ?, ?, ?, ?)`,
        [tipo, descricao || null, latitude || null, longitude || null, ip]
      );
      alertaSalvo = { id: result.insertId, tipo, descricao, latitude, longitude };
    } else {
      const id = Date.now();
      alertaSalvo = { id, tipo, descricao: descricao || null, latitude: latitude || null, longitude: longitude || null, status: 'pendente', criado_em: new Date().toISOString() };
      alertasMemoria.unshift(alertaSalvo);
      if (alertasMemoria.length > 100) alertasMemoria.pop();
    }

    console.log(`🚨 [${new Date().toLocaleString('pt-BR')}] Alerta #${alertaSalvo.id} — ${tipo}`);

    notificarPolicia(alertaSalvo);

    return res.status(201).json({
      mensagem: 'Alerta registrado com sucesso!',
      id      : alertaSalvo.id,
      tipo,
      status  : 'pendente',
    });

  } catch (err) {
    console.error('Erro ao salvar alerta:', err.message);
    return res.status(500).json({ erro: 'Erro interno ao registrar alerta.' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /alertas
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status, tipo } = req.query;

  try {
    if (BANCO_ATIVO) {
      let sql      = 'SELECT * FROM alertas WHERE 1=1';
      const params = [];
      if (status) { sql += ' AND status = ?'; params.push(status); }
      if (tipo)   { sql += ' AND tipo = ?';   params.push(tipo);   }
      sql += ' ORDER BY criado_em DESC';
      const [alertas] = await db.execute(sql, params);
      return res.json({ total: alertas.length, alertas });
    } else {
      let alertas = alertasMemoria;
      if (status) alertas = alertas.filter(a => a.status === status);
      if (tipo)   alertas = alertas.filter(a => a.tipo   === tipo);
      return res.json({ total: alertas.length, alertas });
    }
  } catch (err) {
    console.error('Erro ao buscar alertas:', err.message);
    return res.status(500).json({ erro: 'Erro ao consultar alertas.' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /alertas/:id
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    if (BANCO_ATIVO) {
      const [rows] = await db.execute('SELECT * FROM alertas WHERE id = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ erro: 'Alerta não encontrado.' });
      return res.json(rows[0]);
    } else {
      const alerta = alertasMemoria.find(a => String(a.id) === req.params.id);
      if (!alerta) return res.status(404).json({ erro: 'Alerta não encontrado.' });
      return res.json(alerta);
    }
  } catch (err) {
    console.error('Erro ao buscar alerta:', err.message);
    return res.status(500).json({ erro: 'Erro ao buscar alerta.' });
  }
});

// ─────────────────────────────────────────────────────────────
//  PATCH /alertas/:id/status
// ─────────────────────────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;

  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido.', validos: STATUS_VALIDOS });
  }

  try {
    if (BANCO_ATIVO) {
      const [result] = await db.execute('UPDATE alertas SET status = ? WHERE id = ?', [status, req.params.id]);
      if (result.affectedRows === 0) return res.status(404).json({ erro: 'Alerta não encontrado.' });
    } else {
      const alerta = alertasMemoria.find(a => String(a.id) === req.params.id);
      if (!alerta) return res.status(404).json({ erro: 'Alerta não encontrado.' });
      alerta.status = status;
    }
    return res.json({ mensagem: `Alerta #${req.params.id} atualizado para "${status}".` });
  } catch (err) {
    console.error('Erro ao atualizar status:', err.message);
    return res.status(500).json({ erro: 'Erro ao atualizar alerta.' });
  }
});

module.exports = router;