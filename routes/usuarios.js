const express = require('express');
const { randomBytes, scrypt, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const fs = require('fs/promises');
const path = require('path');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const scryptAsync = promisify(scrypt);
const usersFile = path.join(__dirname, '..', 'data', 'usuarios.json');
const allowedRoles = new Set(['ADMINISTRADOR', 'AGENTE']);
const sessionCookieName = 'sentinela_session';
const sessionDurationMs = 8 * 60 * 60 * 1000;
const sessions = new Map();
let writeQueue = Promise.resolve();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { erro: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

async function readUsers() {
  try {
    return JSON.parse(await fs.readFile(usersFile, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function serializeWrites(operation) {
  const result = writeQueue.then(operation);
  writeQueue = result.catch(() => {});
  return result;
}

async function saveUsers(users) {
  await fs.mkdir(path.dirname(usersFile), { recursive: true });
  const temporaryFile = `${usersFile}.${process.pid}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(users, null, 2), { mode: 0o600 });
  await fs.rename(temporaryFile, usersFile);
}

function normalizeUsername(username) {
  return typeof username === 'string' ? username.trim().toLowerCase() : '';
}

function isValidUsername(username) {
  return username.length >= 3 && username.length <= 32 && /^[\p{L}\p{N}._-]+(?: [\p{L}\p{N}._-]+)*$/u.test(username);
}

function isValidPassword(password) {
  return typeof password === 'string'
    && password.length >= 6
    && password.length <= 128
    && /[\p{Lu}]/u.test(password)
    && /[^\p{L}\p{N}\s]/u.test(password);
}

function getSession(req) {
  const token = (req.headers.cookie || '').split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`))
    ?.slice(sessionCookieName.length + 1);
  const session = token ? sessions.get(token) : null;

  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function requireAdministrator(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ erro: 'Faça login para continuar.' });
  if (session.cargo !== 'ADMINISTRADOR') {
    return res.status(403).json({ erro: 'Acesso permitido somente para administradores.' });
  }
  req.authenticatedUser = session;
  return next();
}

async function createUser(req, res) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ erro: 'Informe os dados do cadastro em formato válido.' });
  }
  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
  const usuario = normalizeUsername(req.body.usuario);
  const cargo = typeof req.body.cargo === 'string' ? req.body.cargo.trim().toUpperCase() : '';
  const senha = req.body.senha;

  if (!nome || nome.length > 120) {
    return res.status(400).json({ erro: 'Informe um nome com até 120 caracteres.' });
  }
  if (!isValidUsername(usuario)) {
    return res.status(400).json({ erro: 'O usuário deve ter de 3 a 32 caracteres e conter letras, números, espaços simples entre palavras, ponto, hífen ou sublinhado.' });
  }
  if (!allowedRoles.has(cargo)) {
    return res.status(400).json({ erro: 'Selecione um cargo válido.' });
  }
  if (!isValidPassword(senha)) {
    return res.status(400).json({ erro: 'A senha precisa ter de 6 a 128 caracteres, uma letra maiúscula e um caractere especial.' });
  }

  try {
    const created = await serializeWrites(async () => {
      const users = await readUsers();
      if (users.some((user) => user.usuario === usuario)) return false;

      const salt = randomBytes(16).toString('hex');
      const passwordHash = (await scryptAsync(senha, salt, 64)).toString('hex');
      users.push({ nome, usuario, cargo, salt, passwordHash });
      await saveUsers(users);
      return true;
    });

    if (!created) {
      return res.status(409).json({ erro: 'Este usuário já está cadastrado.' });
    }
    return res.status(201).json({ mensagem: 'Cadastro realizado. Agora você pode fazer login.' });
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error.message);
    return res.status(500).json({ erro: 'Não foi possível concluir o cadastro.' });
  }
}

router.post('/cadastro', loginLimiter, requireAdministrator, createUser);
router.post('/usuarios', loginLimiter, requireAdministrator, createUser);

router.get('/usuarios', requireAdministrator, async (req, res) => {
  try {
    const users = await readUsers();
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ usuarios: users.map(({ nome, usuario, cargo }) => ({ nome: nome || usuario, usuario, cargo })) });
  } catch (error) {
    console.error('Erro ao listar usuários:', error.message);
    return res.status(500).json({ erro: 'Não foi possível carregar os usuários.' });
  }
});

