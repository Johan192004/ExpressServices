// frontend/js/handlers/modalHandlers.js

import { startConversation, getServiceById } from '../api/authService.js';
import { openChatModal } from '../ui/chat.js';
import { showAlert } from '../utils/modalUtils.js';

// ===================================================================
// IMAGE HANDLING WITH INITIALS AVATAR FALLBACK
// ===================================================================

/**
 * Generate an SVG avatar with initials from the full name
 * @param {string} fullName - Provider full name
 * @param {number} size - Avatar size in pixels (default 60)
 * @returns {string} - SVG data URL
 */
function generateInitialsAvatar(fullName, size = 60) {
    // Get initials from name
    const initials = fullName
        .split(' ')
        .filter(name => name.length > 0)
        .map(name => name.charAt(0).toUpperCase())
        .slice(0, 2) // Solo las primeras 2 iniciales
        .join('');
    
    // Random yet consistent background colors based on name
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
    
    // Build SVG
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
 * Configure image handling with immediate initials avatar and background loading
 * @param {HTMLImageElement} img - Image element
 * @param {string} providerName - Provider name
 * @param {string} originalSrc - Original image URL
 * @param {number} size - Avatar size
 */
function setupImageFallback(img, providerName, originalSrc, size = 60) {
    // Immediately show initials avatar
    const initialsAvatar = generateInitialsAvatar(providerName, size);
    img.src = initialsAvatar;
    
    // Try loading the real image in the background
    if (originalSrc && originalSrc !== 'null' && originalSrc.trim() !== '') {
        const realImage = new Image();
        realImage.onload = function() {
            // If real image loads successfully, replace avatar
            img.src = originalSrc;
        };
        realImage.onerror = function() {
            // On failure, keep initials avatar
            console.log(`Failed to load image for ${providerName}, using initials avatar`);
        };
    // Start loading the real image
        realImage.src = originalSrc;
    }
}

// ===================================================================
// SPECIFIC MODALS LOGIC
// ===================================================================

/**
 * Wire internal logic for the register modal (role selection and reset).
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
 * Fetch service data from the API and display it in the details modal.
 * @param {string} serviceId - The service ID to display.
 */
async function showServiceDetailModal(serviceId) {
    const detailModalEl = document.getElementById('serviceDetailModal');
    if (!detailModalEl) {
        console.error('Error: template for modal #serviceDetailModal not found in HTML.');
        return;
    }
    
    const detailModal = new bootstrap.Modal(detailModalEl);
    const modalBody = document.getElementById('detail-modal-body');
    const modalTitle = document.getElementById('detail-modal-title');
    
    if (!modalBody || !modalTitle) {
        console.error('Error: missing internal elements in the details modal.');
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
        
    // Configure provider image with fallback via setTimeout to ensure element exists in DOM
        setTimeout(() => {
            const modalImg = document.getElementById('modal-provider-image');
            if (modalImg) {
                setupImageFallback(modalImg, service.provider_name, service.personal_picture, 120);
            }
    }, 50); // Small delay to ensure element is available
    } catch (error) {
        modalBody.innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
    }
}

// ===================================================================
// CLICK EVENT HANDLERS
// ===================================================================

/** Handle click on "Ver Más" button in a service card. */
function handleSeeMoreClick(target) {
    const serviceId = target.dataset.serviceId;
    showServiceDetailModal(serviceId);
}

/** Handle click on "Contactar" inside the details modal. */
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
// EXPORTED MAIN FUNCTION
// ===================================================================

/**
 * Wire all listeners related to modals on the page.
 */
export function setupModalListeners() {
    // 1) Wire internal logic for register modal
    setupRegisterModal();

    // 2) Global delegated listener for click actions
    document.body.addEventListener('click', (e) => {
        const seeMoreBtn = e.target.closest('.btn-see-more');
        const contactBtn = e.target.closest('#modal-contact-btn');
        const authModalLoginBtn = e.target.closest('#auth-modal-login-btn');
        const authModalRegisterBtn = e.target.closest('#auth-modal-register-btn');

        // If clicking on "Ver Más" in a service card
        if (seeMoreBtn) {
            const serviceId = seeMoreBtn.dataset.serviceId;
            showServiceDetailModal(serviceId);
        }
        // If clicking on "Contactar" INSIDE details modal
        else if (contactBtn) {
            const serviceId = contactBtn.dataset.serviceId;
            handleContactClick(contactBtn);
        }
        // If clicking on "Iniciar Sesión" INSIDE the auth prompt modal
        else if (authModalLoginBtn) {
            const authActionModal = bootstrap.Modal.getInstance(document.getElementById('authActionModal'));
            if (authActionModal) authActionModal.hide();
            // Wait for the first modal to close before opening the second
            setTimeout(() => new bootstrap.Modal(document.getElementById('loginModal')).show(), 300);
        }
        // If clicking on "Crear una Cuenta" INSIDE the auth prompt modal
        else if (authModalRegisterBtn) {
            const authActionModal = bootstrap.Modal.getInstance(document.getElementById('authActionModal'));
            if (authActionModal) authActionModal.hide();
            setTimeout(() => new bootstrap.Modal(document.getElementById('registerModal')).show(), 300);
        }
    });
}