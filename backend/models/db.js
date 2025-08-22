require("dotenv").config();
const mysql = require("mysql2/promise");

// Crear el pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Test de conexión
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Conexión exitosa a MySQL");
    conn.release();
  } catch (err) {
    console.error("❌ Error conectando a MySQL:", err.message);
  }
})();

module.exports = pool;

