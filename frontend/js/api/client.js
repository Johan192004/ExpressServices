import { API_URL } from "./config.js";

export async function getServicesByCategory(category) {
    try {
        const response = await fetch(`${API_URL}/services?category=${category}`);
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching services:", error);
        return [];
    }
}