const express = require("express");
const router = express.Router();
const pool = require("../models/db.js");
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken'); 
const { body, validationResult } = require('express-validator'); 
const { googleLogin } = require('../controllers/googleAuthController');

// Validation rules for login
const loginValidationRules = [
    body('email', 'Por favor, ingresa un correo válido').isEmail().normalizeEmail(),
    body('password', 'La contraseña no puede estar vacía').not().isEmpty()
];

router.post("/", loginValidationRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;

    // Find user by email
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

        if (users.length === 0) {
            // Use a generic message for security
            return res.status(401).json({ error: "Credenciales incorrectas." });
        }

        const user = users[0];

    // Compare provided password against stored hash
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: "Credenciales incorrectas." });
        }

    // Determine ALL roles for the user
    // Initialize an empty roles array
        let roles = []; 

        const [clients] = await pool.query("SELECT id_client FROM clients WHERE id_user = ?", [user.id_user]);
        if (clients.length > 0) {
            roles.push("client"); 
        }
        
        const [providers] = await pool.query("SELECT id_provider FROM providers WHERE id_user = ?", [user.id_user]);
        if (providers.length > 0) {
            roles.push("provider");
        }
        
        if (roles.length === 0) {
            return res.status(403).json({ error: "Este usuario no tiene un rol asignado." });
        }
        
    // Create token payload including roles array
        const payload = {
            user: {
                id: user.id_user,
                roles: roles 
            }
        };

    // Sign and return the token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                
                res.json({
                    message: "Login exitoso 🎉",
                    token: token,
                    user: {
                        id: user.id_user,
                        id_provider: providers.length > 0 ? providers[0].id_provider : null,
                        id_client: clients.length > 0 ? clients[0].id_client : null,
                        email: user.email,
                        full_name: user.full_name,
                        roles: roles
                    }
                });

            }
        );

    } catch (err) {
    console.error("Login error:", err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

module.exports = router;

// Ruta para login con Google
router.post('/google', googleLogin);