import { API_URL } from "./config.js";

export async function getReviewsByServiceId(id_service) {
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

export async function postReview(reviewData) {
    try {
        const response = await fetch(`${API_URL}/api/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reviewData),
        });
        if (!response.ok) throw new Error("Error al crear la reseña");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return { error: error.message };
    }
}
