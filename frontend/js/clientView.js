// frontend/js/clientView.js

import { getClientById, putClient, getUserProfile } from "./api/authService.js";
import { getServices, getCategories, getClientConversations, startConversation, getServiceById, createContract, getContracts, completeContract, deleteContract } from './api/authService.js';
import { openChatModal } from './ui/chat.js';
import { showAlert, showConfirm, cleanupModalBackdrops as cleanupModalBackdropsUtil } from './utils/modalUtils.js';
import { getFavoritesById, postFavorite, deleteFavorite } from "./api/favorites.js";
import { getReviewsByServiceId, postReview } from "./api/reviews.js";
import { initContractHistory } from './contractHistory.js';

// ===================================================================
// MAIN ENTRY POINT
// ===================================================================
let myClientId = null; // Logged-in user's client ID
let myUserId = null; // Logged-in user's user ID
let currentFavorites = []; // Stores favorite service IDs

// Reset global variable at start to avoid conflicts
window.currentServiceData = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1) Check if the user is allowed to be here
    if (!localStorage.getItem('token')) {
        showModal('Acceso Denegado', 'Debes iniciar sesión para acceder a esta página.', 'warning', () => {
            window.localStorage.clear();
            window.location.href = '/index.html';
        });
        return;
    }

    const userProfile = await getUserProfile();
    if (!userProfile.id_client) {
        showModal('Acceso Denegado', 'Debes tener un perfil de cliente para acceder a esta sección. Cerraremos tu sesión y te llevaremos al inicio.', 'error', () => {
            localStorage.clear();
            window.location.href = '/index.html';
        });
        return;
    }
    myClientId = userProfile.id_client;
    myUserId = userProfile.id_user; // Store user ID for validations

    // 2) Update the profile link with the user's name
    updateProfileLink(userProfile.full_name);

    // 3) Load user's favorites
    await loadCurrentFavorites();

    // 4) Load all dynamic components on the page
    initContractHistory(); // Initialize contract history system
    loadAndRenderClientConversations();
    loadAndSetupCategories();
    setupPageEventListeners();
    loadAndRenderClientContracts();
    setupFavoritesButton();
    setupProfileModal();
    setupScrollToTopButton(); // Set up scroll-to-top button
});


// ===================================================================
// SECTION 1: DATA LOADING AND RENDERING LOGIC
// ===================================================================

/**
 * Update the profile link in the header with the user's name.
 */
function updateProfileLink(fullName) {
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown && fullName) {
    // Extract only the first name to show in the header
        const firstName = fullName.split(' ')[0];
        profileDropdown.innerHTML = `<i class="bi bi-person-circle me-1"></i> ${firstName}`;
    profileDropdown.title = `Perfil de ${fullName}`; // Tooltip with full name (UI string stays Spanish)
        
    // Styles: blue background, white text, pill shape
    // Use Bootstrap classes for consistency and selectively override
        profileDropdown.className = 'btn btn-primary btn-sm dropdown-toggle';
        profileDropdown.style.cssText = `
            border-radius: 999px; /* pill shape */
            padding: 5px 14px;
            font-weight: 500;
            transition: all 0.18s ease;
            text-decoration: none;
            background-color: #0d6efd; /* bootstrap primary */
            color: #ffffff;
            border: none;
            box-shadow: 0 2px 6px rgba(13,110,253,0.18);
        `;
        
    // Tweak dropdown menu styles
        const dropdownMenu = profileDropdown.nextElementSibling;
        if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
            dropdownMenu.style.cssText = `
                border-radius: 8px !important;
                border: 1px solid #dee2e6 !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                padding: 8px 0 !important;
                overflow: visible !important;
            `;
            
            // Apply consistent styles to dropdown items
            const dropdownItems = dropdownMenu.querySelectorAll('.dropdown-item');
            dropdownItems.forEach(item => {
                item.style.cssText = `
                    border-radius: 0 !important;
                    padding: 8px 16px !important;
                    margin: 0 !important;
                    border: none !important;
                `;
            });
        }

    // Use onmouseenter/onmouseleave to avoid stacking listeners
        profileDropdown.onmouseenter = function() {
            this.style.backgroundColor = '#0b5ed7';
            this.style.transform = 'translateY(-1px)';
            this.style.boxShadow = '0 6px 14px rgba(13,110,253,0.22)';
        };

        profileDropdown.onmouseleave = function() {
            this.style.backgroundColor = '#0d6efd';
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 6px rgba(13,110,253,0.18)';
        };
    }
}

/**
 * Load user's current favorites from the API.
 */
async function loadCurrentFavorites() {
    if (!myClientId) return;
    try {
        const favorites = await getFavoritesById(myClientId);
        currentFavorites = favorites.map(fav => fav.id_service);
    } catch (error) {
    console.error('Error loading favorites:', error);
        currentFavorites = [];
    }
}

/**
 * Fetch client's conversations from the API and render them in the inbox.
 */
