const express = require('express');
const router = express.Router();
const { colombianCities } = require('../utils/locations.js');

// Endpoint to get the list of cities
// GET /api/utils/cities
router.get('/cities', (req, res) => {
    // Sort alphabetically
    const sortedCities = [...colombianCities].sort();
    res.json(sortedCities);
});

module.exports = router;