const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();

// ------------------- RUTAS -------------------
const registerRoutes = require("./routes/registers.js");

const PORT = process.env.EXPRESS_PORT || 3000;

// ------------------- MIDDLEWARE -------------------
app.use(cors());
app.use(express.json());

// ------------------- ENDPOINTS -------------------
app.use("/api/register", registerRoutes);


// ------------------- INICIO SERVIDOR -------------------
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