async function loadAndRenderClientConversations() {
    const container = document.getElementById('client-conversations-container');
    if (!container) return;
    container.innerHTML = '<p class="text-muted">Cargando mensajes...</p>';
    try {
        const conversations = await getClientConversations();
        container.innerHTML = '';
        if (conversations.length === 0) {
            container.innerHTML = '<div class="list-group-item"><p class="text-muted mb-0">No has iniciado ninguna conversación.</p></div>';
            return;
        }
        conversations.forEach(convo => {
            const createdRaw = convo.created_at_co_iso || convo.created_at;
            const createdAt = new Date(createdRaw);
            const dateCO = createdAt.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
            const fullCO = createdAt.toLocaleString('es-CO', { timeZone: 'America/Bogota', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            container.innerHTML += `
                <a href="#" class="list-group-item list-group-item-action conversation-item" data-conversation-id="${convo.id_conversation}">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1 fw-bold">${convo.provider_name}</h6>
                        <small class="text-muted" title="${fullCO}">${dateCO}</small>
                    </div>
                    <p class="mb-1 small">Conversación sobre: <strong>${convo.service_name}</strong></p>
                </a>`;
        });
    } catch (error) {
    console.error("Error loading conversations:", error);
        container.innerHTML = '<p class="text-danger">Error al cargar tus mensajes.</p>';
    }
}

/**
 * Fetch categories from the API, translate, and render on the page.
 */
async function loadAndSetupCategories() {
    const container = document.getElementById('category-container');
    if (!container) return;
    
    // Translation map based on DB Spanish titles
    const categoryTranslationMap = {
        'Plomería': { name: 'Plomería', icon: 'bi-wrench-adjustable' },
        'Electricidad': { name: 'Electricidad', icon: 'bi-plug-fill' },
        'Carpintería': { name: 'Carpintería', icon: 'bi-hammer' },
        'Limpieza': { name: 'Limpieza', icon: 'bi-trash-fill' }, 
    };

    try {
        const categories = await getCategories();
        container.innerHTML = '';
        categories.forEach(category => {
            // Lookup translation; fallback to DB name if missing
            const translation = categoryTranslationMap[category.title] || { name: category.title, icon: 'bi-tools' };
            container.innerHTML += `
                <div class="col-6 col-md-3">
                    <div class="category-card" style="cursor: pointer;" data-id-category="${category.id_category}" data-name-category="${translation.name}">
                         <div class="icon-wrapper"><i class="bi ${translation.icon}"></i></div>
                         <p class="small">${translation.name}</p>
                    </div>
                </div>`;
        });
    } catch (error) {
    container.innerHTML = '<p class="text-danger small">No se pudieron cargar las categorías.</p>';
    }
}
/**
 * Render a list of services in the container.
 */
function renderServices(services) {
    const servicesContainer = document.getElementById("servicio-container");
    if (!servicesContainer) return;
    servicesContainer.innerHTML = "";
    if (services.length === 0) {
        servicesContainer.innerHTML = '<p class="text-center text-muted col-12">No se encontraron servicios en esta categoría.</p>';
        return;
    }
    
    services.forEach(service => {
        const isFavorite = currentFavorites.includes(service.id_service);
        const cardElement = document.createElement('div');
        cardElement.className = 'col';
        cardElement.innerHTML = `
            <div class="card service-card h-100">
                <div class="card-body text-center d-flex flex-column">
                    <img alt="${service.provider_name}" class="provider-avatar">
                    <h5 class="card-title mt-3 fw-bold">${service.name}</h5>
                    <p class="card-text text-muted small">Por ${service.provider_name}</p>
                    <p class="card-text small flex-grow-1">${(service.description || '').substring(0, 80)}...</p>
                    <button class="btn btn-link p-0 favorite-btn" data-service-id="${service.id_service}" title="${isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                        <i class="bi ${isFavorite ? 'bi-star-fill text-warning' : 'bi-star'}" style="font-size: 1.5rem;"></i>
                    </button>
                    <hr>
                    <button class="btn btn-sm btn-outline-primary btn-see-more mt-auto" data-service-id="${service.id_service}">Ver Detalles</button>
                </div>
            </div>`;
        
    // Set image fallback after adding to the DOM
        const img = cardElement.querySelector('.provider-avatar');
        setupImageFallback(img, service.provider_name, service.personal_picture, 60);
        
        servicesContainer.appendChild(cardElement);
    });
}

/**
 * Show a modal with detailed information about a service.
 */
async function showServiceDetailModal(serviceId) {
    // Aggressively clear any previous modal and residual backdrops
    const existingModal = document.getElementById('serviceDetailModal');
    if (existingModal) {
        const modalInstance = bootstrap.Modal.getInstance(existingModal);
        if (modalInstance) {
            modalInstance.dispose();
        }
        existingModal.remove();
    }
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    
    // Clear the global variable before loading new data
    window.currentServiceData = null;
    
    
    try {
        const service = await getServiceById(serviceId);
        window.currentServiceData = service;
        
    // Verify if the logged-in user is the same who offers the service
        
    const isOwnService = myUserId && service.id_user && myUserId === service.id_user;
        
        // Create buttons conditionally
        let actionButtons = '';
        if (isOwnService) {
            // If it's their own service, show informational message
            actionButtons = `
                <div>
                    <button type="button" class="btn btn-outline-dark me-2" id="btn-show-reviews">Ver reviews</button>
                    <span class="text-muted small">
                        <i class="bi bi-info-circle me-1"></i>Este es tu servicio
                    </span>
                </div>
                <div>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                </div>`;
        } else {
            // If it's not their service, show normal action buttons
            actionButtons = `
                <div>
                    <button type="button" class="btn btn-outline-dark me-2" id="btn-show-reviews">Ver reviews</button>
                    <button type="button" class="btn btn-success" id="modal-propose-contract-btn">Contratar Horas</button>
                </div>
                <div>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    <button type="button" class="btn btn-primary btn-glow" id="modal-contact-btn" data-service-id="${service.id_service}">Contactar</button>
                </div>`;
        }
        
        const modalHtml = `
            <div class="modal fade" id="serviceDetailModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title fw-bold">${service.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-4 text-center">
                                    <img class="img-fluid rounded-circle mb-3" style="width: 120px; height: 120px; object-fit: cover; aspect-ratio: 1/1;" alt="${service.provider_name}" id="modal-provider-avatar">
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
                        </div>
                        <div class="modal-footer border-0 justify-content-between">
                            ${actionButtons}
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
    // Set fallback for modal image after inserting into DOM
        const modalImg = document.getElementById('modal-provider-avatar');
        setupImageFallback(modalImg, service.provider_name, service.personal_picture, 120);
        
    // Wait briefly to ensure DOM updates fully
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const serviceModal = new bootstrap.Modal(document.getElementById('serviceDetailModal'));
        serviceModal.show();
        

    // Event to show reviews (now in the footer)
        document.getElementById('btn-show-reviews').addEventListener('click', async () => {
            // Temporarily hide the service detail modal
            const detailModal = bootstrap.Modal.getInstance(document.getElementById('serviceDetailModal'));
            if (detailModal) {
                detailModal.hide();
            }
            
            // Wait for the modal to fully hide and then show reviews
            document.getElementById('serviceDetailModal').addEventListener('hidden.bs.modal', function showReviewsAfterHide() {
                showReviewsModal(service.id_service, serviceId);
                // Remove this listener to avoid multiple executions
                this.removeEventListener('hidden.bs.modal', showReviewsAfterHide);
            });
        });
        
    // Cleanup backdrop when this modal closes
        document.getElementById('serviceDetailModal').addEventListener('hidden.bs.modal', function() {
            cleanupModalBackdrops();
            // Only reset the global variable if the modal is closing for good
            // (not temporarily to display another modal)
            setTimeout(() => {
                // If after 100ms there are no other open modals, then clear
                const openModals = document.querySelectorAll('.modal.show');
                if (openModals.length === 0) {
                    window.currentServiceData = null;
                }
            }, 100);
        });
        
    } catch (error) {
    showModal('Error', 'Error al cargar detalles del servicio.', 'error');
    }
}

/**
 * Handle favorite button click to add or remove favorites.
 * @param {string} serviceId - Service ID.
 */
async function toggleFavorite(serviceId) {
    if (!myClientId) {
        showModal('Iniciar Sesión', 'Debes iniciar sesión para agregar favoritos.', 'warning');
        return;
    }

    const isFavorite = currentFavorites.includes(parseInt(serviceId));
    
    try {
        if (isFavorite) {
            // Remove from favorites
            await deleteFavorite({ id_client: myClientId, id_service: serviceId });
            currentFavorites = currentFavorites.filter(id => id !== parseInt(serviceId));
        } else {
            // Add to favorites
            await postFavorite({ id_client: myClientId, id_service: serviceId });
            currentFavorites.push(parseInt(serviceId));
        }
        
    // Update the star icon in the UI
        const favoriteBtn = document.querySelector(`[data-service-id="${serviceId}"].favorite-btn`);
        if (favoriteBtn) {
            const icon = favoriteBtn.querySelector('i');
            const newIsFavorite = currentFavorites.includes(parseInt(serviceId));
            
            if (newIsFavorite) {
                icon.className = 'bi bi-star-fill text-warning';
                favoriteBtn.title = 'Quitar de favoritos';
            } else {
                icon.className = 'bi bi-star';
                favoriteBtn.title = 'Agregar a favoritos';
            }
        }
        
    } catch (error) {
    console.error('Error updating favorites:', error);
        showModal('Error', 'Error al actualizar favoritos. Inténtalo de nuevo.', 'error');
    }
}

/**
 * Open a modal to display the client's favorite services.
 */
async function showFavoriteServices() {
    if (!myClientId) {
        showModal('Error', 'No se encontró tu id de cliente.', 'error');
        return;
    }
    
    // Reload current favorites
    await loadCurrentFavorites();
    
    let favorites = [];
    try {
        favorites = await getFavoritesById(myClientId);
    } catch (err) {
        showModal('Error', 'No se pudieron cargar tus favoritos.', 'error');
        return;
    }
    
    // Remove previous modal if it exists
    let oldModal = document.getElementById('favoritesModal');
    if (oldModal) oldModal.remove();

    let modalHtml = `
        <div class="modal fade" id="favoritesModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title fw-bold">Mis Favoritos</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row g-3" id="favorites-container">
                            ${favorites.length === 0 ? '<p class="text-center text-muted">No tienes servicios favoritos.</p>' : ''}
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add favorite cards with image fallback
    const favoritesContainer = document.getElementById('favorites-container');
    favorites.forEach(service => {
        const cardElement = document.createElement('div');
        cardElement.className = 'col-md-6';
        cardElement.innerHTML = `
            <div class="card h-100">
                <div class="card-body text-center d-flex flex-column">
                    <img alt="${service.provider_name}" class="provider-avatar mb-2">
                    <h5 class="card-title fw-bold">${service.name}</h5>
                    <p class="card-text text-muted small">Por ${service.provider_name}</p>
                    <p class="card-text small flex-grow-1">${(service.description || '').substring(0, 80)}...</p>
                    <h6 class="fw-bold text-primary mt-2">$${(service.hour_price || 0).toLocaleString('es-CO')} / hora</h6>
                    <button class="btn btn-sm btn-outline-primary btn-see-more mt-2" data-service-id="${service.id_service}">Ver Detalles</button>
                </div>
            </div>`;
        
    // Set image fallback after adding to the DOM
        const img = cardElement.querySelector('.provider-avatar');
        setupImageFallback(img, service.provider_name, service.personal_picture, 60);
        
        favoritesContainer.appendChild(cardElement);
    });
    
    const favoritesModal = new bootstrap.Modal(document.getElementById('favoritesModal'));
    favoritesModal.show();
    
    // Clean up backdrop when the favorites modal closes normally
    document.getElementById('favoritesModal').addEventListener('hidden.bs.modal', function() {
        cleanupModalBackdrops();
    });
    
    // Add event listener for "Ver Detalles" buttons inside the favorites modal
    document.getElementById('favoritesModal').addEventListener('click', (e) => {
        const seeMoreBtn = e.target.closest('.btn-see-more');
        if (seeMoreBtn) {
            e.preventDefault(); // Prevent default behavior
            e.stopPropagation(); // Stop event from bubbling to global listener
            
            const serviceId = seeMoreBtn.dataset.serviceId;
            
            // Close the favorites modal completely and clean the backdrop
            favoritesModal.hide();
            
            // Ensure the backdrop is fully removed
            favoritesModal._element.addEventListener('hidden.bs.modal', function handleModalHidden() {
                // Remove any leftover backdrops
                document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
                
                // Restore body scroll state
                document.body.classList.remove('modal-open');
                document.body.style.removeProperty('padding-right');
                
                // Clear previous data before showing the new modal
                window.currentServiceData = null;
                
                // Show the service detail modal
                showServiceDetailModal(serviceId);
                
                // Remove this event listener to avoid multiple executions
                this.removeEventListener('hidden.bs.modal', handleModalHidden);
            });
        }
    });
}

/**
 * Show a modal with the reviews of a specific service.
 */
async function showReviewsModal(serviceId) {
    // Remove previous reviews modal if it exists
    let oldModal = document.getElementById('reviewsModal');
    if (oldModal) oldModal.remove();

    // Clean any residual backdrops before creating the new modal
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());

    try {
        const reviews = await getReviewsByServiceId(serviceId);
        
        const modalHtml = `
            <div class="modal fade" id="reviewsModal" tabindex="-1" data-bs-backdrop="true" data-bs-keyboard="true">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title fw-bold">Reviews del Servicio</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${reviews.length === 0 ? 
                                '<p class="text-center text-muted">Este servicio aún no tiene reviews.</p>' : 
                                reviews.map(review => `
                                    <div class="card mb-3">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between align-items-start mb-2">
                                                <h6 class="card-title mb-0">${review.full_name}</h6>
                                                <div class="text-warning">
                                                    ${'★'.repeat(review.stars)}${'☆'.repeat(5 - review.stars)}
                                                </div>
                                            </div>
                                            <p class="card-text">${review.description}</p>
                                            <small class="text-muted">
                                                ${review.created_at ? 
                                                    new Date(review.created_at).toLocaleDateString('es-ES', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) : 'Fecha no disponible'
                                                }
                                            </small>
                                        </div>
                                    </div>
                                `).join('')
                            }
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
    // Create the modal with explicit config to ensure the backdrop
        const reviewsModal = new bootstrap.Modal(document.getElementById('reviewsModal'), {
            backdrop: true,
            keyboard: true,
            focus: true
        });
        reviewsModal.show();
        
    // Setup event to restore the detail modal when the reviews modal closes
        document.getElementById('reviewsModal').addEventListener('hidden.bs.modal', function() {
            // Clean residual backdrops
            cleanupModalBackdrops();
            
            // Immediately restore the service detail modal
            const serviceDetailModal = document.getElementById('serviceDetailModal');
            if (serviceDetailModal) {
                const detailModal = new bootstrap.Modal(serviceDetailModal);
                detailModal.show();
            }
    }, { once: true }); // Execute once
        
    } catch (error) {
    console.error('Error loading reviews:', error);
        showModal('Error', 'Error al cargar las reviews del servicio.', 'error');
        
    // If there is an error, also restore the detail modal immediately
        const serviceDetailModal = document.getElementById('serviceDetailModal');
        if (serviceDetailModal) {
            const detailModal = new bootstrap.Modal(serviceDetailModal);
            detailModal.show();
        }
    }
}

/**
 * Utility function to clean residual backdrops from Bootstrap modals
 */
function cleanupModalBackdrops() {
    // Delegate to shared utility to avoid duplication
    try {
        cleanupModalBackdropsUtil();
    } catch (_) {
    // Defensive fallback
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('padding-right');
        document.body.style.removeProperty('overflow');
    }
}

/**
 * Show a custom modal instead of alert()
 * @param {string} title - Modal title
 * @param {string} message - Message to show
 * @param {string} type - Modal type: 'success', 'error', 'warning', 'info'
 * @param {function} onConfirm - Callback on confirm (optional)
 */
function showModal(title, message, type = 'info', onConfirm = null) {
    // Use shared utility; keeps consistent styles and behavior
    return showAlert(message, type, title).then(() => {
        if (typeof onConfirm === 'function') onConfirm();
    });
}

/**
 * Show a confirmation modal instead of confirm()
 * @param {string} title - Modal title
 * @param {string} message - Confirmation message
 * @param {function} onConfirm - Callback if confirmed
 * @param {function} onCancel - Callback if canceled (optional)
 */
function showConfirmModal(title, message, onConfirm, onCancel = null) {
    return showConfirm(message, title).then(confirmed => {
        if (confirmed) {
            if (typeof onConfirm === 'function') onConfirm();
        } else if (typeof onCancel === 'function') {
            onCancel();
        }
    });
}

/**
 * Show an input modal instead of prompt()
 * @param {string} title - Modal title
 * @param {string} message - Instruction message
 * @param {string} defaultValue - Default input value
 * @param {string} inputType - Input type: 'text', 'number', etc.
 * @param {function} onConfirm - Callback with the entered value
 * @param {function} onCancel - Callback if canceled (optional)
 */
function showPromptModal(title, message, defaultValue = '', inputType = 'text', onConfirm, onCancel = null) {
    // Remove previous prompt modal if it exists
    const existingModal = document.getElementById('promptModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHtml = `
        <div class="modal fade" id="promptModal" tabindex="-1" data-bs-backdrop="false" data-bs-keyboard="true" style="z-index: 1070;">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-pencil-square me-2"></i>
                            ${title}
                        </h5>
                    </div>
                    <div class="modal-body py-4">
                        <div class="text-center mb-3">
                            <i class="bi bi-pencil-square text-primary" style="font-size: 3rem;"></i>
                        </div>
                        <p class="mb-3 text-center">${message}</p>
                        <div class="form-group">
                            <input type="${inputType}" 
                                   class="form-control form-control-lg text-center" 
                                   id="promptInput" 
                                   value="${defaultValue}"
                                   placeholder="Ingresa el valor..."
                                   ${inputType === 'number' ? 'min="0" step="0.1"' : ''}>
                        </div>
                    </div>
                    <div class="modal-footer justify-content-center border-0">
                        <button type="button" class="btn btn-secondary px-4 me-2" id="promptModalCancel">Cancelar</button>
                        <button type="button" class="btn btn-primary px-4" id="promptModalConfirm">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('promptModal'));
    const input = document.getElementById('promptInput');
    
    
    modal.show();
    
    // Focus and select the input after the modal is shown
    document.getElementById('promptModal').addEventListener('shown.bs.modal', function() {
        input.focus();
        input.select();
    });
    
    // Handle buttons
    document.getElementById('promptModalConfirm').addEventListener('click', () => {
        const value = input.value.trim();
        modal.hide();
        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm(value);
        }
    });
    
    document.getElementById('promptModalCancel').addEventListener('click', () => {
        modal.hide();
        if (onCancel && typeof onCancel === 'function') {
            onCancel();
        }
    });
    
    // Allow submitting with Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('promptModalConfirm').click();
        }
    });
    
    // Remove the modal from the DOM when hidden
    document.getElementById('promptModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    // Do NOT call cleanupModalBackdrops() here to avoid interfering with detail modal stacking
    });
}

