// frontend/js/api/authService.js

import { API_URL } from './config.js';

// ===================================================================
// FUNCIÓN HELPER CENTRALIZADA PARA PETICIONES CON TOKEN
// ===================================================================

/**
 * Realiza una petición fetch autenticada. Automáticamente añade el token JWT
 * y maneja el caso de que la sesión haya expirado (error 401).
 * @param {string} endpoint - El endpoint de la API (ej. '/users/profile').
 * @param {object} options - Opciones de Fetch (method, body, etc.).
 * @returns {Promise<any>} La respuesta JSON de la API.
 */
async function fetchWithAuth(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Si tenemos un token, lo añadimos al header de autorización
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api${endpoint}`, { ...options, headers });

    // MANEJADOR CENTRALIZADO DE SESIÓN EXPIRADA
    if (response.status === 401) {
        localStorage.removeItem('token');
        alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
        window.location.reload();
        throw new Error('Sesión expirada.');
    }

    // Manejo para respuestas sin contenido como DELETE (status 204)
    if (response.status === 204) {
        return { success: true };
    }

    const result = await response.json();
    if (!response.ok) {
        const errorMessage = result.errors ? result.errors[0].msg : (result.error || 'Ocurrió un error en la petición.');
        throw new Error(errorMessage);
    }
    return result;
}

export const handleUnauthorized = (response) => {
    if (response.status === 401) {
        localStorage.removeItem('token');
        alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
        window.location.reload();
        throw new Error('Sesión expirada.');
    }
};

// ===================================================================
// FUNCIONES PÚBLICAS (No necesitan token)
// ===================================================================

export const loginUser = async (data) => {
    const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Credenciales incorrectas.');
    return result;
};

export const registerClient = async (data) => {
    const response = await fetch(`${API_URL}/api/register/client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.errors ? result.errors[0].msg : result.error);
    return result;
};

export const registerProvider = async (data) => {
    const response = await fetch(`${API_URL}/api/register/provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.errors ? result.errors[0].msg : result.error);
    return result;
};

export const requestPasswordReset = async (email) => {
    const response = await fetch(`${API_URL}/api/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Error al solicitar el reseteo.');
    return result;
};

export const resetPassword = async (token, newPassword) => {
    const response = await fetch(`${API_URL}/api/password/reset/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Error al resetear la contraseña.');
    return result;
};

export const checkEmailExists = async (email) => {
    const response = await fetch(`${API_URL}/api/users/check-email?email=${encodeURIComponent(email)}`);
    const result = await response.json();
    if (!response.ok) throw new Error('No se pudo verificar el correo');
    return result;
};

export const getCities = async () => {
    const response = await fetch(`${API_URL}/api/utils/cities`);
    if (!response.ok) throw new Error('No se pudieron cargar las ciudades');
    return response.json();
};

export const getCategories = async () => {
    const response = await fetch(`${API_URL}/api/categories`);
    if (!response.ok) throw new Error('No se pudieron cargar las categorías.');
    return response.json();
};

export const getServices = async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await fetch(`${API_URL}/api/services?${queryParams}`);
    if (!response.ok) throw new Error('No se pudieron cargar los servicios.');
    return response.json();
};

export const getServiceById = async (serviceId) => {
    const response = await fetch(`${API_URL}/api/services/${serviceId}`);
    if (!response.ok) throw new Error('No se pudo cargar la información del servicio.');
    return response.json();
};

export const getClientById = async (id_client) => {
    const response = await fetch(`${API_URL}/api/clients/${id_client}`);
    if (!response.ok) throw new Error('No se pudo cargar la información del cliente.');
    return response.json();
};

export const putClient = async (id_client, data) => {
    const response = await fetch(`${API_URL}/api/clients/${id_client}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Error al actualizar el cliente.');
    return result;
};

// ===================================================================
// FUNCIONES PROTEGIDAS (Necesitan token y usan el helper)
// ===================================================================

export const getUserProfile = () => fetchWithAuth('/users/profile');

export const getProviderConversations = () => fetchWithAuth('/conversations/provider');

export const getClientConversations = () => fetchWithAuth('/conversations/client');

export const getMyServices = (providerId) => fetchWithAuth(`/services/my/${providerId}`);

export const startConversation = async (id_service) => {
    const token = localStorage.getItem('token');

    // 1. PRIMERA BARRERA: Si no hay token, fallamos RÁPIDO aquí.
    //    No necesitamos ni molestar al backend.
    if (!token || token === 'null' || token === 'undefined') {
        throw new Error('Debes iniciar sesión para contactar al proveedor.');
    }

    // 2. Si hay un token, AHORA SÍ intentamos la petición.
    const response = await fetch(`${API_URL}/api/conversations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id_service })
    });
    
    // El helper 'handleUnauthorized' se encargará si el token está vencido.
    handleUnauthorized(response);

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'No se pudo iniciar la conversación.');
    }
    return result;
};

export const getMessages = (conversationId) => fetchWithAuth(`/conversations/${conversationId}/messages`);

export const sendMessage = (conversationId, content) => fetchWithAuth(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content })
});

export const createService = (serviceData) => fetchWithAuth('/services', {
    method: 'POST',
    body: JSON.stringify(serviceData)
});

export const updateService = (serviceId, serviceData) => fetchWithAuth(`/services/${serviceId}`, {
    method: 'PUT',
    body: JSON.stringify(serviceData)
});

export const deleteService = (serviceId) => fetchWithAuth(`/services/${serviceId}`, {
    method: 'DELETE'
});

export const createContract = (contractData) => fetchWithAuth('/contracts', {
    method: 'POST',
    body: JSON.stringify(contractData)
});

export const getContracts = (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/contracts?${queryParams}` : '/contracts';
    return fetchWithAuth(endpoint);
};

export const getContractsHistory = (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/contracts/history?${queryParams}` : '/contracts/history';
    return fetchWithAuth(endpoint);
};

export const respondToContract = (contractId, action) => fetchWithAuth(`/contracts/${contractId}/respond`, {
    method: 'PATCH',
    body: JSON.stringify({ action }) // 'accepted' o 'denied'
});


export const completeContract = (contractId) => fetchWithAuth(`/contracts/${contractId}/complete`, {
    method: 'PATCH'
});

export const deleteContract = (contractId) => fetchWithAuth(`/contracts/${contractId}`, {
    method: 'DELETE'
});