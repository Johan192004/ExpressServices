const express = require('express');
const router = express.Router();
const pool = require("../models/db.js");


router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let [result] = await pool.query(`SELECT u.email, u.full_name FROM clients c
            INNER JOIN users u ON c.id_user = u.id_user WHERE c.id_client = ?`, [id]);

        res.status(200).json(result);
    } catch (error) {
    res.status(500).json({ error: 'Error al obtener los clientes', details: error.message });
    }
});

router.put('/:id_client', async (req, res) => {
    const { id_client } = req.params;
    const { full_name } = req.body;

    try {
        let [result] = await pool.query(`UPDATE users SET full_name = ? WHERE id_user = (SELECT id_user FROM clients WHERE id_client = ?)`, [full_name, id_client]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.status(200).json({ message: 'Cliente actualizado con éxito' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el cliente', details: error.message });
    }
});

module.exports = router;