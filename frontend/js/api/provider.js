import { API_URL } from "./config.js";

export async function getMyServices(id_providerP) {
    try {
        const response = await fetch(`${API_URL}/services/my/${id_providerP}`);
        if (!response.ok) throw new Error("Error al obtener los servicios");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        if (!response.ok) throw new Error("Error al obtener las categorías");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function postService(serviceData) {
    try {
        const response = await fetch(`${API_URL}/services`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(serviceData)
        });
        if (!response.ok) throw new Error("Error al publicar el servicio");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function deleteService(id_service) {
    try {
        const response = await fetch(`${API_URL}/services/${id_service}`, {
            method: "DELETE"
        });
        if (!response.ok) throw new Error("Error al eliminar el servicio");
        return true;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function putService(id_service, serviceData) {
    try {
        const response = await fetch(`${API_URL}/services/${id_service}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(serviceData)
        });
        if (!response.ok) throw new Error("Error al actualizar el servicio");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return null;
    }
}