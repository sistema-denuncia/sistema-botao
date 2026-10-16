require('dotenv').config();

const express = require('express');
const path = require('path');
const emergenciaRoute = require('./routes/emergencia');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = Number(process.env.PORT || 3000);

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

app.listen(PORT, () => {
  console.log(`Botão de emergência disponível em http://localhost:${PORT}`);
});
