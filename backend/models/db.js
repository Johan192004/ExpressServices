require("dotenv").config();
const mysql = require("mysql2/promise");

// Create the connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Connection test
(async () => {
  try {
    const conn = await pool.getConnection();
  console.log("✅ Successful connection to MySQL");
    conn.release();
  } catch (err) {
  console.error("❌ Error connecting to MySQL:", err.message);
  }
})();

module.exports = pool;

