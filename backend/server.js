const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

// Carga las variables de entorno desde el archivo .env
dotenv.config();

const app = express();

//  IMPORTACIÓN DE RUTAS 
const registerRoutes = require("./routes/registers.js");
const serviceRoutes = require("./routes/services.js");
const loginRoutes = require("./routes/login.js");
const utilsRoutes = require('./routes/utilsRoutes.js');
const usersRoutes = require('./routes/usersRoutes.js');
const passwordResetRoutes = require('./routes/passwordResetRoutes.js');
const favoritesRoutes = require('./routes/favorites.js')
const categoriesRoutes = require('./routes/categories.js')


const PORT = process.env.EXPRESS_PORT || 3000;

//  MIDDLEWARE GLOBALES 
// Permite peticiones desde otros dominios (frontend)
app.use(cors());
// Permite que el servidor entienda y procese datos en formato JSON
app.use(express.json());

// DEFINICIÓN DE ENDPOINTS
// Rutas públicas para registro y login
app.use("/api/register", registerRoutes);
app.use("/api/services", serviceRoutes);

// ------------------- INICIO SERVIDOR -------------------
app.use("/api/login", loginRoutes);
app.use('/api/utils', utilsRoutes); 
app.use('/api/users', usersRoutes);
app.use("/api/favorites",favoritesRoutes)
app.use("/api/categories",categoriesRoutes)
app.use('/api/password', passwordResetRoutes); 



// INICIO DEL SERVIDOR 
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT} ✅`);
});