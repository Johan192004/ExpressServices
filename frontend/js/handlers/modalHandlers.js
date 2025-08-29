// frontend/js/handlers/modalHandlers.js

import { startConversation, getServiceById } from '../api/authService.js';
import { openChatModal } from '../ui/chat.js';
import { showAlert } from '../utils/modalUtils.js';

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
// LÓGICA DE MODALES ESPECÍFICOS
// ===================================================================

/**
 * Configura la lógica interna del modal de registro (selección de rol y reseteo).
 */
function setupRegisterModal() {
    const roleSelector = document.getElementById('role-selector');
    const clientFormContainer = document.getElementById('client-form-container');
    const providerFormContainer = document.getElementById('provider-form-container');
    const showClientFormBtn = document.getElementById('showClientFormBtn');
    const showProviderFormBtn = document.getElementById('showProviderFormBtn');
    const registerModalElement = document.getElementById('registerModal');

    const showForm = (formToShow) => {
        if(roleSelector) roleSelector.classList.add('d-none');
        if(formToShow) formToShow.classList.remove('d-none');
    };

    if (showClientFormBtn) showClientFormBtn.addEventListener('click', () => showForm(clientFormContainer));
    if (showProviderFormBtn) showProviderFormBtn.addEventListener('click', () => showForm(providerFormContainer));

    if (registerModalElement) {
        registerModalElement.addEventListener('hidden.bs.modal', () => {
            if(roleSelector) roleSelector.classList.remove('d-none');
            if(clientFormContainer) clientFormContainer.classList.add('d-none');
            if(providerFormContainer) providerFormContainer.classList.add('d-none');
            document.getElementById('clientForm')?.reset();
            document.getElementById('providerForm')?.reset();
        });
    }
}

/**
 * Pide los datos de un servicio a la API y los muestra en el modal de detalles.
 * @param {string} serviceId - El ID del servicio a mostrar.
 */
async function showServiceDetailModal(serviceId) {
    const detailModalEl = document.getElementById('serviceDetailModal');
    if (!detailModalEl) {
        console.error('Error: El molde del modal #serviceDetailModal no se encontró en el HTML.');
        return;
    }
    
    const detailModal = new bootstrap.Modal(detailModalEl);
    const modalBody = document.getElementById('detail-modal-body');
    const modalTitle = document.getElementById('detail-modal-title');
    
    if (!modalBody || !modalTitle) {
        console.error('Error: Faltan elementos internos en el modal de detalles.');
        return;
    }

    modalTitle.textContent = 'Cargando...';
    modalBody.innerHTML = `<div class="text-center p-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div></div>`;
    detailModal.show();

    try {
        const service = await getServiceById(serviceId);
        modalTitle.textContent = service.name;
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-4 text-center">
                    <img src="" class="img-fluid rounded-circle mb-3" style="width: 120px; height: 120px; object-fit: cover;" alt="${service.provider_name}" id="modal-provider-image">
                    <h5 class="fw-bold">${service.provider_name}</h5>
                    <p class="text-muted small">${service.bio || ''}</p>
                </div>
                <div class="col-md-8">
                    <p class="text-muted">Categoría: ${service.category_title || 'No especificada'}</p>
                    <p>${service.description}</p>
                    <hr>
                    <p><strong>Años de experiencia:</strong> ${service.experience_years}</p>
                    <h4 class="fw-bold text-primary">$${(service.hour_price || 0).toLocaleString('es-CO')} / hora</h4>
                </div>
            </div>
            <div class="modal-footer mt-3 border-0">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                <button type="button" class="btn btn-primary btn-glow" id="modal-contact-btn" data-service-id="${service.id_service}">Contactar al Proveedor</button>
            </div>
        `;
        
        // Configurar la imagen del proveedor con fallback de avatar usando setTimeout para asegurar que el elemento esté en el DOM
        setTimeout(() => {
            const modalImg = document.getElementById('modal-provider-image');
            if (modalImg) {
                setupImageFallback(modalImg, service.provider_name, service.personal_picture, 120);
            }
        }, 50); // Pequeño delay para asegurar que el elemento esté disponible
    } catch (error) {
        modalBody.innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
    }
}

// ===================================================================
// MANEJADORES DE EVENTOS DE CLIC (HANDLERS)
// ===================================================================

/** Maneja el clic en el botón "Ver Más" de una tarjeta de servicio. */
function handleSeeMoreClick(target) {
    const serviceId = target.dataset.serviceId;
    showServiceDetailModal(serviceId);
}

/** Maneja el clic en el botón "Contactar" dentro del modal de detalles. */
async function handleContactClick(target) {
    const serviceId = target.dataset.serviceId;
    
    const detailModal = bootstrap.Modal.getInstance(document.getElementById('serviceDetailModal'));
    if (detailModal) detailModal.hide();

    try {
        const result = await startConversation(serviceId);
        setTimeout(() => openChatModal(result.id_conversation), 300);
    } catch (error) {
        if (error.message.includes('iniciar sesión') || error.message.includes('Sesión expirada')) {
            const authModal = new bootstrap.Modal(document.getElementById('authActionModal'));
            authModal.show();
        } else {
            await showAlert(`Error: ${error.message}`, 'error');
        }
    }
}

// ===================================================================
// FUNCIÓN PRINCIPAL EXPORTADA
// ===================================================================

/**
 * Configura todos los listeners relacionados con modales en la página.
 */
export function setupModalListeners() {
    // 1. Configura la lógica interna del modal de registro
    setupRegisterModal();

    // 2. Listener general que delega los clics a las funciones correspondientes
    document.body.addEventListener('click', (e) => {
        const seeMoreBtn = e.target.closest('.btn-see-more');
        const contactBtn = e.target.closest('#modal-contact-btn');
        const authModalLoginBtn = e.target.closest('#auth-modal-login-btn');
        const authModalRegisterBtn = e.target.closest('#auth-modal-register-btn');

        // Si se hace clic en "Ver Más" en una tarjeta de servicio
        if (seeMoreBtn) {
            const serviceId = seeMoreBtn.dataset.serviceId;
            showServiceDetailModal(serviceId);
        }
        // Si se hace clic en "Contactar" DENTRO del modal de detalles
        else if (contactBtn) {
            const serviceId = contactBtn.dataset.serviceId;
            handleContactClick(contactBtn);
        }
        // Si se hace clic en "Iniciar Sesión" DENTRO del modal elegante
        else if (authModalLoginBtn) {
            const authActionModal = bootstrap.Modal.getInstance(document.getElementById('authActionModal'));
            if (authActionModal) authActionModal.hide();
            // Esperamos a que el primer modal se cierre para abrir el segundo
            setTimeout(() => new bootstrap.Modal(document.getElementById('loginModal')).show(), 300);
        }
        // Si se hace clic en "Crear una Cuenta" DENTRO del modal elegante
        else if (authModalRegisterBtn) {
            const authActionModal = bootstrap.Modal.getInstance(document.getElementById('authActionModal'));
            if (authActionModal) authActionModal.hide();
            setTimeout(() => new bootstrap.Modal(document.getElementById('registerModal')).show(), 300);
        }
    });
}