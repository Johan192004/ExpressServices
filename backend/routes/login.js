const express = require("express");
const router = express.Router();
const pool = require("../models/db.js");
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken'); 
const { body, validationResult } = require('express-validator'); 

// 3. Creamos las reglas de validación para el login
const loginValidationRules = [
    body('email', 'Por favor, ingresa un correo válido').isEmail().normalizeEmail(),
    body('password', 'La contraseña no puede estar vacía').not().isEmpty()
];

router.post("/", loginValidationRules, async (req, res) => {
    // 4. Verificamos si hay errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;

        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

        if (users.length === 0) {
            return res.status(401).json({ error: "Correo no encontrado." });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: "Contraseña incorrecta." });
        }

        let role = null;
        let roleId = null;

        const [clients] = await pool.query("SELECT id_client FROM clients WHERE id_user = ?", [user.id_user]);
        if (clients.length > 0) {
            role = "client";
            roleId = clients[0].id_client;
        } else {
            // 5. ACTUALIZACIÓN: Buscamos en 'providers' en lugar de 'suppliers'
            const [providers] = await pool.query("SELECT id_provider FROM providers WHERE id_user = ?", [user.id_user]);
            if (providers.length > 0) {
                role = "provider";
                roleId = providers[0].id_provider;
            }
        }
        
        if (!role) {
            return res.status(403).json({ error: "Este usuario no tiene un rol asignado." });
        }
        
        // 6. Creamos el "payload" - la información que guardaremos en el token
        const payload = {
            user: {
                id: user.id_user,
                role: role
            }
        };

        // 7. Firmamos el token
        jwt.sign(
            payload,
            process.env.JWT_SECRET, // Usamos la clave secreta del .env
            { expiresIn: '1h' },   // El token expirará en 1 hora
            (err, token) => {
                if (err) throw err;
                
                // 8. Enviamos el token al cliente junto con la info del usuario
                res.json({
                    message: "Login exitoso 🎉",
                    token: token, // ¡Aquí está el token!
                    user: {
                        id: user.id_user,
                        email: user.email,
                        full_name: user.full_name,
                        role: role
                    }
                });
            }
        );

    } catch (err) {
        console.error("Error en el login:", err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

module.exports = router;