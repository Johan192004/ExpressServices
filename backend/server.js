const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || process.env.EXPRESS_PORT || 3000;

// --- Global middleware ---
app.use(cors());
app.use(express.json());

// --- Routes import ---
const registerRoutes = require("./routes/registers.js");
const loginRoutes = require("./routes/login.js");
const serviceRoutes = require("./routes/services.js");
const categoriesRoutes = require('./routes/categories.js');
const usersRoutes = require('./routes/usersRoutes.js');
const conversationsRoutes = require('./routes/conversationsRoutes.js');
const passwordResetRoutes = require('./routes/passwordResetRoutes.js');
const favoritesRoutes = require('./routes/favorites.js');
const utilsRoutes = require('./routes/utilsRoutes.js');
const contractsRoutes = require('./routes/contractsRoutes.js');
const clientsRoutes = require('./routes/clients.js');
const providerRoutes = require('./routes/providers.js');
const reviewsRoutes = require('./routes/reviews.js');


// --- Define endpoints ---
app.use("/api/register", registerRoutes);
app.use("/api/login", loginRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/categories", categoriesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/password', passwordResetRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use('/api/utils', utilsRoutes);
app.use('/api/contracts', contractsRoutes); 
app.use('/api/clients', clientsRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/reviews', reviewsRoutes);

// Endpoint to expose GOOGLE_CLIENT_ID to the frontend
app.get('/api/google-client-id', (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID });
});

// --- Start server ---
app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Error starting server:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
    }
    return;
  }
  console.log(`Server running on port ${PORT} ✅`);
});