/**
 * Show a modal for the client to leave a review before marking the contract as completed
 * @param {string} contractId - Contract ID
 * @param {string} serviceId - Service ID
 * @param {string} serviceName - Service name
 * @param {string} providerName - Provider name
 * @param {function} onComplete - Callback after submitting review and completing contract
 */
function showReviewModal(contractId, serviceId, serviceName, providerName, onComplete) {

    // Remove previous review modal if it exists
    const existingModal = document.getElementById('reviewModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHtml = `
        <div class="modal fade" id="reviewModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-star-fill me-2"></i>
                            Califica tu experiencia
                        </h5>
                    </div>
                    <div class="modal-body py-4">
                        <div class="text-center mb-4">
                            <i class="bi bi-emoji-smile text-primary" style="font-size: 3rem;"></i>
                            <h6 class="mt-2">¿Cómo fue tu experiencia con el servicio?</h6>
                            <p class="text-muted small"><strong>${serviceName}</strong> por ${providerName}</p>
                        </div>
                        
                        <form id="review-form">
                            <div class="mb-4">
                                <label class="form-label text-center d-block">Calificación</label>
                                <div class="text-center">
                                    <div class="rating-stars" id="rating-stars">
                                        <i class="bi bi-star star-rating" data-rating="1"></i>
                                        <i class="bi bi-star star-rating" data-rating="2"></i>
                                        <i class="bi bi-star star-rating" data-rating="3"></i>
                                        <i class="bi bi-star star-rating" data-rating="4"></i>
                                        <i class="bi bi-star star-rating" data-rating="5"></i>
                                    </div>
                                    <input type="hidden" id="selected-rating" value="0">
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="review-description" class="form-label">Comparte tu experiencia</label>
                                <textarea class="form-control" id="review-description" rows="4" 
                                          placeholder="Cuéntanos cómo fue el servicio, qué te gustó o qué podría mejorar..."
                                          required></textarea>
                            </div>
                            
                            <div class="text-muted small mb-3">
                                <i class="bi bi-info-circle me-1"></i>
                                Tu review ayudará a otros usuarios a tomar mejores decisiones.
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer justify-content-between border-0">
                        <button type="button" class="btn btn-secondary px-4" id="reviewModalSkip">Omitir Review</button>
                        <button type="button" class="btn btn-primary px-4" id="reviewModalSubmit" disabled>Enviar Review y Finalizar</button>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            .star-rating {
                font-size: 2rem;
                color: #ddd;
                cursor: pointer;
                transition: color 0.2s ease;
                margin: 0 2px;
            }
            .star-rating:hover,
            .star-rating.active {
                color: #ffc107;
            }
            .rating-stars:hover .star-rating {
                color: #ddd;
            }
        </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('reviewModal'));
    modal.show();
    
    let selectedRating = 0;
    
    // Handle rating stars
    const stars = document.querySelectorAll('.star-rating');
    const submitBtn = document.getElementById('reviewModalSubmit');
    const descriptionTextarea = document.getElementById('review-description');
    
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            selectedRating = index + 1;
            document.getElementById('selected-rating').value = selectedRating;
            
            // Update star visuals
            stars.forEach((s, i) => {
                if (i < selectedRating) {
                    s.classList.add('active');
                    s.classList.remove('bi-star');
                    s.classList.add('bi-star-fill');
                } else {
                    s.classList.remove('active');
                    s.classList.remove('bi-star-fill');
                    s.classList.add('bi-star');
                }
            });
            
            checkFormValidity();
        });
        
    // Hover effect
        star.addEventListener('mouseenter', () => {
            stars.forEach((s, i) => {
                if (i <= index) {
                    s.style.color = '#ffc107';
                } else {
                    s.style.color = '#ddd';
                }
            });
        });
    });
    
    // Restore colors on hover exit
    document.getElementById('rating-stars').addEventListener('mouseleave', () => {
        stars.forEach((s, i) => {
            if (i < selectedRating) {
                s.style.color = '#ffc107';
            } else {
                s.style.color = '#ddd';
            }
        });
    });
    
    // Validate form
    function checkFormValidity() {
        const description = descriptionTextarea.value.trim();
        const hasRating = selectedRating > 0;
        const hasDescription = description.length >= 10;
        
        submitBtn.disabled = !(hasRating && hasDescription);
    }
    
    descriptionTextarea.addEventListener('input', checkFormValidity);
    
    // Handle submit review button
    submitBtn.addEventListener('click', async () => {
        const description = descriptionTextarea.value.trim();
        
        if (selectedRating === 0 || description.length < 10) {
            showModal('Datos Incompletos', 'Por favor selecciona una calificación y escribe al menos 10 caracteres en tu comentario.', 'warning');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
        
        try {
            // Send the review
            const reviewData = {
                id_service: serviceId,
                id_client: myClientId,
                stars: selectedRating,
                description: description
            };
            
            
            const reviewResult = await postReview(reviewData);
            
            if (reviewResult.error) {
                throw new Error(reviewResult.error);
            }
            
            // Mark the contract as completed
            await completeContract(contractId);
            
            modal.hide();
            showModal('¡Gracias!', 'Tu review ha sido enviada y el servicio ha sido marcado como terminado.', 'success');
            
            if (onComplete && typeof onComplete === 'function') {
                onComplete();
            }
            
        } catch (error) {
            showModal('Error', `Error al enviar la review: ${error.message}`, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Enviar Review y Finalizar';
        }
    });
    
    // Handle skip review button
    document.getElementById('reviewModalSkip').addEventListener('click', async () => {
        showConfirmModal(
            'Omitir Review',
            '¿Estás seguro de que quieres finalizar el servicio sin dejar una review?',
            async () => {
                try {
                    await completeContract(contractId);
                    modal.hide();
                    showModal('Servicio Finalizado', 'El servicio ha sido marcado como terminado.', 'success');
                    
                    if (onComplete && typeof onComplete === 'function') {
                        onComplete();
                    }
                } catch (error) {
                    showModal('Error', `Error al finalizar: ${error.message}`, 'error');
                }
            }
        );
    });
    
    // Remove the modal from the DOM when hidden
    document.getElementById('reviewModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
        cleanupModalBackdrops();
    });
}

