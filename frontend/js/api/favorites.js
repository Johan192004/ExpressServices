import { API_URL } from "./config.js";

export async function getFavoritesById(idClient) {
    let res = await fetch(`${API_URL}/api/favorites/${idClient}`)
    let resJson = await res.json()
    return resJson
}