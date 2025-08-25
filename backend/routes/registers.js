const express = require("express");
const router = express.Router();
const pool = require("../models/db.js"); 
const bcrypt = require("bcryptjs");
const { body, validationResult } = require('express-validator');
const { colombianCities } = require('../utils/locations.js');

// ------------------- REGLAS DE VALIDACIÓN (CORREGIDAS) -------------------

const clientValidationRules = [
    body('full_name', 'El nombre no es válido')
        // ... (tus reglas de nombre están bien)
        .not().isEmpty().withMessage('El nombre completo es obligatorio')
        .trim()
        .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres')
        .matches(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/).withMessage('El nombre solo puede contener letras y espacios')
        .matches(/\s/).withMessage('Debes ingresar al menos un nombre y un apellido')
        .escape(),
    
    // CORRECCIÓN: Se elimina el validador .custom() que revisaba duplicados
    body('email', 'El correo electrónico no es válido').isEmail().normalizeEmail(),
    
    body('password', 'La contraseña debe tener al menos 8 caracteres').isLength({ min: 8 })
];

const providerValidationRules = [
    body('full_name', 'El nombre no es válido')
        .not().isEmpty().withMessage('El nombre completo es obligatorio')
        .trim()
        .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres')
        .matches(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/).withMessage('El nombre solo puede contener letras y espacios')
        .matches(/\s/).withMessage('Debes ingresar al menos un nombre y un apellido')
        .escape(),
    
    body('email', 'El correo electrónico no es válido')
        .isEmail().withMessage('Debe ser un formato de correo válido')
        .normalizeEmail(),

    body('password', 'La contraseña debe tener al menos 8 caracteres').isLength({ min: 8 }),
    
    body('phone_number', 'El número de teléfono no es válido')
        .trim()
        .isNumeric().withMessage('El teléfono solo puede contener números')
        .isLength({ min: 10, max: 10 }).withMessage('El número de teléfono debe tener 10 dígitos'),

    body('city', 'La ciudad no es válida')
        .trim()
        .not().isEmpty().withMessage('La ciudad es obligatoria')
        .custom((value) => {
            const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normalizedValue = normalize(value);
            const normalizedCities = colombianCities.map(city => normalize(city));
            if (!normalizedCities.includes(normalizedValue)) {
                throw new Error('Debe ser una ciudad válida de Colombia');
            }
            return true;
        }),

    body('personal_picture', 'La URL de la foto de perfil debe ser una URL válida').isURL()
];

// ------------------- RUTAS DE REGISTRO -------------------
// --- REGISTRO DE PROVEEDOR ---
router.post("/provider", providerValidationRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, email, password, phone_number, personal_picture, city, bio } = req.body;

    try {
        // 1. Buscamos si el usuario ya existe por su email
        const [existingUsers] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

        if (existingUsers.length === 0) {
            // --- CASO A: El usuario es completamente nuevo ---

            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);

            // Insertamos el nuevo usuario
            const [userResult] = await pool.query(
                "INSERT INTO users (full_name, email, password_hash, phone_number, personal_picture, city, bio) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [full_name, email, password_hash, phone_number, personal_picture, city, bio]
            );
            const userId = userResult.insertId;

            // Creamos su rol de proveedor
            const [providerResult] = await pool.query("INSERT INTO providers (id_user) VALUES (?)", [userId]);

            return res.status(201).json({ message: "Proveedor registrado exitosamente ✅", id_provider: providerResult.insertId });

        } else {
            // --- CASO B: El usuario ya existe, vamos a añadirle o verificar el rol de proveedor ---
            const existingUser = existingUsers[0];
            const userId = existingUser.id_user;

            // VALIDACIÓN CLAVE: Verificamos que no esté ya registrado como proveedor
            const [existingProviders] = await pool.query("SELECT * FROM providers WHERE id_user = ?", [userId]);
            if (existingProviders.length > 0) {
                return res.status(409).json({ error: "Este correo ya está registrado como proveedor." });
            }

            // Si llega aquí, es porque el usuario existe (probablemente como cliente) pero no como proveedor.
            // Actualizamos los datos del usuario con la nueva información del perfil de proveedor.
            await pool.query(
                "UPDATE users SET full_name = ?, phone_number = ?, personal_picture = ?, city = ?, bio = ? WHERE id_user = ?",
                [full_name, phone_number, personal_picture, city, bio, userId]
            );
            // Nota: No actualizamos el email ni la contraseña, el usuario mantiene sus credenciales originales.

            // Creamos el rol de proveedor y lo enlazamos al usuario existente
            const [providerResult] = await pool.query("INSERT INTO providers (id_user) VALUES (?)", [userId]);

            return res.status(201).json({ message: "Perfil de proveedor creado y asociado a tu cuenta existente ✅", id_provider: providerResult.insertId });
        }
    } catch (err) {
        console.error("Error registrando proveedor:", err);
        return res.status(500).json({ error: "Error en el servidor" });
    }
});


// --- REGISTRO DE CLIENTE (con la misma lógica adaptada) ---
router.post("/client", clientValidationRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, email, password } = req.body;

    try {
        // 1. Buscamos si el usuario ya existe por su email
        const [existingUsers] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

        if (existingUsers.length === 0) {
            // --- CASO A: El usuario es completamente nuevo ---
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);

            const [userResult] = await pool.query(
                "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
                [full_name, email, password_hash]
            );
            const userId = userResult.insertId;

            const [clientResult] = await pool.query("INSERT INTO clients (id_user) VALUES (?)", [userId]);

            return res.status(201).json({ message: "Cliente registrado exitosamente ✅", id_client: clientResult.insertId });

        } else {
            // --- CASO B: El usuario ya existe, vamos a añadirle o verificar el rol de cliente ---
            const existingUser = existingUsers[0];
            const userId = existingUser.id_user;

            // VALIDACIÓN CLAVE: Verificamos que no esté ya registrado como cliente
            const [existingClients] = await pool.query("SELECT * FROM clients WHERE id_user = ?", [userId]);
            if (existingClients.length > 0) {
                return res.status(409).json({ error: "Este correo ya está registrado como cliente." });
            }

            // Si llega aquí, es porque existe como proveedor. Le añadimos el rol de cliente.
            // No es necesario actualizar la tabla 'users' porque el registro de cliente no trae nueva info de perfil.
            const [clientResult] = await pool.query("INSERT INTO clients (id_user) VALUES (?)", [userId]);

            return res.status(201).json({ message: "Rol de cliente añadido a tu cuenta existente ✅", id_client: clientResult.insertId });
        }
    } catch (err) {
        console.error("Error registrando cliente:", err);
        return res.status(500).json({ error: "Error en el servidor" });
    }
});

module.exports = router;