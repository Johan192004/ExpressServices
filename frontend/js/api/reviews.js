import { API_URL } from "./config.js";

export async function getReviwesByServiceId(id_service) {
    try {
        const response = await fetch(`${API_URL}/api/reviews/${id_service}`);
        if (!response.ok) throw new Error("Error al obtener las reseñas");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return [];
    }
    
}