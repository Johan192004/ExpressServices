const express = require("express");
const router = express.Router();
const pool = require("../models/db.js"); 
const bcrypt = require("bcryptjs");
const { body, validationResult } = require('express-validator');
const { colombianCities } = require('../utils/locations.js');

// ------------------- REGLAS DE VALIDACIÓN -------------------

// 1. Reglas de validación para el registro de Clientes (mínimas)
const clientValidationRules = [
    // --- LÍNEA MODIFICADA ---
    body('full_name', 'El nombre no es válido')
        .not().isEmpty().withMessage('El nombre completo es obligatorio')
        .trim()
        .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres')
        .matches(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/).withMessage('El nombre solo puede contener letras y espacios')
        .matches(/\s/).withMessage('Debes ingresar al menos un nombre y un apellido')
        .escape(),
    body('email', 'El correo electrónico no es válido').isEmail().normalizeEmail(),
    body('password', 'La contraseña debe tener al menos 8 caracteres').isLength({ min: 8 })
];

// Reglas de validación para el registro de Proveedores
const providerValidationRules = [
    body('full_name', 'El nombre no es válido')
        .not().isEmpty().withMessage('El nombre completo es obligatorio')
        .trim()
        .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres')
        .matches(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/).withMessage('El nombre solo puede contener letras y espacios')
        .matches(/\s/).withMessage('Debes ingresar al menos un nombre y un apellido')
        .escape(),
    
    // REGLA MEJORADA
    body('email', 'El correo electrónico no es válido')
        .isEmail().withMessage('Debe ser un formato de correo válido')
        .normalizeEmail()
        .custom(async (value) => {
            // Verificamos si el email ya existe en la DB
            const [rows] = await pool.query('SELECT email FROM users WHERE email = ?', [value]);
            if (rows.length > 0) {
                return Promise.reject('El correo electrónico ya está en uso.');
            }
        }),

    body('password', 'La contraseña debe tener al menos 8 caracteres').isLength({ min: 8 }),
    
    // REGLA MEJORADA
    body('phone_number', 'El número de teléfono no es válido')
        .trim()
        .isNumeric().withMessage('El teléfono solo puede contener números')
        .isLength({ min: 10, max: 10 }).withMessage('El número de teléfono debe tener 10 dígitos'),

// REGLA MEJORADA Y MÁS FLEXIBLE
body('city', 'La ciudad no es válida')
    .trim()
    .not().isEmpty().withMessage('La ciudad es obligatoria')
    .custom((value) => {
        // Función para normalizar: convertir a minúscula y quitar tildes
        const normalize = (str) => 
            str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // Normalizamos la ciudad enviada por el usuario
        const normalizedValue = normalize(value);
        
        // Creamos una lista de ciudades normalizadas para comparar
        const normalizedCities = colombianCities.map(city => normalize(city));

        // Verificamos si la ciudad normalizada existe en nuestra lista normalizada
        if (!normalizedCities.includes(normalizedValue)) {
            throw new Error('Debe ser una ciudad válida de Colombia');
        }
        
        // Si todo está bien, la validación pasa
        return true;
    }),

    body('personal_picture', 'La URL de la foto de perfil debe ser una URL válida').isURL()
];

// ------------------- RUTAS DE REGISTRO -------------------

// Registro de usuario-cliente
router.post("/client", clientValidationRules, async (req, res) => {
    // 3. Verificamos el resultado de la validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { full_name, email, password } = req.body;

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 4. Actualizamos la consulta SQL para reflejar solo los campos del cliente
        const [userResult] = await pool.query(
            "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
            [full_name, email, password_hash]
        );
        const userId = userResult.insertId;

        const [clientResult] = await pool.query(
            "INSERT INTO clients (id_user) VALUES (?)",
            [userId]
        );

        res.status(201).json({ message: "Cliente registrado ✅", id_client: clientResult.insertId, id_user: userId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "El correo electrónico ya está en uso." });
        }
        console.error("Error registrando cliente:", err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Registro de usuario-proveedor
router.post("/provider", providerValidationRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        // 5. Obtenemos los nuevos campos del body
        const { full_name, email, password, phone_number, personal_picture, city, bio } = req.body;

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 6. Actualizamos la consulta SQL con todos los campos del proveedor
        const [userResult] = await pool.query(
            "INSERT INTO users (full_name, email, password_hash, phone_number, personal_picture, city, bio) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [full_name, email, password_hash, phone_number, personal_picture, city, bio]
        );
        const userId = userResult.insertId;

        // CAMBIO: Insertamos en la tabla 'providers'
        const [providerResult] = await pool.query(
            "INSERT INTO providers (id_user) VALUES (?)",
            [userId]
        );

        res.status(201).json({ message: "Proveedor registrado ✅", id_provider: providerResult.insertId, id_user: userId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "El correo electrónico ya está en uso." });
        }
        console.error("Error registrando proveedor:", err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

module.exports = router;