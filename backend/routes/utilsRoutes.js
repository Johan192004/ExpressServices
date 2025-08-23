// backend/routes/utilsRoutes.js
const express = require('express');
const router = express.Router();
const { colombianCities } = require('../utils/locations.js');

// Endpoint para obtener la lista de ciudades
// GET /api/utils/cities
router.get('/cities', (req, res) => {
    // Ordenamos alfabéticamente para una mejor UX en el frontend
    const sortedCities = [...colombianCities].sort();
    res.json(sortedCities);
});

module.exports = router;