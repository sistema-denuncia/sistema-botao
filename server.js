require('dotenv').config();

const express = require('express');
const path = require('path');
const emergenciaRoute = require('./routes/emergencia');
const usuariosRoute = require('./routes/usuarios');
const bootstrapAdministrator = usuariosRoute.bootstrapAdministrator;

const app = express();
const PORT = Number(process.env.PORT || 5502);
const isLocalOrigin = (origin) => {
  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
};

app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && isLocalOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.vary('Origin');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  return next();
});

app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/saude', (req, res) => {
  res.json({
    sucesso: true,
    servidor: 'online',
    destino: process.env.POLICIA_SERVER_URL || 'http://localhost:3001',
  });
});

app.use('/api/emergencia', emergenciaRoute);
app.use('/api/usuarios', usuariosRoute);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ erro: `Rota "${req.method} ${req.path}" não encontrada.` });
});

bootstrapAdministrator()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Botão de emergência disponível em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Não foi possível preparar o administrador inicial:', error.message);
    process.exitCode = 1;
  });
