const express = require('express');
const router = express.Router();
const pool = require("../models/db.js");


router.get('/:id_client', async (req, res) => {
    try {
        const id_client = req.params.id_client;

        let [result] = await pool.query(`SELECT u.personal_picture, u.full_name AS provider_name,s.id_service,s.name,s.description,s.hour_price,s.creation_date,s.experience_years,f.id_service, cat.title as category_title FROM clients c
            INNER JOIN favorites f ON f.id_client=c.id_client
            INNER JOIN services s ON f.id_service=s.id_service
            INNER JOIN providers p ON s.id_provider=p.id_provider
            INNER JOIN users u ON p.id_user=u.id_user
            INNER JOIN categories cat ON s.id_category=cat.id_category
            WHERE c.id_client=?`,[id_client]);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los servicios favoritos', details: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { id_client, id_service } = req.body;
        if (!id_client || !id_service) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }

        // Verificar si el servicio ya está en favoritos
        let [existing] = await pool.query(`SELECT * FROM favorites WHERE id_client=? AND id_service=?`, [id_client, id_service]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'El servicio ya está en favoritos' });
        }

        // Agregar a favoritos
        await pool.query(`INSERT INTO favorites (id_client, id_service) VALUES (?, ?)`, [id_client, id_service]);
        res.status(201).json({ message: 'Servicio agregado a favoritos' });
    } catch (error) {
        res.status(500).json({ error: 'Error al agregar a favoritos', details: error.message });
    }
});

router.delete('/:id_client/:id_service', async (req, res) => {
    try {
        const { id_client, id_service } = req.params;
        if (!id_client || !id_service) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }

        // Verificar si el servicio está en favoritos
        let [existing] = await pool.query(`SELECT * FROM favorites WHERE id_client=? AND id_service=?`, [id_client, id_service]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'El servicio no está en favoritos' });
        }

        // Eliminar de favoritos
        await pool.query(`DELETE FROM favorites WHERE id_client=? AND id_service=?`, [id_client, id_service]);
        res.status(200).json({ message: 'Servicio eliminado de favoritos' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar de favoritos', details: error.message });
    }
});

module.exports = router;