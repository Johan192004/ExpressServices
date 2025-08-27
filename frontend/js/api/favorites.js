import { API_URL } from "./config.js";

export async function getFavoritesById(idClient) {
    let res = await fetch(`${API_URL}/api/favorites/${idClient}`)
    let resJson = await res.json()
    return resJson
}

export async function postFavorite(favoriteData) {
    try {
        const response = await fetch(`${API_URL}/api/favorites`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(favoriteData)
        });
        if (!response.ok) throw new Error("Error al agregar a favoritos");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function deleteFavorite(params) {
    try {
        const response = await fetch(`${API_URL}/api/favorites/${params.id_client}/${params.id_service}`, {
            method: "DELETE"
        });
        if (!response.ok) throw new Error("Error al eliminar de favoritos");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        return null;
    }
}