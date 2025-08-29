
const express = require('express');
const router = express.Router();
const pool = require('../models/db.js');
const { protect } = require('../middleware/authMiddleware.js');

/**
 * @route   GET /api/conversations/provider
 * @desc    Obtener todas las conversaciones de un proveedor logueado
 * @access  Private (Solo para proveedores)
 */
router.get('/provider', protect, async (req, res) => {
    try {
        const id_user_provider = req.user.id; // ID del usuario proveedor (del token)

        // 1. Obtenemos el id_provider a partir del id_user
        const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id_user_provider]);
        if (providerRows.length === 0) {
            return res.status(403).json({ error: 'Acción no permitida. Debes ser un proveedor.' });
        }
        const id_provider = providerRows[0].id_provider;

        // 2. Obtenemos todas las conversaciones de ese proveedor
        //    y unimos las tablas para obtener datos útiles para la interfaz
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
        console.error("Error al obtener las conversaciones del proveedor:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


/**
 * @route   GET /api/conversations/client
 * @desc    Obtener todas las conversaciones de un cliente logueado
 * @access  Private (Solo para clientes)
 */
router.get('/client', protect, async (req, res) => {
    try {
        const id_user_client = req.user.id; // ID del usuario cliente (del token)

        // 1. Obtenemos el id_client a partir del id_user
        const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id_user_client]);
        if (clientRows.length === 0) {
            return res.status(403).json({ error: 'Acción no permitida. Debes ser un cliente.' });
        }
        const id_client = clientRows[0].id_client;

        // 2. Obtenemos todas las conversaciones de ese cliente
        //    y unimos las tablas para obtener el nombre del proveedor y del servicio
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
        console.error("Error al obtener las conversaciones del cliente:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


/**
 * @route   POST /api/conversations
 * @desc    Iniciar o encontrar una conversación sobre un servicio
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
    // ... (esta ruta que ya creamos se queda igual)
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
        console.error("Error al iniciar conversación:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


/**
 * @route   GET /api/conversations/:id/messages
 * @desc    Obtener todos los mensajes de una conversación
 * @access  Private
 */
router.get('/:id/messages', protect, async (req, res) => {
    try {
        const { id } = req.params; // ID de la conversación
        const id_user = req.user.id; // ID del usuario logueado

        // Verificamos que el usuario actual sea parte de la conversación (seguridad)
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

        // Si tiene permiso, obtenemos los mensajes y los datos del remitente
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
             ORDER BY m.sent_at ASC`, // Ordenamos por fecha para un chat coherente
            [id]
        );
        
        res.status(200).json(messages);

    } catch (error) {
        console.error("Error al obtener mensajes:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


/**
 * @route   POST /api/conversations/:id/messages
 * @desc    Enviar un nuevo mensaje a una conversación
 * @access  Private
 */
router.post('/:id/messages', protect, async (req, res) => {
    try {
        const { id } = req.params; // ID de la conversación
        const { content } = req.body;
        const sender_id = req.user.id; // ID del remitente (del token)

        if (!content) {
            return res.status(400).json({ error: 'El contenido del mensaje no puede estar vacío.' });
        }

        // (Opcional pero recomendado) Volver a verificar que el remitente pertenece a la conversación
        // ... (se puede añadir la misma lógica de seguridad del GET anterior)

        // Insertamos el nuevo mensaje
        const [result] = await pool.query(
            'INSERT INTO messages (id_conversation, sender_id, content) VALUES (?, ?, ?)',
            [id, sender_id, content]
        );

        // Devolvemos el mensaje recién creado
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
        console.error("Error al enviar mensaje:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


module.exports = router;