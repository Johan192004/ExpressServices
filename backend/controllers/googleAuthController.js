const { OAuth2Client } = require('google-auth-library');
const pool = require('../models/db.js');
const jwt = require('jsonwebtoken');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function googleLogin(req, res) {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token de Google requerido" });

    const connection = await pool.getConnection(); // Get a connection for the transaction

    try {
        // Verify the token with Google
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name: full_name, picture } = payload; // Extract picture as well, if needed

        // Start a transaction
        await connection.beginTransaction();

        // Look up user
        const [users] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);
        let user = users[0];
        let isNewUser = false;
        let clientId = null;

        if (!user) {
            // 1. If not exists, create it
            const [userResult] = await connection.query(
                "INSERT INTO users (email, full_name, password_hash) VALUES (?, ?, ?)",
                [email, full_name, null] // Password null para usuarios de Google
            );
            user = { id_user: userResult.insertId, email, full_name };
            isNewUser = true;
        }

        // If user does not have a client profile, create it
        const [clientsCheck] = await connection.query("SELECT id_client FROM clients WHERE id_user = ?", [user.id_user]);
        if (clientsCheck.length === 0) {
            const [clientResult] = await connection.query("INSERT INTO clients (id_user) VALUES (?)", [user.id_user]);
            clientId = clientResult.insertId;
        } else {
            clientId = clientsCheck[0].id_client;
        }

        // Commit transaction if everything went well
        await connection.commit();

        // --- Determine roles efficiently ---
        let roles = [];
        let providerId = null;

        // If new, we know they are a client. Otherwise, look it up.
        if (isNewUser) {
            roles.push("client");
        } else {
            const [clients] = await pool.query("SELECT id_client FROM clients WHERE id_user = ?", [user.id_user]);
            if (clients.length > 0) {
                roles.push("client");
                clientId = clients[0].id_client;
            }
        }
        
        // Always check for provider role
        const [providers] = await pool.query("SELECT id_provider FROM providers WHERE id_user = ?", [user.id_user]);
        if (providers.length > 0) {
            roles.push("provider");
            providerId = providers[0].id_provider;
        }

        // Create JWT (async/await for code consistency)
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
        // Rollback if something fails
        await connection.rollback();
        console.error("Error in Google login:", err);
        res.status(500).json({ error: "Error en el servidor o token inválido" });
    } finally {
        // Always release the connection at the end
        if (connection) connection.release();
    }
}

module.exports = { googleLogin };