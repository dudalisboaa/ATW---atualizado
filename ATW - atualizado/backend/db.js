const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ATW2',
  port: 3306,
  charset: 'utf8mb4'
};

let pool;

// Conectar ao banco (uma vez só)
async function connectDB() {
  if (!pool) {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    try {
      const conn = await pool.getConnection();
      console.log(`✅ Conectado ao MySQL: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
      conn.release();
    } catch (err) {
      console.error('❌ Erro ao conectar ao MySQL:', err.message);
      throw err;
    }
  }
  return pool;
}

// Executar queries facilmente
async function executeQuery(query, params = []) {
  if (!pool) {
    throw new Error('Banco de dados não conectado. Chame connectDB() primeiro.');
  }
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (err) {
    console.error('❌ Erro na query:', err.message);
    console.error('SQL:', query);
    throw err;
  }
}

module.exports = { connectDB, executeQuery };
