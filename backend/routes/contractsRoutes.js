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
                s.id_service, s.name as service_name,
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
                    query += ' WHERE ct.id_client = ? AND (ct.hidden_by_client IS NULL OR ct.hidden_by_client = FALSE)';
                    params.push(clientRows[0].id_client);
                }
            } else if (selected_rol === "provider") {
                const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id]);
                if (providerRows.length > 0) {
                    query += ' WHERE s.id_provider = ? AND (ct.hidden_by_provider IS NULL OR ct.hidden_by_provider = FALSE)';
                    params.push(providerRows[0].id_provider);
                }
            } else {
                // Si no se especifica selected_rol, mostrar todos los contratos del usuario
                const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id]);
                const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id]);
                
                if (clientRows.length > 0 && providerRows.length > 0) {
                    query += ' WHERE ((ct.id_client = ? AND (ct.hidden_by_client IS NULL OR ct.hidden_by_client = FALSE)) OR (s.id_provider = ? AND (ct.hidden_by_provider IS NULL OR ct.hidden_by_provider = FALSE)))';
                    params.push(clientRows[0].id_client, providerRows[0].id_provider);
                } else if (clientRows.length > 0) {
                    query += ' WHERE ct.id_client = ? AND (ct.hidden_by_client IS NULL OR ct.hidden_by_client = FALSE)';
                    params.push(clientRows[0].id_client);
                } else if (providerRows.length > 0) {
                    query += ' WHERE s.id_provider = ? AND (ct.hidden_by_provider IS NULL OR ct.hidden_by_provider = FALSE)';
                    params.push(providerRows[0].id_provider);
                }
            }
        } else {
            // Usuario con un solo rol
            if (roles.includes('provider')) {
                const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id]);
                if (providerRows.length > 0) {
                    query += ' WHERE s.id_provider = ? AND (ct.hidden_by_provider IS NULL OR ct.hidden_by_provider = FALSE)';
                    params.push(providerRows[0].id_provider);
                }
            } else if (roles.includes('client')) {
                const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id]);
                if (clientRows.length > 0) {
                    query += ' WHERE ct.id_client = ? AND (ct.hidden_by_client IS NULL OR ct.hidden_by_client = FALSE)';
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
 * @route   GET /api/contracts/history
 * @desc    Obtener contratos completados (ambas partes marcaron completado) del usuario actual
 * @access  Private
 */
router.get('/history', protect, async (req, res) => {
    try {
        const { id, roles } = req.user;
        const { selected_rol } = req.query; // opcional: 'client' | 'provider'

    let baseSelect = `
            SELECT 
                ct.id_contract, ct.agreed_hours, ct.agreed_price, ct.status,
                ct.client_marked_completed, ct.provider_marked_completed,
                GREATEST(ct.client_marked_completed, ct.provider_marked_completed) AS completed_date,
                UNIX_TIMESTAMP(GREATEST(ct.client_marked_completed, ct.provider_marked_completed)) AS completed_date_unix,
                DATE_FORMAT(CONVERT_TZ(GREATEST(ct.client_marked_completed, ct.provider_marked_completed), @@session.time_zone, '-05:00'), '%Y-%m-%dT%H:%i:%s-05:00') AS completed_date_co_iso,
                s.id_service, s.name as service_name,
                u_client.full_name as client_name,
                u_provider.full_name as provider_name
            FROM contracts ct
            JOIN services s ON ct.id_service = s.id_service
            JOIN clients c ON ct.id_client = c.id_client
            JOIN users u_client ON c.id_user = u_client.id_user
            JOIN providers p ON s.id_provider = p.id_provider
            JOIN users u_provider ON p.id_user = u_provider.id_user
            WHERE ct.client_marked_completed IS NOT NULL 
              AND ct.provider_marked_completed IS NOT NULL
        `;
        let params = [];

        // Filtrado por pertenencia del usuario
        if (roles.includes('provider') && roles.includes('client')) {
            if (selected_rol === 'client') {
                const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id]);
                if (clientRows.length > 0) {
                    baseSelect += ' AND ct.id_client = ?';
                    params.push(clientRows[0].id_client);
                }
            } else if (selected_rol === 'provider') {
                const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id]);
                if (providerRows.length > 0) {
                    baseSelect += ' AND s.id_provider = ?';
                    params.push(providerRows[0].id_provider);
                }
            } else {
                const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id]);
                const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id]);
                if (clientRows.length > 0 && providerRows.length > 0) {
                    baseSelect += ' AND (ct.id_client = ? OR s.id_provider = ?)';
                    params.push(clientRows[0].id_client, providerRows[0].id_provider);
                } else if (clientRows.length > 0) {
                    baseSelect += ' AND ct.id_client = ?';
                    params.push(clientRows[0].id_client);
                } else if (providerRows.length > 0) {
                    baseSelect += ' AND s.id_provider = ?';
                    params.push(providerRows[0].id_provider);
                }
            }
        } else if (roles.includes('provider')) {
            const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id]);
            if (providerRows.length > 0) {
                baseSelect += ' AND s.id_provider = ?';
                params.push(providerRows[0].id_provider);
            }
        } else if (roles.includes('client')) {
            const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id]);
            if (clientRows.length > 0) {
                baseSelect += ' AND ct.id_client = ?';
                params.push(clientRows[0].id_client);
            }
        } else {
            return res.status(403).json({ error: 'Usuario sin rol válido.' });
        }

        baseSelect += ' ORDER BY completed_date DESC';
        const [rows] = await pool.query(baseSelect, params);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener historial de contratos:', error);
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
 * @desc    Oculta un contrato de la vista del usuario (no lo elimina físicamente)
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

        // 3. Marcar el contrato como oculto para el rol correspondiente
        if (isClient) {
            await pool.query('UPDATE contracts SET hidden_by_client = TRUE WHERE id_contract = ?', [contractId]);
            res.json({ message: 'Contrato ocultado de tu vista de cliente.' });
        } else if (isProvider) {
            await pool.query('UPDATE contracts SET hidden_by_provider = TRUE WHERE id_contract = ?', [contractId]);
            res.json({ message: 'Contrato ocultado de tu vista de proveedor.' });
        }

    } catch (error) {
        console.error("Error al ocultar el contrato:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   PATCH /api/contracts/:id/hide
 * @desc    Proveedor oculta un contrato de su vista (no lo elimina)
 * @access  Private (Solo Proveedores)
 */
router.patch('/:id/hide', protect, async (req, res) => {
    try {
        const contractId = req.params.id;
        const id_user = req.user.id;

        // Verificar que el usuario es un proveedor
        const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id_user]);
        if (providerRows.length === 0) {
            return res.status(403).json({ error: 'Solo los proveedores pueden ocultar contratos.' });
        }
        const id_provider = providerRows[0].id_provider;

        // Verificar que el contrato existe y pertenece a este proveedor
        const [contractRows] = await pool.query(
            `SELECT c.*, s.id_provider 
             FROM contracts c 
             JOIN services s ON c.id_service = s.id_service 
             WHERE c.id_contract = ? AND s.id_provider = ?`,
            [contractId, id_provider]
        );

        if (contractRows.length === 0) {
            return res.status(404).json({ error: 'Contrato no encontrado o no tienes permisos para ocultarlo.' });
        }

        // Marcar el contrato como oculto para el proveedor
        await pool.query(
            'UPDATE contracts SET hidden_by_provider = TRUE WHERE id_contract = ?',
            [contractId]
        );

        res.json({ message: 'Contrato ocultado de tu vista exitosamente.' });

    } catch (error) {
        console.error("Error al ocultar el contrato:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   PATCH /api/contracts/:id/show
 * @desc    Proveedor restaura un contrato oculto en su vista
 * @access  Private (Solo Proveedores)
 */
router.patch('/:id/show', protect, async (req, res) => {
    try {
        const contractId = req.params.id;
        const id_user = req.user.id;

        // Verificar que el usuario es un proveedor
        const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id_user]);
        if (providerRows.length === 0) {
            return res.status(403).json({ error: 'Solo los proveedores pueden restaurar contratos.' });
        }
        const id_provider = providerRows[0].id_provider;

        // Verificar que el contrato existe y pertenece a este proveedor
        const [contractRows] = await pool.query(
            `SELECT c.*, s.id_provider 
             FROM contracts c 
             JOIN services s ON c.id_service = s.id_service 
             WHERE c.id_contract = ? AND s.id_provider = ?`,
            [contractId, id_provider]
        );

        if (contractRows.length === 0) {
            return res.status(404).json({ error: 'Contrato no encontrado o no tienes permisos para restaurarlo.' });
        }

        // Marcar el contrato como visible para el proveedor
        await pool.query(
            'UPDATE contracts SET hidden_by_provider = FALSE WHERE id_contract = ?',
            [contractId]
        );

        res.json({ message: 'Contrato restaurado en tu vista exitosamente.' });

    } catch (error) {
        console.error("Error al restaurar el contrato:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   PATCH /api/contracts/:id/hide-client
 * @desc    Cliente oculta un contrato de su vista (no lo elimina)
 * @access  Private (Solo Clientes)
 */
router.patch('/:id/hide-client', protect, async (req, res) => {
    try {
        const contractId = req.params.id;
        const id_user = req.user.id;

        // Verificar que el usuario es un cliente
        const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id_user]);
        if (clientRows.length === 0) {
            return res.status(403).json({ error: 'Solo los clientes pueden ocultar contratos.' });
        }
        const id_client = clientRows[0].id_client;

        // Verificar que el contrato existe y pertenece a este cliente
        const [contractRows] = await pool.query(
            `SELECT c.* 
             FROM contracts c 
             WHERE c.id_contract = ? AND c.id_client = ?`,
            [contractId, id_client]
        );

        if (contractRows.length === 0) {
            return res.status(404).json({ error: 'Contrato no encontrado o no tienes permisos para ocultarlo.' });
        }

        // Marcar el contrato como oculto para el cliente
        await pool.query(
            'UPDATE contracts SET hidden_by_client = TRUE WHERE id_contract = ?',
            [contractId]
        );

        res.json({ message: 'Contrato ocultado de tu vista exitosamente.' });

    } catch (error) {
        console.error("Error al ocultar el contrato:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   PATCH /api/contracts/:id/show-client
 * @desc    Cliente restaura un contrato oculto en su vista
 * @access  Private (Solo Clientes)
 */
router.patch('/:id/show-client', protect, async (req, res) => {
    try {
        const contractId = req.params.id;
        const id_user = req.user.id;

        // Verificar que el usuario es un cliente
        const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id_user]);
        if (clientRows.length === 0) {
            return res.status(403).json({ error: 'Solo los clientes pueden restaurar contratos.' });
        }
        const id_client = clientRows[0].id_client;

        // Verificar que el contrato existe y pertenece a este cliente
        const [contractRows] = await pool.query(
            `SELECT c.* 
             FROM contracts c 
             WHERE c.id_contract = ? AND c.id_client = ?`,
            [contractId, id_client]
        );

        if (contractRows.length === 0) {
            return res.status(404).json({ error: 'Contrato no encontrado o no tienes permisos para restaurarlo.' });
        }

        // Marcar el contrato como visible para el cliente
        await pool.query(
            'UPDATE contracts SET hidden_by_client = FALSE WHERE id_contract = ?',
            [contractId]
        );

        res.json({ message: 'Contrato restaurado en tu vista exitosamente.' });

    } catch (error) {
        console.error("Error al restaurar el contrato:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   GET /api/contracts/hidden
 * @desc    Obtener contratos ocultos por el proveedor
 * @access  Private (Solo Proveedores)
 */
router.get('/hidden', protect, async (req, res) => {
    try {
        const id_user = req.user.id;

        // Verificar que el usuario es un proveedor
        const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id_user]);
        if (providerRows.length === 0) {
            return res.status(403).json({ error: 'Solo los proveedores pueden ver contratos ocultos.' });
        }
        const id_provider = providerRows[0].id_provider;

        // Obtener contratos ocultos del proveedor
        const [contracts] = await pool.query(
            `SELECT 
                c.id_contract,
                c.agreed_hours,
                c.agreed_price,
                c.status,
                c.client_marked_completed,
                c.provider_marked_completed,
                c.created_at,
                s.service_name,
                s.id_service,
                cl.full_name as client_name
             FROM contracts c
             JOIN services s ON c.id_service = s.id_service
             JOIN clients client ON c.id_client = client.id_client
             JOIN users cl ON client.id_user = cl.id_user
             WHERE s.id_provider = ? AND c.hidden_by_provider = TRUE
             ORDER BY c.created_at DESC`,
            [id_provider]
        );

        res.json(contracts);

    } catch (error) {
        console.error("Error al obtener contratos ocultos:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   GET /api/contracts/hidden-client
 * @desc    Obtener contratos ocultos por el cliente
 * @access  Private (Solo Clientes)
 */
router.get('/hidden-client', protect, async (req, res) => {
    try {
        const id_user = req.user.id;

        // Verificar que el usuario es un cliente
        const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id_user]);
        if (clientRows.length === 0) {
            return res.status(403).json({ error: 'Solo los clientes pueden ver contratos ocultos.' });
        }
        const id_client = clientRows[0].id_client;

        // Obtener contratos ocultos del cliente
        const [contracts] = await pool.query(
            `SELECT 
                c.id_contract,
                c.agreed_hours,
                c.agreed_price,
                c.status,
                c.client_marked_completed,
                c.provider_marked_completed,
                c.created_at,
                s.service_name,
                s.id_service,
                pr.full_name as provider_name
             FROM contracts c
             JOIN services s ON c.id_service = s.id_service
             JOIN providers provider ON s.id_provider = provider.id_provider
             JOIN users pr ON provider.id_user = pr.id_user
             WHERE c.id_client = ? AND c.hidden_by_client = TRUE
             ORDER BY c.created_at DESC`,
            [id_client]
        );

        res.json(contracts);

    } catch (error) {
        console.error("Error al obtener contratos ocultos:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


module.exports = router;