const { OAuth2Client } = require('google-auth-library');
const pool = require('../models/db.js');
const jwt = require('jsonwebtoken');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function googleLogin(req, res) {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token de Google requerido" });

    const connection = await pool.getConnection(); // Obtenemos una conexión para la transacción

    try {
        // Verifica el token con Google
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name: full_name, picture } = payload; // Extraemos picture también, por si la quieres usar

        // Inicia una transacción
        await connection.beginTransaction();

        // Busca el usuario
        const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);
        let user = users[0];
        let isNewUser = false;
        let clientId = null;

        if (!user) {
            // 1. Si no existe, lo creamos
            const [userResult] = await connection.query(
                "INSERT INTO users (email, full_name, password_hash) VALUES (?, ?, ?)",
                [email, full_name, null] // Password null para usuarios de Google
            );
            user = { id_user: userResult.insertId, email, full_name };
            isNewUser = true;
        }

        // Si el usuario no tiene perfil de cliente, lo creamos
        const [clientsCheck] = await connection.query("SELECT id_client FROM clients WHERE id_user = ?", [user.id_user]);
        if (clientsCheck.length === 0) {
            const [clientResult] = await connection.query("INSERT INTO clients (id_user) VALUES (?)", [user.id_user]);
            clientId = clientResult.insertId;
        } else {
            clientId = clientsCheck[0].id_client;
        }

        // Confirma la transacción si todo salió bien
        await connection.commit();

        // --- Determina roles de forma más eficiente ---
        let roles = [];
        let providerId = null;

        // Si es nuevo, ya sabemos que es cliente. Si no, lo buscamos.
        if (isNewUser) {
            roles.push("client");
        } else {
            const [clients] = await pool.query("SELECT id_client FROM clients WHERE id_user = ?", [user.id_user]);
            if (clients.length > 0) {
                roles.push("client");
                clientId = clients[0].id_client;
            }
        }
        
        // La búsqueda de proveedor siempre es necesaria
        const [providers] = await pool.query("SELECT id_provider FROM providers WHERE id_user = ?", [user.id_user]);
        if (providers.length > 0) {
            roles.push("provider");
            providerId = providers[0].id_provider;
        }

        // Crea el JWT con async/await para mantener la consistencia del código
        const jwtPayload = { user: { id: user.id_user, roles: roles } };
        const appToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({
            message: "Login con Google exitoso 🎉",
            token: appToken,
            user: {
                id: user.id_user,
                id_provider: providerId,
                id_client: clientId,
                email: user.email,
                full_name: user.full_name,
                roles: roles
            }
        });

    } catch (err) {
        // Si algo falla, revierte la transacción
        await connection.rollback();
        console.error("Error en login con Google:", err);
        res.status(500).json({ error: "Error en el servidor o token inválido" });
    } finally {
        // Siempre libera la conexión al final
        if (connection) connection.release();
    }
}

module.exports = { googleLogin };