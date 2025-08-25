const express = require('express');
const router = express.Router();
const pool = require("../models/db.js");


router.get('/', async (req, res) => {
    try {

        let [result] = await pool.query(`SELECT * FROM categories`);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las categorías', details: error.message });
    }
});

module.exports = router;