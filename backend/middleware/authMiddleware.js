const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    // Look for the token in the 'Authorization' header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
                // 1. Extract token from header (format "Bearer TOKEN")
            token = req.headers.authorization.split(' ')[1];

                // 2. Verify the token using our secret key
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

                // 3. Attach the token payload (contains user id and roles)
                //    to the request for downstream handlers to use.
            req.user = decoded.user;

                // 4. Continue to next handler (protected route)
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