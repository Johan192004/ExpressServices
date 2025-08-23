import { API_URL } from './config.js';

// Función genérica para realizar las peticiones fetch
async function fetchAPI(endpoint, data) {
    const res = await fetch(`${API_URL}/api${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    if (!res.ok) {
        throw new Error(result.error || result.errors[0]?.msg || 'Ocurrió un error en la petición.');
    }
    return result;
}

// Exportamos una función para cada endpoint de autenticación
export const loginUser = (data) => fetchAPI('/login', data);
export const registerClient = (data) => fetchAPI('/register/client', data);
export const registerProvider = (data) => fetchAPI('/register/provider', data);