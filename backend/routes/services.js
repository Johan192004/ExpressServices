const express = require("express");
const router = express.Router();
const pool = require("../models/db"); // aquí importamos la conexión

// GET services con filtros
router.get("/", async (req, res) => {
  try {
    const { category, experience_years, hour_price } = req.query;

    let query = `SELECT u.personal_picture, u.full_name AS provider_name,s.id_service,s.name,s.description,s.hour_price,s.creation_date,s.experience_years,u.email, u.phone_number FROM services s 
            INNER JOIN providers p ON s.id_provider=p.id_provider 
            INNER JOIN users u ON p.id_user=u.id_user 
            WHERE 1=1`;
    const params = [];

    if (category) {

      let [categoryResponse] = await pool.query('SELECT id_category FROM categories WHERE title = ?', [category]);
      query += " AND id_category = ?";
      params.push(categoryResponse[0].id_category);
    }

    if (experience_years) {
      query += " AND experience_years >= ?";
      params.push(parseInt(experience_years));
    }

    if (hour_price) {
      query += " AND hour_price <= ?";
      params.push(parseInt(hour_price));
    }


    const [rows] = await pool.query(query, params);
    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error al obtener servicios:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

router.get("/my/:id_provider", async (req, res) => {
  try {
    const { id_provider } = req.params;

    const [rows] = await pool.query(`SELECT u.personal_picture, u.full_name AS provider_name,s.id_service,s.name,s.description,s.hour_price,s.creation_date,s.experience_years FROM services s 
            INNER JOIN providers p ON s.id_provider=p.id_provider 
            INNER JOIN users u ON p.id_user=u.id_user 
            WHERE s.id_provider=?`, [id_provider]);
    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error al obtener servicios:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { id_provider, name, description, hour_price, experience_years, id_category } = req.body;

    // Validar que se reciban todos los campos necesarios
    if (!id_provider || !name || !description || !hour_price || !experience_years || !id_category) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    // Insertar el nuevo servicio en la base de datos
    const [result] = await pool.query(`INSERT INTO services (id_provider, name, description, hour_price, experience_years, id_category) VALUES (?, ?, ?, ?, ?, ?)`, [id_provider, name, description, hour_price, experience_years, id_category]);

    // Devolver el servicio creado
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
    console.error("❌ Error al publicar servicio:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

router.delete("/:id_service", async (req, res) => {
  try {
    const { id_service } = req.params;

    const [result] = await pool.query(`DELETE FROM services WHERE id_service = ?`, [id_service]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("❌ Error al eliminar servicio:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});


// PUT actualizar servicio
router.put('/:id_service', async (req, res) => {
  try {
    const { id_service } = req.params;
    const { name, description, hour_price, experience_years, id_category } = req.body;

    // Validar que se reciban todos los campos necesarios
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
    console.error("❌ Error al actualizar servicio:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
