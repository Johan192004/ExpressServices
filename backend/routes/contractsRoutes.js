// backend/routes/contractsRoutes.js

const express = require('express');
const router = express.Router();
const pool = require('../models/db.js');
const { protect } = require('../middleware/authMiddleware.js');

/**
 * @route   POST /api/contracts
 * @desc    A client creates a contract offer for a service
 * @access  Private (Clients only)
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
    console.error("Error creating contract:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   GET /api/contracts
 * @desc    Get all contracts for the current user (client or provider)
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
    try {
        const { id, roles } = req.user;
        const { selected_rol } = req.query;
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
            // User with both roles
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
                // If selected_rol not provided, show all user's contracts
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
            // User with a single role
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
    console.error("Error fetching contracts:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   GET /api/contracts/history
 * @desc    Get completed contracts (both parties marked completed) for the current user
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

    // Filter by user's ownership
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
    console.error('Error fetching contract history:', error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   PATCH /api/contracts/:id/respond
 * @desc    A provider accepts or rejects an offer
 * @access  Private (Providers only)
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
    console.error("Error responding to offer:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   PATCH /api/contracts/:id/complete
 * @desc    A client or provider marks an accepted contract as completed
 * @access  Private
 */
router.patch('/:id/complete', protect, async (req, res) => {
    try {
        const { id: contractId } = req.params;
        const { id: userId, roles } = req.user;

    // 1. Fetch contract and verify user ownership
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

    // 2. Determine which column to update based on user role
        let columnToUpdate = '';
        if (isClient) {
            columnToUpdate = 'client_marked_completed';
        } else if (isProvider) {
            columnToUpdate = 'provider_marked_completed';
        }

    // 3. Update the contract
        const updateQuery = `UPDATE contracts SET ${columnToUpdate} = NOW() WHERE id_contract = ?`;
        await pool.query(updateQuery, [contractId]);

        res.json({ message: '¡Servicio marcado como completado! Esperando la confirmación de la otra parte.' });

    } catch (error) {
    console.error("Error marking contract as completed:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


/**
 * @route   DELETE /api/contracts/:id
 * @desc    Hide a contract from the user's view (does not physically delete)
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
    try {
        const { id: contractId } = req.params;
        const { id: userId } = req.user;

    // 1. Fetch contract and verify user ownership
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
            // Do not send "not found" to avoid leaking info; return permission error instead.
            return res.status(403).json({ error: 'No tienes permiso para eliminar este contrato.' });
        }

        const contract = contractRows[0];
        const isClient = userId === contract.client_user_id;
        const isProvider = userId === contract.provider_user_id;

        if (!isClient && !isProvider) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar este contrato.' });
        }

    // 2. Check if contract can be hidden
        const isDenied = contract.status === 'denied';
        const isCompletedByBoth = contract.client_marked_completed !== null && contract.provider_marked_completed !== null;

        if (!isDenied && !isCompletedByBoth) {
            return res.status(400).json({ error: 'Este contrato no puede ser eliminado en su estado actual.' });
        }

    // 3. Mark the contract as hidden for the corresponding role
        if (isClient) {
            await pool.query('UPDATE contracts SET hidden_by_client = TRUE WHERE id_contract = ?', [contractId]);
            res.json({ message: 'Contrato ocultado de tu vista de cliente.' });
        } else if (isProvider) {
            await pool.query('UPDATE contracts SET hidden_by_provider = TRUE WHERE id_contract = ?', [contractId]);
            res.json({ message: 'Contrato ocultado de tu vista de proveedor.' });
        }

    } catch (error) {
    console.error("Error hiding contract:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   PATCH /api/contracts/:id/hide
 * @desc    Provider hides a contract from their view (does not delete)
 * @access  Private (Providers only)
 */
router.patch('/:id/hide', protect, async (req, res) => {
    try {
        const contractId = req.params.id;
        const id_user = req.user.id;

     // Verify user is a provider
        const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id_user]);
        if (providerRows.length === 0) {
            return res.status(403).json({ error: 'Solo los proveedores pueden ocultar contratos.' });
        }
        const id_provider = providerRows[0].id_provider;

     // Verify the contract exists and belongs to this provider
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

     // Mark the contract as hidden for the provider
        await pool.query(
            'UPDATE contracts SET hidden_by_provider = TRUE WHERE id_contract = ?',
            [contractId]
        );

        res.json({ message: 'Contrato ocultado de tu vista exitosamente.' });

    } catch (error) {
     console.error("Error hiding contract:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   PATCH /api/contracts/:id/show
 * @desc    Provider restores a previously hidden contract in their view
 * @access  Private (Providers only)
 */
router.patch('/:id/show', protect, async (req, res) => {
    try {
        const contractId = req.params.id;
        const id_user = req.user.id;

     // Verify user is a provider
        const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id_user]);
        if (providerRows.length === 0) {
            return res.status(403).json({ error: 'Solo los proveedores pueden restaurar contratos.' });
        }
        const id_provider = providerRows[0].id_provider;

     // Verify the contract exists and belongs to this provider
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

     // Mark the contract as visible for the provider
        await pool.query(
            'UPDATE contracts SET hidden_by_provider = FALSE WHERE id_contract = ?',
            [contractId]
        );

        res.json({ message: 'Contrato restaurado en tu vista exitosamente.' });

    } catch (error) {
     console.error("Error restoring contract:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   PATCH /api/contracts/:id/hide-client
 * @desc    Client hides a contract from their view (does not delete)
 * @access  Private (Clients only)
 */
router.patch('/:id/hide-client', protect, async (req, res) => {
    try {
        const contractId = req.params.id;
        const id_user = req.user.id;

     // Verify user is a client
        const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id_user]);
        if (clientRows.length === 0) {
            return res.status(403).json({ error: 'Solo los clientes pueden ocultar contratos.' });
        }
        const id_client = clientRows[0].id_client;

     // Verify the contract exists and belongs to this client
        const [contractRows] = await pool.query(
            `SELECT c.* 
             FROM contracts c 
             WHERE c.id_contract = ? AND c.id_client = ?`,
            [contractId, id_client]
        );

        if (contractRows.length === 0) {
            return res.status(404).json({ error: 'Contrato no encontrado o no tienes permisos para ocultarlo.' });
        }

     // Mark the contract as hidden for the client
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

    // Verify user is a client
        const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id_user]);
        if (clientRows.length === 0) {
            return res.status(403).json({ error: 'Solo los clientes pueden restaurar contratos.' });
        }
        const id_client = clientRows[0].id_client;

    // Verify the contract exists and belongs to this client
        const [contractRows] = await pool.query(
            `SELECT c.* 
             FROM contracts c 
             WHERE c.id_contract = ? AND c.id_client = ?`,
            [contractId, id_client]
        );

        if (contractRows.length === 0) {
            return res.status(404).json({ error: 'Contrato no encontrado o no tienes permisos para restaurarlo.' });
        }

    // Mark the contract as visible for the client
        await pool.query(
            'UPDATE contracts SET hidden_by_client = FALSE WHERE id_contract = ?',
            [contractId]
        );

        res.json({ message: 'Contrato restaurado en tu vista exitosamente.' });

    } catch (error) {
    console.error("Error restoring contract:", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   GET /api/contracts/hidden
 * @desc    Get contracts hidden by the provider
 * @access  Private (Providers only)
 */
router.get('/hidden', protect, async (req, res) => {
    try {
        const id_user = req.user.id;

     // Verify user is a provider
        const [providerRows] = await pool.query('SELECT id_provider FROM providers WHERE id_user = ?', [id_user]);
        if (providerRows.length === 0) {
            return res.status(403).json({ error: 'Solo los proveedores pueden ver contratos ocultos.' });
        }
        const id_provider = providerRows[0].id_provider;

     // Get provider's hidden contracts
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
     console.error("Error fetching hidden contracts (provider):", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});

/**
 * @route   GET /api/contracts/hidden-client
 * @desc    Get contracts hidden by the client
 * @access  Private (Clients only)
 */
router.get('/hidden-client', protect, async (req, res) => {
    try {
        const id_user = req.user.id;

     // Verify user is a client
        const [clientRows] = await pool.query('SELECT id_client FROM clients WHERE id_user = ?', [id_user]);
        if (clientRows.length === 0) {
            return res.status(403).json({ error: 'Solo los clientes pueden ver contratos ocultos.' });
        }
        const id_client = clientRows[0].id_client;

     // Get client's hidden contracts
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
     console.error("Error fetching hidden contracts (client):", error);
        res.status(500).json({ error: 'Error en el servidor.' });
    }
});


module.exports = router;