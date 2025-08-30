const express = require('express');
const router = express.Router();
const pool = require('../models/db.js');
const { query, validationResult } = require('express-validator');
const { protect } = require('../middleware/authMiddleware.js');

// Validation rules to ensure we receive an email
const emailCheckValidation = [
    query('email', 'Por favor, proporciona un correo válido').isEmail().normalizeEmail()
];

// Route to check if email is already registered
router.get('/check-email', emailCheckValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email } = req.query;
        const [users] = await pool.query("SELECT id_user FROM users WHERE email = ?", [email]);
        
    // Respond with JSON indicating whether the email exists
        res.json({ exists: users.length > 0 });

    } catch (error) {
        console.error("Error checking email:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});


// NEW ROUTE: Get the profile of the logged-in user 
router.get('/profile', protect, async (req, res) => {
    try {
        const id_user = req.user.id;

    // Fetch base user
        const [users] = await pool.query('SELECT id_user, full_name, email FROM users WHERE id_user = ?', [id_user]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        let userProfile = { ...users[0] };

    // Check if user has a client profile
        const [clients] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id_user]);
        if (clients.length > 0) {
            userProfile.id_client = clients[0].id_client;
        }

    // Check if user has a provider profile
        const [providers] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id_user]);
        if (providers.length > 0) {
            userProfile.id_provider = providers[0].id_provider;
        }

        res.json(userProfile);

    } catch (error) {
    console.error("Error fetching user profile:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


module.exports = router;