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
        const { selected_rol } = req.query;
        console.log('req.user:', req.user);
        console.log('req.query:', req.query);
        console.log('selected_rol:', selected_rol);
        let query = `
            SELECT 
                ct.id_contract, ct.agreed_hours, ct.agreed_price, ct.status, ct.offer_date,
                ct.client_marked_completed, ct.provider_marked_completed,
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
        if (roles.includes('provider') && roles.includes('client')) {
            // Usuario con ambos roles
            if (selected_rol === "client") {
                const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id]);
                if (clientRows.length > 0) {
                    query += ' WHERE ct.id_client = ?';
                    params.push(clientRows[0].id_client);
                }
            } else if (selected_rol === "provider") {
                const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id]);
                if (providerRows.length > 0) {
                    query += ' WHERE s.id_provider = ?';
                    params.push(providerRows[0].id_provider);
                }
            } else {
                // Si no se especifica selected_rol, mostrar todos los contratos del usuario
                const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id]);
                const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id]);
                
                if (clientRows.length > 0 && providerRows.length > 0) {
                    query += ' WHERE (ct.id_client = ? OR s.id_provider = ?)';
                    params.push(clientRows[0].id_client, providerRows[0].id_provider);
                } else if (clientRows.length > 0) {
                    query += ' WHERE ct.id_client = ?';
                    params.push(clientRows[0].id_client);
                } else if (providerRows.length > 0) {
                    query += ' WHERE s.id_provider = ?';
                    params.push(providerRows[0].id_provider);
                }
            }
        } else {
            // Usuario con un solo rol
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

/**
 * @route   PATCH /api/contracts/:id/complete
 * @desc    Un cliente o proveedor marca un contrato aceptado como completado
 * @access  Private
 */
router.patch('/:id/complete', protect, async (req, res) => {
    try {
        const { id: contractId } = req.params;
        const { id: userId, roles } = req.user;

        // 1. Obtener el contrato y verificar la pertenencia del usuario
        const [contractRows] = await pool.query(
            `SELECT 
                ct.status, ct.id_client, s.id_provider,
                c.id_user as client_user_id, p.id_user as provider_user_id
             FROM contracts ct
             JOIN services s ON ct.id_service = s.id_service
             JOIN clients c ON ct.id_client = c.id_client
             JOIN providers p ON s.id_provider = p.id_provider
             WHERE ct.id_contract = ?`,
            [contractId]
        );

        if (contractRows.length === 0) {
            return res.status(404).json({ error: 'Contrato no encontrado.' });
        }

        const contract = contractRows[0];
        const isClient = userId === contract.client_user_id;
        const isProvider = userId === contract.provider_user_id;

        if (!isClient && !isProvider) {
            return res.status(403).json({ error: 'No tienes permiso para modificar este contrato.' });
        }
        
        if (contract.status !== 'accepted') {
            return res.status(400).json({ error: 'Solo se pueden completar los contratos aceptados.' });
        }

        // 2. Determinar qué columna actualizar según el rol del usuario
        let columnToUpdate = '';
        if (isClient) {
            columnToUpdate = 'client_marked_completed';
        } else if (isProvider) {
            columnToUpdate = 'provider_marked_completed';
        }

        // 3. Actualizar el contrato
        const updateQuery = `UPDATE contracts SET ${columnToUpdate} = NOW() WHERE id_contract = ?`;
        await pool.query(updateQuery, [contractId]);

        res.json({ message: '¡Servicio marcado como completado! Esperando la confirmación de la otra parte.' });

    } catch (error) {
        console.error("Error al marcar el contrato como completado:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


/**
 * @route   DELETE /api/contracts/:id
 * @desc    Elimina un contrato (si está rechazado o si ambas partes lo marcaron como completado)
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
    try {
        const { id: contractId } = req.params;
        const { id: userId } = req.user;

        // 1. Obtener el contrato y verificar la pertenencia del usuario
        const [contractRows] = await pool.query(
            `SELECT 
                ct.status, ct.client_marked_completed, ct.provider_marked_completed,
                c.id_user as client_user_id, p.id_user as provider_user_id
             FROM contracts ct
             JOIN services s ON ct.id_service = s.id_service
             JOIN clients c ON ct.id_client = c.id_client
             JOIN providers p ON s.id_provider = p.id_provider
             WHERE ct.id_contract = ?`,
            [contractId]
        );

        if (contractRows.length === 0) {
            // No enviar "no encontrado" para no dar pistas, solo un error de permiso.
            return res.status(403).json({ error: 'No tienes permiso para eliminar este contrato.' });
        }

        const contract = contractRows[0];
        const isClient = userId === contract.client_user_id;
        const isProvider = userId === contract.provider_user_id;

        if (!isClient && !isProvider) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar este contrato.' });
        }

        // 2. Comprobar si el contrato se puede eliminar
        const isDenied = contract.status === 'denied';
        const isCompletedByBoth = contract.client_marked_completed !== null && contract.provider_marked_completed !== null;

        if (!isDenied && !isCompletedByBoth) {
            return res.status(400).json({ error: 'Este contrato no puede ser eliminado en su estado actual.' });
        }

        // 3. Eliminar el contrato
        await pool.query('DELETE FROM contracts WHERE id_contract = ?', [contractId]);

        res.json({ message: 'Contrato eliminado con éxito.' });

    } catch (error) {
        console.error("Error al eliminar el contrato:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


module.exports = router;