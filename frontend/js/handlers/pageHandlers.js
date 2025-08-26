// frontend/js/handlers/pageHandlers.js

import { getCities, getServices, getCategories } from '../api/authService.js';

// --- LÓGICA DE CARGA Y RENDERIZACIÓN DE LA PÁGINA ---

// Mapa para traducir títulos de la DB (Inglés) a lo que ve el usuario (Español)
const categoryTranslationMap = {
    'Plumbing': { name: 'Plomería', icon: 'bi-wrench-adjustable' },
    'Electricity': { name: 'Electricidad', icon: 'bi-plug-fill' },
    'Carpentry': { name: 'Carpintería', icon: 'bi-hammer' },
    'Cleaning': { name: 'Construcción & Remodelación', icon: 'bi-house-up-fill' },
    // Si tienes más categorías en tu DB, añade sus traducciones aquí
};

/**
 * Carga las categorías desde la API, las muestra en la página
 * y les asigna eventos de clic para cargar los servicios.
 */
export async function loadAndSetupCategories() {
    const container = document.getElementById('category-container');
    if (!container) return;

    try {
        const categoriesFromDB = await getCategories();
        container.innerHTML = ''; // Limpiamos por si acaso

        categoriesFromDB.forEach(category => {
            const translation = categoryTranslationMap[category.title] || { name: category.title, icon: 'bi-tools' };
            const card = document.createElement('div');
            card.className = 'col-6 col-md-3';
            card.innerHTML = `
                <div class="category-card" style="cursor: pointer;" data-id-category="${category.id_category}" data-name-category="${translation.name}">
                    <div class="icon-wrapper"><i class="bi ${translation.icon}"></i></div>
                    <p>${translation.name}</p>
                </div>`;
            container.appendChild(card);
        });

        // Asignamos los listeners a las tarjetas que acabamos de crear
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', async () => {
                const categoryId = card.dataset.idCategory;
                const categoryName = card.dataset.nameCategory;
                
                document.getElementById('services-title').textContent = `Servicios de ${categoryName}`;
                try {
                    const services = await getServices({ id_category: categoryId });
                    renderServices(services);
                } catch (error) {
                    console.error("Error al cargar servicios por categoría:", error);
                }
            });
        });

    } catch (error) {
        console.error("Error al cargar categorías:", error);
        container.innerHTML = '<p class="text-danger">No se pudieron cargar las categorías.</p>';
    }
}

/**
 * Renderiza una lista de tarjetas de servicio en el contenedor principal.
 * @param {Array} services - La lista de servicios a mostrar.
 */
export function renderServices(services) {
    const container = document.getElementById('services-container');
    if (!container) return;

    container.innerHTML = '';

    if (services.length === 0) {
        container.innerHTML = '<p class="text-center text-muted col-12">No se encontraron servicios en esta categoría.</p>';
        return;
    }

    services.forEach(service => {
        const cardHtml = `
            <div class="col-12 col-md-6 col-lg-4 mb-4">
                <div class="card service-card h-100">
                    <div class="card-body text-center">
                        <img src="${service.personal_picture || 'ruta/a/avatar_default.png'}" alt="${service.provider_name}" class="provider-avatar">
                        <h5 class="card-title mt-3 fw-bold">${service.name}</h5>
                        <p class="card-text text-muted small">Por ${service.provider_name}</p>
                        <p class="card-text">${(service.description || '').substring(0, 80)}...</p>
                        <hr>
                        <div class="d-flex justify-content-between align-items-center">
                            <p class="card-price mb-0">$${(service.hour_price || 0).toLocaleString('es-CO')} <span>/hora</span></p>
                            <button class="btn btn-outline-primary btn-see-more" data-service-id="${service.id_service}">Ver Más</button>
                        </div>
                    </div>
                </div>
            </div>`;
        container.innerHTML += cardHtml;
    });
}

/**
 * Carga las ciudades desde la API y las pone en el <select> del formulario de registro de proveedor.
 */
export async function loadCities() {
    const citySelect = document.getElementById('provider-city-select');
    if (!citySelect) return;
    try {
        const cities = await getCities();
        citySelect.innerHTML = '<option value="" disabled selected>Selecciona tu ciudad...</option>'; // Reseteamos
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
    } catch (error) {
        console.error(error.message);
    }
}


export async function loadInitialServices() {
    try {
        // Elige el ID de la categoría que quieres mostrar por defecto.
        // Basado en tu DB, 2 = Electricity. Puedes cambiar este número.
        const defaultCategoryId = 2; 
        
        const services = await getServices({ id_category: defaultCategoryId });
        renderServices(services);
        document.getElementById('services-title').textContent = 'Servicios Destacados'; // Mantenemos un título genérico
    } catch (error) {
        console.error("Error al cargar los servicios iniciales:", error);
        const container = document.getElementById('services-container');
        if(container) container.innerHTML = '<p class="text-center text-danger">No se pudieron cargar los servicios destacados.</p>';
    }
}