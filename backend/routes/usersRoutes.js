// backend/routes/usersRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../models/db.js');
const { query, validationResult } = require('express-validator');

// Reglas de validación para asegurar que nos envíen un email
const emailCheckValidation = [
    query('email', 'Por favor, proporciona un correo válido').isEmail().normalizeEmail()
];

// La ruta será: GET /api/users/check-email?email=correo@ejemplo.com
router.get('/check-email', emailCheckValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email } = req.query;
        const [users] = await pool.query("SELECT id_user FROM users WHERE email = ?", [email]);
        
        // Respondemos con un JSON que indica si el email existe o no
        res.json({ exists: users.length > 0 });

    } catch (error) {
        console.error("Error verificando email:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

module.exports = router;