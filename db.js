// ============================================================
//  db.js — Conexão com o MySQL
//
//  Usa "pool" em vez de uma conexão única.
//  Pool = conjunto de conexões reutilizáveis.
//  Isso evita erro de "connection lost" em projetos reais.
// ============================================================

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host    : process.env.DB_HOST     || 'localhost',
  port    : process.env.DB_PORT     || 3306,
  user    : process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'emergencias',

  // Quantas conexões simultâneas o pool pode abrir
  connectionLimit: 10,

  // Aguarda até 30s por uma conexão livre antes de dar erro
  waitForConnections: true,
  queueLimit: 0,
});

// Testa a conexão ao iniciar — falha rápido se as credenciais estiverem erradas
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL conectado com sucesso.');
    conn.release(); // devolve a conexão ao pool
  })
  .catch(err => {
    console.error('❌ Falha ao conectar no MySQL:', err.message);
    console.error('   Verifique as variáveis no arquivo .env');
    process.exit(1); // encerra o servidor se não conseguir conectar
  });

module.exports = pool;