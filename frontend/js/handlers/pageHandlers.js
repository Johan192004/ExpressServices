// frontend/js/handlers/pageHandlers.js

import { getCities, getServices, getCategories } from '../api/authService.js';

// ===================================================================
// FUNCIONES DE MANEJO DE IMÁGENES CON AVATARES DE RESPALDO
// ===================================================================

/**
 * Genera un avatar SVG con las iniciales del nombre completo
 * @param {string} fullName - Nombre completo del proveedor
 * @param {number} size - Tamaño del avatar en píxeles (por defecto 60)
 * @returns {string} - URL de datos SVG
 */
function generateInitialsAvatar(fullName, size = 60) {
    // Obtener las iniciales del nombre
    const initials = fullName
        .split(' ')
        .filter(name => name.length > 0)
        .map(name => name.charAt(0).toUpperCase())
        .slice(0, 2) // Solo las primeras 2 iniciales
        .join('');
    
    // Colores de fondo aleatorios pero consistentes basados en el nombre
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    // Generar un color consistente basado en el hash del nombre
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
        hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    const backgroundColor = colors[colorIndex];
    
    // Crear el SVG
    const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${backgroundColor}"/>
            <text x="${size/2}" y="${size/2}" font-family="Arial, sans-serif" font-size="${size/3}" font-weight="bold" 
                  fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text>
        </svg>
    `;
    
    // Convertir a URL de datos
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Configura el manejo de imágenes con avatar inmediato y carga en segundo plano
 * @param {HTMLImageElement} img - Elemento de imagen
 * @param {string} providerName - Nombre del proveedor
 * @param {string} originalSrc - URL original de la imagen
 * @param {number} size - Tamaño del avatar
 */
function setupImageFallback(img, providerName, originalSrc, size = 60) {
    // Mostrar inmediatamente el avatar de iniciales
    const initialsAvatar = generateInitialsAvatar(providerName, size);
    img.src = initialsAvatar;
    
    // Intentar cargar la imagen real en segundo plano
    if (originalSrc && originalSrc !== 'null' && originalSrc.trim() !== '') {
        const realImage = new Image();
        realImage.onload = function() {
            // Si la imagen real carga exitosamente, reemplazar el avatar
            img.src = originalSrc;
        };
        realImage.onerror = function() {
            // Si falla, mantener el avatar de iniciales (ya está configurado)
            console.log(`Failed to load image for ${providerName}, using initials avatar`);
        };
        // Iniciar la carga de la imagen real
        realImage.src = originalSrc;
    }
}

// ===================================================================
// LÓGICA DE CARGA Y RENDERIZACIÓN DE LA PÁGINA
// ===================================================================

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
                
                // Remover clase 'active' de todas las categorías
                document.querySelectorAll('.category-card').forEach(c => {
                    c.classList.remove('active');
                });
                
                // Agregar clase 'active' a la categoría seleccionada
                card.classList.add('active');
                
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

    services.forEach((service, index) => {
        const cardHtml = `
            <div class="col-12 col-md-6 col-lg-4 mb-4">
                <div class="card service-card h-100">
                    <div class="card-body text-center">
                        <img src="" alt="${service.provider_name}" class="provider-avatar" data-service-index="${index}">
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

    // Después de crear las tarjetas, configurar las imágenes con fallback
    services.forEach((service, index) => {
        const img = container.querySelector(`img[data-service-index="${index}"]`);
        if (img) {
            setupImageFallback(img, service.provider_name, service.personal_picture, 60);
        }
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
        
        // Resaltar la categoría por defecto (Electricidad) si existe
        setTimeout(() => {
            const defaultCategoryCard = document.querySelector(`[data-id-category="${defaultCategoryId}"]`);
            if (defaultCategoryCard) {
                // Primero limpiar todas las categorías activas
                document.querySelectorAll('.category-card').forEach(card => {
                    card.classList.remove('active');
                });
                // Luego activar la categoría por defecto
                defaultCategoryCard.classList.add('active');
            }
        }, 100); // Pequeño delay para asegurar que las categorías estén cargadas
        
    } catch (error) {
        console.error("Error al cargar los servicios iniciales:", error);
        const container = document.getElementById('services-container');
        if(container) container.innerHTML = '<p class="text-center text-danger">No se pudieron cargar los servicios destacados.</p>';
    }
}