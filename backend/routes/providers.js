const express = require('express');
const router = express.Router();
const pool = require("../models/db.js");


router.get('/:id', async (req, res) => {
    try {

        const { id } = req.params;
        let [result] = await pool.query(`SELECT u.full_name, u.email, u.phone_number, u.personal_picture, u.bio FROM providers p 
            INNER JOIN users u ON p.id_user = u.id_user WHERE p.id_provider = ?`, [id]);

        res.status(200).json(result);
    } catch (error) {
    res.status(500).json({ error: 'Error al obtener los proveedores', details: error.message });
    }
});

router.put('/:id_provider', async (req, res) => {
    const { id_provider } = req.params;
    const { full_name, phone_number, personal_picture, bio } = req.body;

    try {
        let [result] = await pool.query(`UPDATE users SET full_name = ?, phone_number = ?, personal_picture = ?, bio = ? WHERE id_user = (SELECT id_user FROM providers WHERE id_provider = ?)`, [full_name, phone_number, personal_picture, bio, id_provider]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        res.status(200).json({ message: 'Proveedor actualizado con éxito' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el proveedor', details: error.message });
    }
});

module.exports = router;