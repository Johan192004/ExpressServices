const express = require('express');
const router = express.Router();
const pool = require("../models/db.js");


router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;

        let [result] = await pool.query(`SELECT u.personal_picture, p.name AS provider_name,s.id_service,s.name,s.description,s.hour_price,s.creation_date,s.experience_years FROM clients c
            INNER JOIN favorites f ON f.id_client=c.id_client
            INNER JOIN services s ON f.id_service=s.id_service
            INNER JOIN providers p ON s.id_provider=p.id_provider
            INNER JOIN users u ON c.id_user=u.id_user
            WHERE c.id_client=?`,[id]);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los servicios favoritos', details: error.message });
    }
});

module.exports = router;