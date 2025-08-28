const express = require('express');
const router = express.Router();
const pool = require("../models/db.js");

//get general de reviews por id de servicio
router.get('/:id_service', async (req, res) => {
    try {
        const { id_service } = req.params;
        let [result] = await pool.query(`SELECT r.stars, r.description, r.created_at, u.full_name FROM reviews r
            INNER JOIN services s ON r.id_service = s.id_service
            INNER JOIN clients c ON c.id_client = r.id_client
            INNER JOIN users u ON u.id_user = c.id_user
            WHERE r.id_service = ?
            ORDER BY r.created_at DESC`, [id_service]);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las reseñas', details: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { id_service, id_client, stars, description } = req.body;
        
        // Validar que se reciban todos los campos necesarios
        if (!id_service || !id_client || stars === undefined || !description) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }

        // Insertar la nueva reseña en la base de datos
        const [result] = await pool.query(`INSERT INTO reviews (id_service, id_client, stars, description) VALUES (?, ?, ?, ?)`,
            [id_service, id_client, stars, description]);

        res.status(201).json({ message: 'Reseña creada exitosamente', reviewId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la reseña', details: error.message });
    }
});

module.exports = router;