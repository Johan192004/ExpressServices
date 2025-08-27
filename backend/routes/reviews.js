const express = require('express');
const router = express.Router();
const pool = require("../models/db.js");

//get general de reviews por id de servicio
router.get('/:id_service', async (req, res) => {
    try {
        const { id_service } = req.params;
        let [result] = await pool.query(`SELECT r.stars, r.description, u.full_name FROM reviews r
            INNER JOIN services s ON r.id_service = s.id_service
            INNER JOIN clients c ON c.id_client = r.id_client
            INNER JOIN users u ON u.id_user = c.id_user
            WHERE r.id_service = ?`, [id_service]);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las reseñas', details: error.message });
    }
});

module.exports = router;