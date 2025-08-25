
import { API_URL } from './config.js';

// Función genérica para peticiones POST 
async function fetchAPI(endpoint, data) {
    const res = await fetch(`${API_URL}/api${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    if (!res.ok) {
        // Maneja errores de validación que vienen en un array 'errors'
        const errorMessage = result.errors ? result.errors[0].msg : (result.error || 'Ocurrió un error en la petición.');
        throw new Error(errorMessage);
    }
    return result;
}

// Endpoints de Autenticación 
export const loginUser = (data) => fetchAPI('/login', data);
export const registerClient = (data) => fetchAPI('/register/client', data);
export const registerProvider = (data) => fetchAPI('/register/provider', data);



// Esta función es para peticiones GET y no necesita enviar datos
export const getCities = async () => {
    const res = await fetch(`${API_URL}/api/utils/cities`); // Es una petición GET simple
    if (!res.ok) {
        throw new Error('No se pudieron cargar las ciudades');
    }
    return res.json();
};


export const checkEmailExists = async (email) => {
    // Es una petición GET, así que construimos la URL con el parámetro
    const res = await fetch(`${API_URL}/api/users/check-email?email=${encodeURIComponent(email)}`);
    if (!res.ok) {
        throw new Error('No se pudo verificar el correo');
    }
    return res.json();
};


export const requestPasswordReset = (email) => {
    // El endpoint espera un objeto con la propiedad "email"
    return fetchAPI('/password/forgot', { email });
};