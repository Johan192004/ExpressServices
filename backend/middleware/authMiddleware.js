const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    // Buscamos el token en el header 'Authorization'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Obtenemos el token del header (formato "Bearer TOKEN")
            token = req.headers.authorization.split(' ')[1];

            // 2. Verificamos el token con nuestra clave secreta
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Adjuntamos el payload del token (que contiene id y rol del usuario)
            //    a la petición para que las siguientes funciones puedan usarlo.
            req.user = decoded.user;

            // 4. Continuamos hacia la siguiente función (la ruta protegida)
            next();

        } catch (error) {
            console.error(error);
            return res.status(401).json({ error: 'Acceso no autorizado, token falló.' });
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Acceso no autorizado, no hay token.' });
    }
};

module.exports = { protect };