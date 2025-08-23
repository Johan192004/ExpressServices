
// Importamos las funciones que se comunican con la API
import { loginUser, registerClient, registerProvider } from '../api/authService.js';

// Obtenemos los elementos del DOM con los que vamos a interactuar
const loginForm = document.getElementById("loginForm");
const clientForm = document.getElementById("clientForm");
const providerForm = document.getElementById("providerForm");
const loginResultDiv = document.getElementById("loginResult");

// Event Listener para el formulario de Login
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    loginResultDiv.textContent = 'Iniciando sesión...';

    try {
        const result = await loginUser(data);

        localStorage.setItem('token', result.token); 

        loginResultDiv.textContent = `¡Bienvenido, ${result.user.full_name}! Eres un ${result.user.role}.`;
        console.log("Token guardado:", result.token);
        e.target.reset(); // Limpia el formulario
    } catch (error) {
        loginResultDiv.textContent = `Error: ${error.message}`;
        console.error("Error de login:", error);
    }
});

// Event Listener para el formulario de Registro de Cliente
clientForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());

    try {
        const result = await registerClient(data);
        alert(result.message || 'Cliente registrado con éxito.');
        e.target.reset();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
});

// Event Listener para el formulario de Registro de Proveedor
providerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());

    try {
        const result = await registerProvider(data);
        alert(result.message || 'Proveedor registrado con éxito.');
        e.target.reset();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
});

// Obtenemos el elemento <select> del DOM
const citySelect = document.getElementById('provider-city-select');

// Función para cargar las ciudades desde nuestro nuevo endpoint
async function loadCities() {
    try {
        // Hacemos la petición a la API
        const response = await fetch('http://localhost:3030/api/utils/cities');
        const cities = await response.json();

        // Por cada ciudad en la lista, creamos un <option> y lo añadimos al <select>
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error al cargar las ciudades:', error);
        // Opcional: Mostrar un error al usuario si las ciudades no cargan
    }
}

// Llamamos a la función cuando la página se carga
document.addEventListener('DOMContentLoaded', loadCities);