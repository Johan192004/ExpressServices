// backend/routes/contractsRoutes.js

const express = require('express');
const router = express.Router();
const pool = require('../models/db.js');
const { protect } = require('../middleware/authMiddleware.js');

/**
 * @route   POST /api/contracts
 * @desc    Un cliente crea una oferta de contrato para un servicio
 * @access  Private (Solo Clientes)
 */
router.post('/', protect, async (req, res) => {
    try {
        const { id_service, agreed_hours } = req.body;
        const id_user = req.user.id;

        if (!id_service || !agreed_hours || agreed_hours <= 0) {
            return res.status(400).json({ error: 'Faltan datos o las horas no son válidas.' });
        }

        const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id_user]);
        if (clientRows.length === 0) {
            return res.status(403).json({ error: 'Solo los clientes pueden crear contratos.' });
        }
        const id_client = clientRows[0].id_client;

        const [serviceRows] = await pool.query('SELECT hour_price FROM services WHERE id_service = ?', [id_service]);
        if (serviceRows.length === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado.' });
        }
        
        const hour_price = serviceRows[0].hour_price;
        const agreed_price = parseFloat(hour_price) * parseFloat(agreed_hours);

        const [result] = await pool.query(
            'INSERT INTO contracts (id_service, id_client, agreed_hours, agreed_price, status) VALUES (?, ?, ?, ?, ?)',
            [id_service, id_client, agreed_hours, agreed_price, 'pending']
        );

        res.status(201).json({ 
            message: '¡Oferta enviada con éxito!',
            id_contract: result.insertId 
        });

    } catch (error) {
        console.error("Error al crear el contrato:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   GET /api/contracts
 * @desc    Obtener todos los contratos de un usuario (cliente o proveedor)
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
    try {
        const { id, roles } = req.user;
        let query = `
            SELECT 
                ct.id_contract, ct.agreed_hours, ct.agreed_price, ct.status, ct.offer_date,
                s.name as service_name,
                u_client.full_name as client_name,
                u_provider.full_name as provider_name
            FROM contracts ct
            JOIN services s ON ct.id_service = s.id_service
            JOIN clients c ON ct.id_client = c.id_client
            JOIN users u_client ON c.id_user = u_client.id_user
            JOIN providers p ON s.id_provider = p.id_provider
            JOIN users u_provider ON p.id_user = u_provider.id_user
        `;
        let params = [];
        if (roles.includes('provider')) {
            const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id]);
            if (providerRows.length > 0) {
                query += ' WHERE s.id_provider = ?';
                params.push(providerRows[0].id_provider);
            }
        } else if (roles.includes('client')) {
            const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id]);
            if (clientRows.length > 0) {
                query += ' WHERE ct.id_client = ?';
                params.push(clientRows[0].id_client);
            }
        } else {
            return res.status(403).json({ error: 'Usuario sin rol válido.' });
        }
        query += ' ORDER BY ct.offer_date DESC';
        const [contracts] = await pool.query(query, params);
        res.json(contracts);
    } catch (error) {
        console.error("Error al obtener contratos:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   PATCH /api/contracts/:id/respond
 * @desc    Un proveedor acepta o rechaza una oferta
 * @access  Private (Solo Proveedores)
 */
router.patch('/:id/respond', protect, async (req, res) => {
    try {
        const { id: contractId } = req.params;
        const { action } = req.body;
        const { id: userId } = req.user;

        if (action !== 'accepted' && action !== 'denied') {
            return res.status(400).json({ error: 'Acción no válida.' });
        }

        const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [userId]);
        if (providerRows.length === 0) {
            return res.status(403).json({ error: 'Solo los proveedores pueden responder.' });
        }
        const id_provider = providerRows[0].id_provider;

        const [contractCheck] = await pool.query(
            `SELECT * FROM contracts JOIN services ON contracts.id_service = services.id_service
             WHERE contracts.id_contract = ? AND services.id_provider = ?`,
            [contractId, id_provider]
        );
        if (contractCheck.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para modificar este contrato.' });
        }
        if (contractCheck[0].status !== 'pending') {
            return res.status(400).json({ error: 'Esta oferta ya ha sido respondida.' });
        }

        await pool.query('UPDATE contracts SET status = ?, response_date = NOW() WHERE id_contract = ?', [action, contractId]);
        res.json({ message: `Oferta ${action === 'accepted' ? 'aceptada' : 'rechazada'} con éxito.` });
    } catch (error) {
        console.error("Error al responder a la oferta:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

module.exports = router;