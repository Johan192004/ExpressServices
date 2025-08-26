const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

// Carga las variables de entorno desde el archivo .env
dotenv.config();

const app = express();
const PORT = process.env.EXPRESS_PORT || 3000;

// --- MIDDLEWARE GLOBALES ---
app.use(cors());
app.use(express.json());

// --- IMPORTACIÓN DE RUTAS ---
const registerRoutes = require("./routes/registers.js");
const loginRoutes = require("./routes/login.js");
const serviceRoutes = require("./routes/services.js");
const categoriesRoutes = require('./routes/categories.js');
const usersRoutes = require('./routes/usersRoutes.js');
const conversationsRoutes = require('./routes/conversationsRoutes.js');
const passwordResetRoutes = require('./routes/passwordResetRoutes.js');
const favoritesRoutes = require('./routes/favorites.js');
const utilsRoutes = require('./routes/utilsRoutes.js');

// --- DEFINICIÓN DE ENDPOINTS ---
app.use("/api/register", registerRoutes);
app.use("/api/login", loginRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/categories", categoriesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/password', passwordResetRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use('/api/utils', utilsRoutes);

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT} ✅`);
});