router.get('/sessao', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ erro: 'Sessão não autenticada.' });
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ usuario: { usuario: session.usuario, cargo: session.cargo } });
});

router.post('/logout', (req, res) => {
  const session = getSession(req);
  if (session) sessions.delete(session.token);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
  return res.json({ mensagem: 'Sessão encerrada.' });
});

async function bootstrapAdministrator() {
  return serializeWrites(async () => {
    const users = await readUsers();
    const usuario = normalizeUsername(process.env.ADMIN_USERNAME);
    const senha = process.env.ADMIN_PASSWORD;
    const configuredUser = users.find((user) => user.usuario === usuario);

    if (!usuario && !senha) {
      if (users.some((user) => user.cargo === 'ADMINISTRADOR')) return false;
      console.warn('Administrador inicial ausente. Configure ADMIN_USERNAME e ADMIN_PASSWORD no .env.');
      return false;
    }
    if (!isValidUsername(usuario) || !isValidPassword(senha)) {
      throw new Error('ADMIN_USERNAME ou ADMIN_PASSWORD não atende aos requisitos de cadastro.');
    }

    if (configuredUser) {
      if (configuredUser.cargo !== 'ADMINISTRADOR') {
        throw new Error('ADMIN_USERNAME já está associado a um usuário que não é administrador.');
      }

      const attemptedHash = await scryptAsync(senha, configuredUser.salt, 64);
      const storedHash = Buffer.from(configuredUser.passwordHash, 'hex');
      if (storedHash.length !== attemptedHash.length || !timingSafeEqual(storedHash, attemptedHash)) {
        const salt = randomBytes(16).toString('hex');
        configuredUser.salt = salt;
        configuredUser.passwordHash = (await scryptAsync(senha, salt, 64)).toString('hex');
        await saveUsers(users);
      }
      return false;
    }

    if (users.some((user) => user.cargo === 'ADMINISTRADOR')) return false;
    if (users.some((user) => user.usuario === usuario)) {
      throw new Error('ADMIN_USERNAME já está associado a outro usuário.');
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = (await scryptAsync(senha, salt, 64)).toString('hex');
    users.push({ usuario, cargo: 'ADMINISTRADOR', salt, passwordHash });
    await saveUsers(users);
    return true;
  });
}

async function login(req, res, requiredRole) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  }
  const usuario = normalizeUsername(req.body.usuario);
  const senha = req.body.senha;

  if (!isValidUsername(usuario) || typeof senha !== 'string') {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  }

  try {
    await writeQueue;
    const users = await readUsers();
    const user = users.find((registeredUser) => registeredUser.usuario === usuario);
    if (!user) return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });

    const attemptedHash = await scryptAsync(senha, user.salt, 64);
    const storedHash = Buffer.from(user.passwordHash, 'hex');
    if (storedHash.length !== attemptedHash.length || !timingSafeEqual(storedHash, attemptedHash)) {
      return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
    }

    if (!allowedRoles.has(user.cargo)) {
      return res.status(403).json({ erro: 'Este usuário não possui um cargo válido.' });
    }
    if (requiredRole && user.cargo !== requiredRole) {
      const roleName = requiredRole === 'ADMINISTRADOR' ? 'administradores' : 'agentes';
      return res.status(403).json({ erro: `Acesso permitido somente para ${roleName}.` });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + sessionDurationMs;
    sessions.set(token, { usuario: user.usuario, cargo: user.cargo, expiresAt });
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionDurationMs / 1000}${secure}`);
    res.setHeader('Cache-Control', 'no-store');
    const redirect = user.cargo === 'ADMINISTRADOR' ? 'tela-adm-opcoes.html' : 'index.html';
    return res.json({ mensagem: 'Login realizado com sucesso.', usuario: { usuario: user.usuario, cargo: user.cargo }, redirect });
  } catch (error) {
    console.error('Erro ao validar login:', error.message);
    return res.status(500).json({ erro: 'Não foi possível validar o acesso.' });
  }
}

router.post('/login', loginLimiter, (req, res) => login(req, res));
router.post('/login/administrador', loginLimiter, (req, res) => login(req, res, 'ADMINISTRADOR'));
router.post('/login/agente', loginLimiter, (req, res) => login(req, res, 'AGENTE'));

module.exports = router;
module.exports.bootstrapAdministrator = bootstrapAdministrator;