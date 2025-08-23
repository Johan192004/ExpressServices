const express = require("express");
const router = express.Router();
const pool = require("../models/db"); // aquí importamos la conexión

// GET services con filtros
router.get("/", async (req, res) => {
  try {
    const { categoria, experiencia, precio } = req.query;

  let query = "SELECT * FROM services WHERE 1=1";
    const params = [];

    if (categoria && categoria !== "todos") {
      query += " AND categoria = ?";
      params.push(categoria);
    }

    if (experiencia) {
      query += " AND experiencia >= ?";
      params.push(parseInt(experiencia));
    }

    if (precio) {
      query += " AND precio <= ?";
      params.push(parseInt(precio));
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
  console.error("❌ Error al obtener servicios:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
