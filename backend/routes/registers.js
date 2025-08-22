const express = require("express");
const router = express.Router();
const pool = require("../models/db.js");

//Registro de usuario-cliente
router.post("/client", async (req, res) => {
  try {
    const { full_name, email, password_hash, phone_number, personal_picture } = req.body;

    // 1. Insertamos en USERS
    const [userResult] = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, phone_number, personal_picture) VALUES (?, ?, ?, ?, ?)",
      [full_name, email, password_hash, phone_number, personal_picture]
    );

    const userId = userResult.insertId;

    // 2. Insertamos en CLIENTS con id_user
    const [clientResult] = await pool.query(
      "INSERT INTO clients (id_user) VALUES (?)",
      [userId]
    );

    res.json({ message: "Cliente registrado ✅", id_client: clientResult.insertId, id_user: userId });
  } catch (err) {
    console.error("Error registrando cliente:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Registro de usuario-proveedor
router.post("/supplier", async (req, res) => {
  try {
    const { full_name, email, password_hash, phone_number, personal_picture } = req.body;

    // 1. Insertamos en USERS
    const [userResult] = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, phone_number, personal_picture) VALUES (?, ?, ?, ?, ?)",
      [full_name, email, password_hash, phone_number, personal_picture]
    );

    const userId = userResult.insertId;

    // 2. Insertamos en SUPPLIERS con id_user
    const [supplierResult] = await pool.query(
      "INSERT INTO suppliers (id_user) VALUES (?)",
      [userId]
    );

    res.json({ message: "Proveedor registrado ✅", id_supplier: supplierResult.insertId, id_user: userId });
  } catch (err) {
    console.error("Error registrando proveedor:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