/**
 * Generate an SVG avatar with initials from full name
 * @param {string} fullName - Provider's full name
 * @param {number} size - Avatar size in pixels (default 60)
 * @returns {string} - SVG data URL
 */
function generateInitialsAvatar(fullName, size = 60) {
    // Get initials from the name
    const initials = fullName
        .split(' ')
        .filter(name => name.length > 0)
        .map(name => name.charAt(0).toUpperCase())
    .slice(0, 2) // Only the first 2 initials
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
// SECTION 2: EVENT LOGIC (SINGLE DELEGATED HANDLER)
// ===================================================================
function setupPageEventListeners() {
    document.body.addEventListener('click', async (e) => {
        const target = e.target;
        
    // --- Resolve click target using .closest() for robustness ---
        const categoryCard = target.closest('.category-card');
        const seeMoreBtn = target.closest('.btn-see-more');
        const contactBtn = target.closest('#modal-contact-btn');
        const conversationLink = target.closest('.conversation-item');
        const proposeContractBtn = target.closest('#modal-propose-contract-btn');
        const confirmContractBtn = target.closest('#confirm-contract-btn');
        const favoriteBtn = target.closest('.favorite-btn');
        const deleteContractBtn = target.closest('.btn-delete-contract');
        const completeContractBtn = target.closest('.btn-complete-contract');

    // --- Logic per click target ---

        if (categoryCard) {
            const categoryId = categoryCard.dataset.idCategory;
            const categoryName = categoryCard.dataset.nameCategory;
            const servicesTitle = document.getElementById('h2Services');
            const servicesSection = document.getElementById('servicesSection');

            // Remove 'active' class from all categories
            document.querySelectorAll('.category-card').forEach(card => {
                card.classList.remove('active');
            });
            
            // Add 'active' class to the selected category
            categoryCard.classList.add('active');

            if (servicesTitle) servicesTitle.textContent = `Servicios de ${categoryName}`;
            if (servicesSection) servicesSection.classList.remove('d-none');
            
            try {
                const services = await getServices({ id_category: categoryId });
                renderServices(services);
            } catch (error) { console.error("Error loading services:", error); }
        }
        else if (favoriteBtn) {
            e.preventDefault();
            const serviceId = favoriteBtn.dataset.serviceId;
            await toggleFavorite(serviceId);
        }
        else if (seeMoreBtn) {
            const serviceId = seeMoreBtn.dataset.serviceId;
            
            // Clear previous data before showing the new modal
            window.currentServiceData = null;
            showServiceDetailModal(serviceId);
        }
        else if (contactBtn) {
            const serviceId = contactBtn.dataset.serviceId;
            
            // Check if it's their own service
            const service = window.currentServiceData;
            const isOwnService = myUserId && service && service.id_user && myUserId === service.id_user;
            if (isOwnService) {
                showModal('Acción no permitida', 'No puedes contactar tu propio servicio.', 'warning');
                return;
            }
            
            const detailModal = bootstrap.Modal.getInstance(document.getElementById('serviceDetailModal'));
            if (detailModal) detailModal.hide();
            try {
                const result = await startConversation(serviceId);
                // Refresh the messages section after starting the conversation
                await loadAndRenderClientConversations();
                setTimeout(() => openChatModal(result.id_conversation), 300);
            } catch (error) {
                 if (error.message.includes('iniciar sesión') || error.message.includes('Sesión expirada')) {
                    new bootstrap.Modal(document.getElementById('authActionModal')).show();
                } else {
                    showModal('Error', error.message, 'error');
                }
            }
        }
        else if (conversationLink) {
            e.preventDefault();
            const conversationId = conversationLink.dataset.conversationId;
            openChatModal(conversationId);
        }
        else if (proposeContractBtn) {
            const service = window.currentServiceData;
            if (!service) {
                showModal('Error', 'No se encontró la información del servicio. Por favor, cierra y vuelve a abrir el modal.', 'error');
                return;
            }

            // Check if it's their own service
            const isOwnService = myUserId && service.id_user && myUserId === service.id_user;
            if (isOwnService) {
                showModal('Acción no permitida', 'No puedes contratar tu propio servicio.', 'warning');
                return;
            }

            // DO NOT hide the detail modal; just show the prompt on top
            showPromptModal(
                'Contratar Servicio',
                `¿Cuántas horas del servicio "${service.name}" deseas contratar?`,
                '1',
                'number',
                (hours) => {
                    if (!hours || isNaN(hours) || parseFloat(hours) <= 0) {
                        showModal('Datos Inválidos', 'Por favor, ingresa un número de horas válido.', 'warning');
                        return;
                    }

                    // Now hide the detail modal to show the summary
                    const detailModalEl = document.getElementById('serviceDetailModal');
                    const detailModal = bootstrap.Modal.getInstance(detailModalEl);
                    
                    if (detailModal) {
                        // Wait for the modal to fully hide before showing the summary
                        detailModalEl.addEventListener('hidden.bs.modal', function showSummaryAfterHide() {
                            // Proceed with contract confirmation
                            const agreed_hours = parseFloat(hours);
                            const total_price = service.hour_price * agreed_hours;

                            document.getElementById('summary-service-name').textContent = service.name;
                            document.getElementById('summary-provider-name').textContent = service.provider_name;
                            document.getElementById('summary-hours').textContent = agreed_hours;
                            document.getElementById('summary-total-price').textContent = `$${total_price.toLocaleString('es-CO')}`;
                            
                            const confirmBtn = document.getElementById('confirm-contract-btn');
                            confirmBtn.dataset.serviceId = service.id_service;
                            confirmBtn.dataset.agreedHours = agreed_hours;

                            // Create summary modal with explicit backdrop configuration
                            const summaryModal = new bootstrap.Modal(document.getElementById('contractSummaryModal'), {
                                backdrop: true,
                                keyboard: true,
                                focus: true
                            });
                            summaryModal.show();
                            
                            // Remove this listener to avoid multiple executions
                            detailModalEl.removeEventListener('hidden.bs.modal', showSummaryAfterHide);
                        });
                        
                        detailModal.hide();
                    } else {
                        // If no detail modal, show the summary directly
                        const agreed_hours = parseFloat(hours);
                        const total_price = service.hour_price * agreed_hours;

                        document.getElementById('summary-service-name').textContent = service.name;
                        document.getElementById('summary-provider-name').textContent = service.provider_name;
                        document.getElementById('summary-hours').textContent = agreed_hours;
                        document.getElementById('summary-total-price').textContent = `$${total_price.toLocaleString('es-CO')}`;
                        
                        const confirmBtn = document.getElementById('confirm-contract-btn');
                        confirmBtn.dataset.serviceId = service.id_service;
                        confirmBtn.dataset.agreedHours = agreed_hours;

                        const summaryModal = new bootstrap.Modal(document.getElementById('contractSummaryModal'), {
                            backdrop: true,
                            keyboard: true,
                            focus: true
                        });
                        summaryModal.show();
                    }
                },
                () => {
                    // If canceled, do nothing - the detail modal remains open
                }
            );
        }
        else if (confirmContractBtn) {
            const serviceId = confirmContractBtn.dataset.serviceId;
            const agreedHours = confirmContractBtn.dataset.agreedHours;
            
            confirmContractBtn.disabled = true;
            confirmContractBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Enviando...`;

            try {
                const result = await createContract({ id_service: serviceId, agreed_hours: agreedHours });
                
                const summaryModal = bootstrap.Modal.getInstance(document.getElementById('contractSummaryModal'));
                if (summaryModal) summaryModal.hide();

                const providerName = document.getElementById('summary-provider-name').textContent;
                showModal('¡Éxito!', `${result.message}\nHas propuesto contratar ${agreedHours} horas con ${providerName}.`, 'success');

                // Auto reload contracts list
                loadAndRenderClientContracts();

            } catch (error) {
                showModal('Error', `Error al enviar la oferta: ${error.message}`, 'error');
            } finally {
                confirmContractBtn.disabled = false;
                confirmContractBtn.innerHTML = 'Confirmar y Enviar Oferta';
            }
        }
                else if (deleteContractBtn) {
            const contractId = deleteContractBtn.dataset.contractId;
            showConfirmModal(
                'Eliminar Contrato',
                '¿Estás seguro de que deseas eliminar este contrato de tu vista?',
                async () => {
                    try {
                        await deleteContract(contractId);
                        showModal('¡Éxito!', 'Contrato eliminado de tu vista.', 'success');
                        loadAndRenderClientContracts(); // Reload list
                    } catch (error) {
                        showModal('Error', `Error al eliminar: ${error.message}`, 'error');
                    }
                }
            );
        }
        else if (completeContractBtn) {
            const contractId = completeContractBtn.dataset.contractId;
            const serviceId = completeContractBtn.dataset.serviceId;
            const serviceName = completeContractBtn.dataset.serviceName;
            const providerName = completeContractBtn.dataset.providerName;
            
            
            
            // Show the review modal before completing the contract
            showReviewModal(contractId, serviceId, serviceName, providerName, () => {
                loadAndRenderClientContracts(); // Reload list
            });
        }
    });

    // Add global cleanup when ESC is pressed
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            setTimeout(cleanupModalBackdrops, 100);
        }
    });
}

async function loadAndRenderClientContracts() {
    const container = document.getElementById('client-contracts-container');
    if (!container) return;
    container.innerHTML = '<p class="text-muted">Cargando contratos...</p>';

    try {
        const allContracts = await getContracts({selected_rol: 'client'});
        
    // Filter contracts: show only those NOT completed by both parties
        const activeContracts = allContracts.filter(contract => {
            // Hide contracts completed by both (history loads from backend in modal)
            const isCompletedByBoth = contract.client_marked_completed && contract.provider_marked_completed;
            return !isCompletedByBoth;
        });
        
        if (activeContracts.length === 0) {
            container.innerHTML = '<p class="text-muted">No tienes contratos activos.</p>';
            return;
        }

        const getContractDisplay = (contract) => {
            let badge = '';
            let actions = '';

            // Logic to determine state and actions (active contracts only)
            if (contract.status === 'accepted') {
                if (contract.client_marked_completed) {
                    badge = `<span class="badge bg-info">Esperando Proveedor</span>`;
                    actions = ''; // Already confirmed; no further actions for the client
                } else {
                    badge = `<span class="badge bg-success">Aceptado</span>`;
                    actions = `<button class="btn btn-sm btn-info btn-complete-contract" 
                                      data-contract-id="${contract.id_contract}"
                                      data-service-id="${contract.id_service}"
                                      data-service-name="${contract.service_name}"
                                      data-provider-name="${contract.provider_name}">Marcar Terminado</button>`;
                }
            } else if (contract.status === 'denied') {
                badge = `<span class="badge bg-danger">Rechazado</span>`;
                actions = `<button class="btn btn-sm btn-outline-danger btn-delete-contract" data-contract-id="${contract.id_contract}">🗑️</button>`;
            } else { // pending
                badge = `<span class="badge bg-warning">Pendiente</span>`;
                actions = ''; // No actions while pending
            }

            return { badge, actions };
        };

    container.innerHTML = ''; // Clear container
        activeContracts.forEach(contract => {
            const { badge, actions } = getContractDisplay(contract);
            
            container.innerHTML += `
                <div class="card mb-2">
                    <div class="card-body p-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <p class="mb-0 small"><strong>${contract.service_name}</strong></p>
                                <p class="card-text text-muted small mb-0">Con: ${contract.provider_name}</p>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                ${badge}
                                ${actions}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

    } catch (error) {
    console.error("Error loading client contracts:", error);
        container.innerHTML = '<p class="text-danger">Error al cargar los contratos.</p>';
    }
}
/**
 * Set up favorites button in the navbar
 */
function setupFavoritesButton() {
    const favBtn = document.getElementById('show-favorites-btn');
    if (favBtn) {
        favBtn.addEventListener('click', showFavoriteServices);
    }
}

/**
 * Set up client's profile modal
 */
function setupProfileModal() {
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            // Remove previous modal if exists
            let oldModal = document.getElementById('clientProfileModal');
            if (oldModal) oldModal.remove();

            // Get id_client
            if (!myClientId) {
                showModal('Error', 'No se encontró tu id de cliente.', 'error');
                return;
            }

            // Get client data
            let clientData;
            try {
                clientData = await getClientById(myClientId);
            } catch (err) {
                showModal('Error', 'No se pudo cargar tu información de perfil.', 'error');
                return;
            }

            // Create the modal
            const modalHtml = `
                <div class="modal fade" id="clientProfileModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <form id="client-profile-form">
                                <div class="modal-header">
                                    <h5 class="modal-title">Mi Perfil</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="mb-3">
                                        <label for="profile-full-name" class="form-label">Nombre completo</label>
                                        <input type="text" class="form-control" id="profile-full-name" name="full_name" value="${clientData[0].full_name || ''}" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="profile-email" class="form-label">Correo electrónico</label>
                                        <input type="email" class="form-control" id="profile-email" name="email" value="${clientData[0].email || ''}" readonly disabled>
                                    </div>
                                    <div class="mb-3 text-end">
                                        <button type="button" class="btn btn-link p-0" id="btn-reset-password">Cambiar contraseña</button>
                                    </div>
                                    <div id="profile-update-msg" class="text-success small"></div>
                                </div>
                                <div class="modal-footer">
                                    <button type="submit" class="btn btn-primary">Actualizar</button>
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('clientProfileModal'));
            modal.show();

            // Handle form submit
            document.getElementById('client-profile-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                const full_name = form.full_name.value.trim();
                // Email cannot be modified
                try {
                    await putClient(myClientId, { full_name });
                    document.getElementById('profile-update-msg').textContent = 'Perfil actualizado con éxito.';
                    // Close the modal after 2 seconds
                    setTimeout(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('clientProfileModal'));
                        if (modal) modal.hide();
                    }, 2000);
                } catch (err) {
                    document.getElementById('profile-update-msg').textContent = 'Error al actualizar el perfil.';
                }
            });

            // Event to trigger password reset
            document.getElementById('btn-reset-password').addEventListener('click', async () => {
                const email = clientData[0].email;
                if (!email) {
                    showModal('Error', 'No se encontró el correo.', 'error');
                    return;
                }
                try {
                    await import('./api/authService.js').then(mod => mod.requestPasswordReset(email));
                    showModal('¡Éxito!', 'Se ha enviado un enlace de reseteo de contraseña a tu correo.', 'success');
                } catch (err) {
                    showModal('Error', 'No se pudo enviar el correo de reseteo.', 'error');
                }
            });
        });
    }
}

// SCROLL-TO-TOP BUTTON
function setupScrollToTopButton() {
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    
    if (!scrollToTopBtn) {
        console.error('Scroll-to-top button not found');
        return;
    }
        
    // Simple immediate scroll behavior
    scrollToTopBtn.onclick = function() {        
    // Immediate scroll for quick response
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
    };

    // Show/hide button based on scroll position
    window.onscroll = function() {
        if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
            scrollToTopBtn.style.opacity = '1';
            scrollToTopBtn.style.visibility = 'visible';
        } else {
            scrollToTopBtn.style.opacity = '0.7';
            scrollToTopBtn.style.visibility = 'visible';
        }
    };
}