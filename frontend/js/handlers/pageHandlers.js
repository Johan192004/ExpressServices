// frontend/js/handlers/pageHandlers.js

import { getCities, getServices, getCategories } from '../api/authService.js';

// ===================================================================
// IMAGE HANDLING WITH INITIALS AVATAR FALLBACK
// ===================================================================

/**
 * Generate an SVG avatar with initials from full name
 * @param {string} fullName - Provider full name
 * @param {number} size - Avatar size in pixels (default 60)
 * @returns {string} - SVG data URL
 */
function generateInitialsAvatar(fullName, size = 60) {
    // Get initials from the name
    const initials = fullName
        .split(' ')
        .filter(name => name.length > 0)
        .map(name => name.charAt(0).toUpperCase())
        .slice(0, 2) // Solo las primeras 2 iniciales
        .join('');
    
    // Random yet consistent background colors based on the name
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    // Generate a consistent color based on the name hash
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
        hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    const backgroundColor = colors[colorIndex];
    
    // Build the SVG
    const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${backgroundColor}"/>
            <text x="${size/2}" y="${size/2}" font-family="Arial, sans-serif" font-size="${size/3}" font-weight="bold" 
                  fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text>
        </svg>
    `;
    
    // Convert to data URL
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Configure image handling with instant initials avatar and background loading
 * @param {HTMLImageElement} img - Image element
 * @param {string} providerName - Provider name
 * @param {string} originalSrc - Original image URL
 * @param {number} size - Avatar size
 */
function setupImageFallback(img, providerName, originalSrc, size = 60) {
    // Show initials avatar immediately
    const initialsAvatar = generateInitialsAvatar(providerName, size);
    img.src = initialsAvatar;
    
    // Try loading the real image in the background
    if (originalSrc && originalSrc !== 'null' && originalSrc.trim() !== '') {
        const realImage = new Image();
        realImage.onload = function() {
            // If real image loads, replace the avatar
            img.src = originalSrc;
        };
        realImage.onerror = function() {
            // On error, keep initials avatar (already set)
            console.log(`Failed to load image for ${providerName}, using initials avatar`);
        };
    // Start loading the real image
        realImage.src = originalSrc;
    }
}

// ===================================================================
// PAGE LOADING AND RENDERING LOGIC
// ===================================================================

// Map to translate DB titles to Spanish labels for users (UI-facing)
const categoryTranslationMap = {
    'Plomería': { name: 'Plomería', icon: 'bi-wrench-adjustable' },
    'Electricidad': { name: 'Electricidad', icon: 'bi-plug-fill' },
    'Carpintería': { name: 'Carpintería', icon: 'bi-hammer' },
    'Limpieza': { name: 'Limpieza', icon: 'bi-trash-fill' },
    // If you have more categories in your DB, add their translations here
};

/**
 * Load categories from API, render them, and register click handlers.
 */
export async function loadAndSetupCategories() {
    const container = document.getElementById('category-container');
    if (!container) return;

    try {
        const categoriesFromDB = await getCategories();
    container.innerHTML = ''; // Clear just in case

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

    // Wire listeners to the cards we just created
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', async () => {
                const categoryId = card.dataset.idCategory;
                const categoryName = card.dataset.nameCategory;
                
                // Remove 'active' class from all categories
                document.querySelectorAll('.category-card').forEach(c => {
                    c.classList.remove('active');
                });
                
                // Add 'active' class to the selected category
                card.classList.add('active');
                
                document.getElementById('services-title').textContent = `Servicios de ${categoryName}`;
                try {
                    const services = await getServices({ id_category: categoryId });
                    renderServices(services);
                } catch (error) {
                    console.error("Error loading services by category:", error);
                }
            });
        });

    } catch (error) {
    console.error("Error loading categories:", error);
        container.innerHTML = '<p class="text-danger">No se pudieron cargar las categorías.</p>';
    }
}

/**
 * Render service cards in the main container.
 * @param {Array} services - List of services to display.
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

    // After creating cards, configure images with fallback
    services.forEach((service, index) => {
        const img = container.querySelector(`img[data-service-index="${index}"]`);
        if (img) {
            setupImageFallback(img, service.provider_name, service.personal_picture, 60);
        }
    });
}

/**
 * Load cities from the API and populate the provider registration select.
 */
export async function loadCities() {
    const citySelect = document.getElementById('provider-city-select');
    if (!citySelect) return;
    try {
        const cities = await getCities();
    citySelect.innerHTML = '<option value="" disabled selected>Selecciona tu ciudad...</option>'; // Reset (UI-facing)
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
    // Choose the default category ID to display.
    // Based on your DB, 2 = Electricity. You can change this number.
        const defaultCategoryId = 2; 
        
        const services = await getServices({ id_category: defaultCategoryId });
        renderServices(services);
    document.getElementById('services-title').textContent = 'Servicios Destacados'; // Generic title in Spanish (UI-facing)
        
    // Highlight default category (Electricidad) if it exists
        setTimeout(() => {
            const defaultCategoryCard = document.querySelector(`[data-id-category="${defaultCategoryId}"]`);
            if (defaultCategoryCard) {
    // First clear all active categories
                document.querySelectorAll('.category-card').forEach(card => {
                    card.classList.remove('active');
                });
    // Then activate the default category
                defaultCategoryCard.classList.add('active');
            }
    }, 100); // Small delay to ensure categories are loaded
        
    } catch (error) {
    console.error("Error loading initial services:", error);
        const container = document.getElementById('services-container');
        if(container) container.innerHTML = '<p class="text-center text-danger">No se pudieron cargar los servicios destacados.</p>';
    }
}