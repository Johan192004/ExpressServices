const express = require("express");
const router = express.Router();
const pool = require("../models/db.js"); 
const bcrypt = require("bcryptjs");
const { body, validationResult } = require('express-validator');
const { colombianCities } = require('../utils/locations.js');

// REGLAS DE VALIDACIÓN 

const clientValidationRules = [
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

// RUTAS DE REGISTRO (CON VERIFICACIÓN DE CONTRASEÑA)

// --- REGISTRO DE PROVEEDOR ---
router.post("/provider", providerValidationRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, email, password, phone_number, personal_picture, city, bio } = req.body;

    try {
        const [existingUsers] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

        if (existingUsers.length === 0) {
            // CASO 1: El usuario es completamente nuevo
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);

            const [userResult] = await pool.query(
                "INSERT INTO users (full_name, email, password_hash, phone_number, personal_picture, city, bio) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [full_name, email, password_hash, phone_number, personal_picture, city, bio]
            );
            const userId = userResult.insertId;

            const [providerResult] = await pool.query("INSERT INTO providers (id_user) VALUES (?)", [userId]);
            return res.status(201).json({ message: "Proveedor registrado exitosamente ✅", id_provider: providerResult.insertId });

        } else {
            // CASO 2: El usuario ya existe
            const existingUser = existingUsers[0];
            const userId = existingUser.id_user;

            // VERIFICACIÓN DE CONTRASEÑA
            const isMatch = await bcrypt.compare(password, existingUser.password_hash);
            if (!isMatch) {
                return res.status(401).json({ error: "La contraseña es incorrecta. Por favor, verifica tus credenciales." });
            }

            // Verificamos que no tenga ya el rol de proveedor
            const [existingProviders] = await pool.query("SELECT * FROM providers WHERE id_user = ?", [userId]);
            if (existingProviders.length > 0) {
                return res.status(409).json({ error: "Este correo ya está registrado como proveedor." });
            }

            //Si todo es correcto, actualizamos el perfil y añadimos el rol
            await pool.query(
                "UPDATE users SET full_name = ?, phone_number = ?, personal_picture = ?, city = ?, bio = ? WHERE id_user = ?",
                [full_name, phone_number, personal_picture, city, bio, userId]
            );
            const [providerResult] = await pool.query("INSERT INTO providers (id_user) VALUES (?)", [userId]);
            return res.status(201).json({ message: "Perfil de proveedor creado y asociado a tu cuenta existente ✅", id_provider: providerResult.insertId });
        }
    } catch (err) {
        console.error("Error registrando proveedor:", err);
        return res.status(500).json({ error: "Error en el servidor" });
    }
});

// REGISTRO DE CLIENTE 
router.post("/client", clientValidationRules, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, email, password } = req.body;

    try {
        const [existingUsers] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

        if (existingUsers.length === 0) {
            //  CASO 1: El usuario es completamente nuevo
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
            // CASO 2: El usuario ya existe
            const existingUser = existingUsers[0];
            const userId = existingUser.id_user;

            // VERIFICACIÓN DE CONTRASEÑA
            const isMatch = await bcrypt.compare(password, existingUser.password_hash);
            if (!isMatch) {
                return res.status(401).json({ error: "La contraseña es incorrecta." });
            }

            //Verificamos que no tenga ya el rol de cliente
            const [existingClients] = await pool.query("SELECT * FROM clients WHERE id_user = ?", [userId]);
            if (existingClients.length > 0) {
                return res.status(409).json({ error: "Este correo ya está registrado como cliente." });
            }
            
            // Si todo es correcto, añadimos el rol
            const [clientResult] = await pool.query("INSERT INTO clients (id_user) VALUES (?)", [userId]);
            return res.status(201).json({ message: "Rol de cliente añadido a tu cuenta existente ✅", id_client: clientResult.insertId });
        }
    } catch (err) {
        console.error("Error registrando cliente:", err);
        return res.status(500).json({ error: "Error en el servidor" });
    }
});

module.exports = router;