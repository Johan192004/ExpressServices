
const express = require('express');
const router = express.Router();
const pool = require('../models/db.js');
const { protect } = require('../middleware/authMiddleware.js');

/**
 * @route   GET /api/conversations/provider
 * @desc    Get all conversations for the logged-in provider
 * @access  Private (Providers only)
 */
router.get('/provider', protect, async (req, res) => {
    try {
    const id_user_provider = req.user.id; // Provider user ID (from token)

    // 1. Get id_provider from id_user
        const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id_user_provider]);
        if (providerRows.length === 0) {
            return res.status(403).json({ error: 'Acción no permitida. Debes ser un proveedor.' });
        }
        const id_provider = providerRows[0].id_provider;

    // 2. Get all conversations for that provider, joining tables for UI data
    const [conversations] = await pool.query(
            `SELECT 
                convo.id_conversation,
                convo.created_at,
        DATE_FORMAT(CONVERT_TZ(convo.created_at, @@session.time_zone, '-05:00'), '%Y-%m-%dT%H:%i:%s-05:00') AS created_at_co_iso,
                s.name as service_name,
                u_client.full_name as client_name,
                u_client.personal_picture as client_picture
             FROM conversations convo
             JOIN services s ON convo.id_service = s.id_service
             JOIN clients c ON convo.id_client = c.id_client
             JOIN users u_client ON c.id_user = u_client.id_user
             WHERE convo.id_provider = ?
             ORDER BY convo.created_at DESC`,
            [id_provider]
        );

        res.status(200).json(conversations);

    } catch (error) {
    console.error("Error fetching provider conversations:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


/**
 * @route   GET /api/conversations/client
 * @desc    Get all conversations for the logged-in client
 * @access  Private (Clients only)
 */
router.get('/client', protect, async (req, res) => {
    try {
    const id_user_client = req.user.id; // Client user ID (from token)

    // 1. Get id_client from id_user
        const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id_user_client]);
        if (clientRows.length === 0) {
            return res.status(403).json({ error: 'Acción no permitida. Debes ser un cliente.' });
        }
        const id_client = clientRows[0].id_client;
        
    // 2. Get all conversations for that client (provider + service info)
    const [conversations] = await pool.query(
            `SELECT 
                convo.id_conversation,
                convo.created_at,
        DATE_FORMAT(CONVERT_TZ(convo.created_at, @@session.time_zone, '-05:00'), '%Y-%m-%dT%H:%i:%s-05:00') AS created_at_co_iso,
                s.name as service_name,
                u_provider.full_name as provider_name,
                u_provider.personal_picture as provider_picture
             FROM conversations convo
             JOIN services s ON convo.id_service = s.id_service
             JOIN providers p ON convo.id_provider = p.id_provider
             JOIN users u_provider ON p.id_user = u_provider.id_user
             WHERE convo.id_client = ?
             ORDER BY convo.created_at DESC`,
            [id_client]
        );

        res.status(200).json(conversations);

    } catch (error) {
    console.error("Error fetching client conversations:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


/**
 * @route   POST /api/conversations
 * @desc    Start or find a conversation for a service
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
    try {
        const { id_service } = req.body;
     const id_user_client = req.user.id; 

        if (!id_service) {
            return res.status(400).json({ error: 'El ID del servicio es requerido.' });
        }

        const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id_user_client]);
        if (clientRows.length === 0) {
            return res.status(403).json({ error: 'Acción no permitida. Debes ser un cliente para iniciar una conversación.' });
        }
        const id_client = clientRows[0].id_client;

        const [serviceRows] = await pool.query('SELECT id_provider FROM services WHERE id_service = ?', [id_service]);
        if (serviceRows.length === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado.' });
        }
        const id_provider = serviceRows[0].id_provider;
        
        const [existingConvos] = await pool.query(
            'SELECT id_conversation FROM conversations WHERE id_client = ? AND id_provider = ? AND id_service = ?',
            [id_client, id_provider, id_service]
        );

        if (existingConvos.length > 0) {
            return res.status(200).json({ 
                message: 'Conversación ya existente.',
                id_conversation: existingConvos[0].id_conversation 
            });
        }
        
        const [result] = await pool.query(
            'INSERT INTO conversations (id_client, id_provider, id_service) VALUES (?, ?, ?)',
            [id_client, id_provider, id_service]
        );
        
        res.status(201).json({ 
            message: 'Conversación iniciada con éxito.',
            id_conversation: result.insertId 
        });

    } catch (error) {
        console.error("Error starting conversation:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


/**
 * @route   GET /api/conversations/:id/messages
 * @desc    Get all messages in a conversation
 * @access  Private
 */
router.get('/:id/messages', protect, async (req, res) => {
    try {
    const { id } = req.params; // Conversation ID
    const id_user = req.user.id; // Logged-in user ID

    // Ensure the current user is part of the conversation (security)
        const [convoCheck] = await pool.query(
            `SELECT c.id_client, p.id_provider 
             FROM conversations convo
             JOIN clients c ON convo.id_client = c.id_client
             JOIN providers p ON convo.id_provider = p.id_provider
             WHERE convo.id_conversation = ? AND (c.id_user = ? OR p.id_user = ?)`,
            [id, id_user, id_user]
        );

        if (convoCheck.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para ver esta conversación.' });
        }

    // Fetch messages and sender info
    const [messages] = await pool.query(
            `SELECT 
                m.*, 
                u.full_name as sender_name, 
                u.personal_picture as sender_picture,
        DATE_FORMAT(CONVERT_TZ(m.sent_at, @@session.time_zone, '-05:00'), '%Y-%m-%dT%H:%i:%s-05:00') AS sent_at_co_iso,
        UNIX_TIMESTAMP(m.sent_at) AS sent_at_unix
             FROM messages m
             JOIN users u ON m.sender_id = u.id_user
         WHERE m.id_conversation = ?
         ORDER BY m.sent_at ASC`, // Order by date for a coherent chat
            [id]
        );
        
        res.status(200).json(messages);

    } catch (error) {
    console.error("Error fetching messages:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


/**
 * @route   POST /api/conversations/:id/messages
 * @desc    Send a new message to a conversation
 * @access  Private
 */
router.post('/:id/messages', protect, async (req, res) => {
    try {
    const { id } = req.params; // Conversation ID
        const { content } = req.body;
    const sender_id = req.user.id; // Sender ID (from token)

        if (!content) {
            return res.status(400).json({ error: 'El contenido del mensaje no puede estar vacío.' });
        }

    // Optional: re-verify that the sender belongs to the conversation (same security as GET)

    // Insert the new message
        const [result] = await pool.query(
            'INSERT INTO messages (id_conversation, sender_id, content) VALUES (?, ?, ?)',
            [id, sender_id, content]
        );

    // Return the newly created message
    const [newMessage] = await pool.query(
            `SELECT 
                m.*, 
                u.full_name as sender_name, 
                u.personal_picture as sender_picture,
        DATE_FORMAT(CONVERT_TZ(m.sent_at, @@session.time_zone, '-05:00'), '%Y-%m-%dT%H:%i:%s-05:00') AS sent_at_co_iso,
        UNIX_TIMESTAMP(m.sent_at) AS sent_at_unix
             FROM messages m
             JOIN users u ON m.sender_id = u.id_user
             WHERE m.id_message = ?`,
            [result.insertId]
        );
        
        res.status(201).json(newMessage[0]);

    } catch (error) {
    console.error("Error sending message:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


module.exports = router;