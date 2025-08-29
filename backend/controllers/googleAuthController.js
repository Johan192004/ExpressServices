const { OAuth2Client } = require('google-auth-library');
const pool = require('../models/db.js');
const jwt = require('jsonwebtoken');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function googleLogin(req, res) {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token de Google requerido" });

    try {
        // Verifica el token con Google
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = payload.email;
        const full_name = payload.name;

        // Busca el usuario en la base de datos
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        let user = users[0];

        // Si no existe, créalo (ajusta los campos según tu modelo)
        if (!user) {
            const [result] = await pool.query(
                "INSERT INTO users (email, full_name, password_hash) VALUES (?, ?, ?)",
                [email, full_name, null]
            );
            user = { id_user: result.insertId, email, full_name };
        }

        // Determina roles igual que en el login normal
        let roles = [];
        const [clients] = await pool.query("SELECT id_client FROM clients WHERE id_user = ?", [user.id_user]);
        if (clients.length > 0) roles.push("client");
        const [providers] = await pool.query("SELECT id_provider FROM providers WHERE id_user = ?", [user.id_user]);
        if (providers.length > 0) roles.push("provider");
        if (roles.length === 0) roles.push("client"); // Asigna rol por defecto si quieres

        // Crea el JWT
        const jwtPayload = {
            user: {
                id: user.id_user,
                roles: roles
            }
        };
        jwt.sign(
            jwtPayload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    message: "Login con Google exitoso 🎉",
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
        console.error("Error en login con Google:", err);
        res.status(500).json({ error: "Error en el servidor o token inválido" });
    }
}

module.exports = { googleLogin };
