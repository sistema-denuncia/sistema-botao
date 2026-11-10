require('dotenv').config();

const express = require('express');
const path = require('path');
const emergenciaRoute = require('./routes/emergencia');
const usuariosRoute = require('./routes/usuarios');
const bootstrapAdministrator = usuariosRoute.bootstrapAdministrator;
const authRoutes = require('./routes/auth');

const app = express();
const PORT_CONFIGURADA = Boolean(process.env.PORT);
const PORT = Number(process.env.PORT || 3000);
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
app.use('/api/auth', authRoutes.router);

app.get('/api/saude', (req, res) => {
  res.json({
    sucesso: true,
    servidor: 'online',
    destino: process.env.POLICIA_SERVER_URL || 'http://localhost:3001',
    integracaoConfigurada: Boolean(process.env.POLICIA_API_KEY && process.env.SESSION_SECRET),
  });
});

app.use('/api/emergencia', emergenciaRoute);
app.use('/api/usuarios', usuariosRoute);

app.get('/cadastro', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cadastro.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login-usuario.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ erro: `Rota "${req.method} ${req.path}" não encontrada.` });
});

function iniciarServidor(porta) {
  const servidor = app.listen(porta, () => {
    const endereco = servidor.address();
    console.log(`Botão de emergência disponível em http://localhost:${endereco.port}`);
  });

  servidor.on('error', (erro) => {
    if (erro.code === 'EADDRINUSE' && !PORT_CONFIGURADA && porta < 65535) {
      console.warn(`A porta ${porta} está ocupada. Tentando a porta ${porta + 1}.`);
      iniciarServidor(porta + 1);
      return;
    }

    console.error(`Não foi possível iniciar o servidor na porta ${porta}: ${erro.message}`);
    process.exitCode = 1;
  });
}

bootstrapAdministrator()
  .then(() => iniciarServidor(PORT))
  .catch((error) => {
    console.error('Não foi possível preparar o administrador inicial:', error.message);
    process.exitCode = 1;
  });
