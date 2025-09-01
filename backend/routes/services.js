const express = require("express");
const router = express.Router();
const pool = require("../models/db"); // import DB connection


router.get("/", async (req, res) => {
    try {
  // KEY CHANGE: Now expect 'id_category' instead of 'category'
        const { id_category, experience_years, hour_price } = req.query;

        let query = `SELECT u.personal_picture, u.full_name AS provider_name, s.id_service, s.name, s.description, s.hour_price, s.creation_date, s.experience_years, u.email, u.phone_number, u.id_user
                     FROM services s 
                     INNER JOIN providers p ON s.id_provider=p.id_provider 
                     INNER JOIN users u ON p.id_user=u.id_user 
                     WHERE 1=1`;
        const params = [];

  // Exclude hidden services from public/client listing
        query += " AND (s.is_hidden IS NULL OR s.is_hidden = FALSE)";

  // KEY CHANGE: Complex name search replaced by this simple validation
        if (id_category) {
            query += " AND s.id_category = ?";
            params.push(parseInt(id_category));
        }

        if (experience_years) {
            query += " AND s.experience_years >= ?";
            params.push(parseInt(experience_years));
        }

        if (hour_price) {
            query += " AND s.hour_price <= ?";
            params.push(parseInt(hour_price));
        }

        const [rows] = await pool.query(query, params);
        res.status(200).json(rows);
    } catch (err) {
  console.error("❌ Error fetching services:", err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

router.get("/my/:id_provider", async (req, res) => {
  try {
    const { id_provider } = req.params;

  const [rows] = await pool.query(`SELECT u.personal_picture, u.full_name AS provider_name,s.id_service,s.name,s.description,s.hour_price,s.creation_date,s.experience_years FROM services s 
            INNER JOIN providers p ON s.id_provider=p.id_provider 
            INNER JOIN users u ON p.id_user=u.id_user 
      WHERE s.id_provider=? AND (s.is_hidden IS NULL OR s.is_hidden = FALSE)`, [id_provider]);
    res.status(200).json(rows);
  } catch (err) {
  console.error("❌ Error fetching services:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// --- NEW ROUTE: Get a service by ID ---
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const query = `SELECT s.*, u.full_name AS provider_name, u.personal_picture, u.bio, c.title as category_title, u.id_user
                       FROM services s
                       JOIN providers p ON s.id_provider = p.id_provider
                       JOIN users u ON p.id_user = u.id_user
                       JOIN categories c ON s.id_category = c.id_category
                       WHERE s.id_service = ? AND (s.is_hidden IS NULL OR s.is_hidden = FALSE)`;
        
        const [rows] = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Servicio no encontrado" });
        }
        res.status(200).json(rows[0]);
    } catch (err) {
  console.error("❌ Error fetching service detail:", err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});


router.post("/", async (req, res) => {
  try {
    const { id_provider, name, description, hour_price, experience_years, id_category } = req.body;

  // Validate required fields
    if (!id_provider || !name || !description || !hour_price || !experience_years || !id_category) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

  // Insert new service into the database
    const [result] = await pool.query(`INSERT INTO services (id_provider, name, description, hour_price, experience_years, id_category) VALUES (?, ?, ?, ?, ?, ?)`, [id_provider, name, description, hour_price, experience_years, id_category]);

  // Return created service
    const newService = {
      id_service: result.insertId,
      id_provider,
      name,
      description,
      hour_price,
      experience_years,
      id_category
    };
    res.status(201).json(newService);
  } catch (err) {
  console.error("❌ Error creating service:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Soft delete: mark the service as hidden instead of deleting permanently
router.delete("/:id_service", async (req, res) => {
  try {
    const { id_service } = req.params;

    const [result] = await pool.query(`UPDATE services SET is_hidden = TRUE WHERE id_service = ?`, [id_service]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }
  // 204 No Content keeps compatibility with the current frontend
    res.status(204).send();
  } catch (err) {
  console.error("❌ Error deleting service:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});


// PUT update service
router.put('/:id_service', async (req, res) => {
  try {
    const { id_service } = req.params;
    const { name, description, hour_price, experience_years, id_category } = req.body;

  // Validate required fields
    if (!name || !description || !hour_price || !experience_years || !id_category) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    const [result] = await pool.query(
      `UPDATE services SET name=?, description=?, hour_price=?, experience_years=?, id_category=? WHERE id_service=?`,
      [name, description, hour_price, experience_years, id_category, id_service]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    res.status(200).json({
      id_service,
      name,
      description,
      hour_price,
      experience_years,
      id_category
    });
  } catch (err) {
  console.error("❌ Error updating service:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
