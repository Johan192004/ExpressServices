const express = require('express');
const router = express.Router();
const pool = require('../models/db.js');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail.js');
const bcrypt = require("bcryptjs");

// ROUTE 1: REQUEST PASSWORD RESET
router.post('/forgot', async (req, res) => {
    try {
        const { email } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.json({ message: 'Si tu correo está registrado, recibirás un enlace.' });
        }
        const user = users[0];

        const resetToken = crypto.randomBytes(20).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Use UTC for the expiration date
        const expirationDate = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

        await pool.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id_user = ?', [hashedToken, expirationDate, user.id_user]);

        const resetUrl = `${process.env.FRONTEND_URL}/frontend/reset-password.html?token=${resetToken}`;
        const message = `<p>Has solicitado restablecer tu contraseña. Por favor, haz clic en el siguiente enlace (válido por 10 minutos): <a href="${resetUrl}">Restablecer Contraseña</a></p>`;

        await sendEmail({
            email: user.email,
            subject: 'Restablecimiento de contraseña - Servicios Express',
            message
        });

        res.json({ message: 'Si tu correo está registrado, recibirás un enlace.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al enviar el correo.' });
    }
});


// ROUTE 2: PERFORM PASSWORD RESET 
router.post('/reset/:token', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
        }
        
        const resetToken = req.params.token;
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Use current time in UTC as well.
        const nowUTC = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Look up a valid token comparing against the generated UTC date
        const [users] = await pool.query(
            'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?', 
            [hashedToken, nowUTC]
        );
        
        if (users.length === 0) {
            return res.status(400).json({ error: 'El token no es válido o ha expirado. Por favor, solicita un nuevo enlace.' });
        }
        const user = users[0];

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        await pool.query(
            'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id_user = ?', 
            [password_hash, user.id_user]
        );

        res.json({ message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.' });

    } catch (error) {
    console.error("Error resetting password:", error);
        res.status(500).json({ error: 'Ocurrió un error al restablecer la contraseña.' });
    }
});

module.exports = router;