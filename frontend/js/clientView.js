// frontend/js/clientView.js

import { getClientById, putClient, getUserProfile } from "./api/authService.js";
import { getServices, getCategories, getClientConversations, startConversation, getServiceById, createContract, getContracts, completeContract, deleteContract } from './api/authService.js';
import { openChatModal } from './ui/chat.js';
import { getFavoritesById, postFavorite, deleteFavorite } from "./api/favorites.js";
import { getReviewsByServiceId, postReview } from "./api/reviews.js";
import { initContractHistory, addContractToHistory, checkAndMoveToHistory } from './contractHistory.js';

// ===================================================================
// PUNTO DE ENTRADA PRINCIPAL
// ===================================================================
let myClientId = null; // El ID de cliente del usuario logueado
let myUserId = null; // El ID de usuario del usuario logueado
let currentFavorites = []; // Array para almacenar los IDs de servicios favoritos

// Limpiar variable global al iniciar para evitar conflictos
window.currentServiceData = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificamos si el usuario tiene permiso para estar aquí
    if (!localStorage.getItem('token')) {
        showModal('Acceso Denegado', 'Debes iniciar sesión para acceder a esta página.', 'warning', () => {
            window.location.href = '/frontend/index.html';
        });
        return;
    }

    const userProfile = await getUserProfile();
    if (!userProfile.id_client) {
        showModal('Acceso Denegado', 'Debes tener un perfil de cliente para acceder a esta sección. Cerraremos tu sesión y te llevaremos al inicio.', 'error', () => {
            localStorage.removeItem('token');
            window.location.href = '/frontend/index.html';
        });
        return;
    }
    myClientId = userProfile.id_client;
    myUserId = userProfile.id_user; // Almacenar el ID de usuario para verificaciones

    // 2. Actualizar el enlace de perfil con el nombre del usuario
    updateProfileLink(userProfile.full_name);

    // 3. Cargamos los favoritos del usuario
    await loadCurrentFavorites();

    // 4. Cargamos todos los componentes dinámicos de la página
    initContractHistory(); // Inicializar sistema de historial de contratos
    loadAndRenderClientConversations();
    loadAndSetupCategories();
    setupPageEventListeners();
    loadAndRenderClientContracts();
    setupFavoritesButton();
    setupProfileModal();
    setupScrollToTopButton(); // Configurar botón de scroll
});


// ===================================================================
// SECCIÓN 1: LÓGICA DE CARGA Y RENDERIZACIÓN DE DATOS
// ===================================================================

/**
 * Actualiza el enlace de perfil en el header con el nombre del usuario.
 */
function updateProfileLink(fullName) {
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown && fullName) {
        // Extraer solo el primer nombre para mostrar en el header
        const firstName = fullName.split(' ')[0];
        profileDropdown.innerHTML = `<i class="bi bi-person-circle me-1"></i> ${firstName}`;
        profileDropdown.title = `Perfil de ${fullName}`; // Tooltip con el nombre completo
        
        // Agregar estilos: fondo azul, texto blanco, forma ovalada
        // Usamos clases de Bootstrap para consistencia y luego sobreescribimos
        profileDropdown.className = 'btn btn-primary btn-sm dropdown-toggle';
        profileDropdown.style.cssText = `
            border-radius: 999px; /* ovalado */
            padding: 5px 14px;
            font-weight: 500;
            transition: all 0.18s ease;
            text-decoration: none;
            background-color: #0d6efd; /* bootstrap primary */
            color: #ffffff;
            border: none;
            box-shadow: 0 2px 6px rgba(13,110,253,0.18);
        `;
        
        // Quitar el borde circular del dropdown menu
        const dropdownMenu = profileDropdown.nextElementSibling;
        if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
            dropdownMenu.style.cssText = `
                border-radius: 8px !important;
                border: 1px solid #dee2e6 !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                padding: 8px 0 !important;
                overflow: visible !important;
            `;
            
            // También aplicar estilos a los items del dropdown
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

        // Usar propiedades onmouseenter/onmouseleave para evitar múltiples listeners
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
 * Carga los favoritos actuales del usuario desde la API.
 */
async function loadCurrentFavorites() {
    if (!myClientId) return;
    try {
        const favorites = await getFavoritesById(myClientId);
        currentFavorites = favorites.map(fav => fav.id_service);
    } catch (error) {
        console.error('Error al cargar favoritos:', error);
        currentFavorites = [];
    }
}

/**
 * Pide las conversaciones del cliente a la API y las muestra en la bandeja de entrada.
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
            container.innerHTML += `
                <a href="#" class="list-group-item list-group-item-action conversation-item" data-conversation-id="${convo.id_conversation}">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1 fw-bold">${convo.provider_name}</h6>
                        <small class="text-muted">${new Date(convo.created_at).toLocaleDateString()}</small>
                    </div>
                    <p class="mb-1 small">Conversación sobre: <strong>${convo.service_name}</strong></p>
                </a>`;
        });
    } catch (error) {
        console.error("Error al cargar conversaciones:", error);
        container.innerHTML = '<p class="text-danger">Error al cargar tus mensajes.</p>';
    }
}

/**
 * Pide las categorías a la API, las traduce y las muestra en la página.
 */
async function loadAndSetupCategories() {
    const container = document.getElementById('category-container');
    if (!container) return;
    
    // ▼▼▼ MAPA DE TRADUCCIÓN CORREGIDO Y COMPLETO ▼▼▼
    const categoryTranslationMap = {
        'Plumbing': { name: 'Plomería', icon: 'bi-wrench-adjustable' },
        'Electricity': { name: 'Electricidad', icon: 'bi-plug-fill' },
        'Carpentry': { name: 'Carpintería', icon: 'bi-hammer' },
        'Cleaning': { name: 'Limpieza', icon: 'bi-trash-fill' }, 
    };

    try {
        const categories = await getCategories();
        container.innerHTML = '';
        categories.forEach(category => {
            // Buscamos la traducción; si no existe, usamos el nombre de la DB
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
 * "Pinta" una lista de servicios en su contenedor correspondiente.
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
        
        // Configurar fallback para la imagen después de agregar al DOM
        const img = cardElement.querySelector('.provider-avatar');
        setupImageFallback(img, service.provider_name, service.personal_picture, 60);
        
        servicesContainer.appendChild(cardElement);
    });
}

/**
 * Muestra un modal con la información detallada de un servicio.
 */
async function showServiceDetailModal(serviceId) {
    // Limpiar cualquier modal anterior y backdrop residual de manera más agresiva
    const existingModal = document.getElementById('serviceDetailModal');
    if (existingModal) {
        const modalInstance = bootstrap.Modal.getInstance(existingModal);
        if (modalInstance) {
            modalInstance.dispose();
        }
        existingModal.remove();
    }
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    
    // Limpiar la variable global antes de cargar nuevos datos
    window.currentServiceData = null;
    
    
    try {
        const service = await getServiceById(serviceId);
        window.currentServiceData = service;
        
        // Verificar si el usuario logueado es el mismo que ofrece el servicio
        console.log('=== DEBUG VERIFICACIÓN DE SERVICIO ===');
        console.log('myUserId:', myUserId, 'tipo:', typeof myUserId);
        console.log('Objeto service completo:', service);
        console.log('service.id_user:', service.id_user, 'tipo:', typeof service.id_user);
        console.log('service.provider_id:', service.provider_id, 'tipo:', typeof service.provider_id);
        console.log('service.user_id:', service.user_id, 'tipo:', typeof service.user_id);
        console.log('¿Son iguales?:', myUserId === service.id_user);
        console.log('¿Ambos existen?:', myUserId && service.id_user);
        console.log('=====================================');
        
        const isOwnService = myUserId && service.id_user && myUserId === service.id_user;
        console.log('isOwnService final:', isOwnService);
        
        // Crear botones condicionalmente
        let actionButtons = '';
        if (isOwnService) {
            console.log('Mostrando como PROPIO servicio');
            // Si es su propio servicio, mostrar mensaje informativo
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
            console.log('Mostrando como servicio de OTRO');
            // Si no es su servicio, mostrar botones normales
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
        
        // Configurar fallback para la imagen del modal después de agregar al DOM
        const modalImg = document.getElementById('modal-provider-avatar');
        setupImageFallback(modalImg, service.provider_name, service.personal_picture, 120);
        
        // Esperar un poco para asegurar que el DOM se actualice completamente
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const serviceModal = new bootstrap.Modal(document.getElementById('serviceDetailModal'));
        serviceModal.show();
        

        // Evento para mostrar reviews (ahora en el footer)
        document.getElementById('btn-show-reviews').addEventListener('click', async () => {
            // Ocultar el modal de detalles del servicio temporalmente
            const detailModal = bootstrap.Modal.getInstance(document.getElementById('serviceDetailModal'));
            if (detailModal) {
                detailModal.hide();
            }
            
            // Esperar a que el modal se oculte completamente y luego mostrar reviews
            document.getElementById('serviceDetailModal').addEventListener('hidden.bs.modal', function showReviewsAfterHide() {
                showReviewsModal(service.id_service, serviceId);
                // Remover este listener para evitar múltiples ejecuciones
                this.removeEventListener('hidden.bs.modal', showReviewsAfterHide);
            });
        });
        
        // Limpiar backdrop cuando se cierre este modal
        document.getElementById('serviceDetailModal').addEventListener('hidden.bs.modal', function() {
            cleanupModalBackdrops();
            // Solo limpiar la variable global si el modal se está cerrando definitivamente
            // (no temporalmente para mostrar otro modal)
            setTimeout(() => {
                // Si después de 100ms no hay otros modales abiertos, entonces limpiar
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
 * Maneja el clic en el botón de favoritos para agregar o quitar de favoritos.
 * @param {string} serviceId - El ID del servicio.
 */
async function toggleFavorite(serviceId) {
    if (!myClientId) {
        showModal('Iniciar Sesión', 'Debes iniciar sesión para agregar favoritos.', 'warning');
        return;
    }

    const isFavorite = currentFavorites.includes(parseInt(serviceId));
    
    try {
        if (isFavorite) {
            // Quitar de favoritos
            await deleteFavorite({ id_client: myClientId, id_service: serviceId });
            currentFavorites = currentFavorites.filter(id => id !== parseInt(serviceId));
        } else {
            // Agregar a favoritos
            await postFavorite({ id_client: myClientId, id_service: serviceId });
            currentFavorites.push(parseInt(serviceId));
        }
        
        // Actualizar la estrella en la interfaz
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
        console.error('Error al actualizar favoritos:', error);
        showModal('Error', 'Error al actualizar favoritos. Inténtalo de nuevo.', 'error');
    }
}

/**
 * Abre un modal para visualizar los servicios favoritos del cliente.
 */
async function showFavoriteServices() {
    if (!myClientId) {
        showModal('Error', 'No se encontró tu id de cliente.', 'error');
        return;
    }
    
    // Recargar favoritos actuales
    await loadCurrentFavorites();
    
    let favorites = [];
    try {
        favorites = await getFavoritesById(myClientId);
    } catch (err) {
        showModal('Error', 'No se pudieron cargar tus favoritos.', 'error');
        return;
    }
    
    // Eliminar modal anterior si existe
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
    
    // Agregar las tarjetas de favoritos con fallback de imágenes
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
        
        // Configurar fallback para la imagen después de agregar al DOM
        const img = cardElement.querySelector('.provider-avatar');
        setupImageFallback(img, service.provider_name, service.personal_picture, 60);
        
        favoritesContainer.appendChild(cardElement);
    });
    
    const favoritesModal = new bootstrap.Modal(document.getElementById('favoritesModal'));
    favoritesModal.show();
    
    // Limpiar backdrop cuando se cierre el modal de favoritos normalmente
    document.getElementById('favoritesModal').addEventListener('hidden.bs.modal', function() {
        cleanupModalBackdrops();
    });
    
    // Agregar event listener para los botones "Ver Detalles" dentro del modal de favoritos
    document.getElementById('favoritesModal').addEventListener('click', (e) => {
        const seeMoreBtn = e.target.closest('.btn-see-more');
        if (seeMoreBtn) {
            e.preventDefault(); // Prevenir comportamiento por defecto
            e.stopPropagation(); // Evitar que el evento se propague al listener global
            
            const serviceId = seeMoreBtn.dataset.serviceId;
            
            // Cerrar el modal de favoritos completamente y limpiar el backdrop
            favoritesModal.hide();
            
            // Asegurar que el backdrop se elimine completamente
            favoritesModal._element.addEventListener('hidden.bs.modal', function handleModalHidden() {
                // Remover cualquier backdrop que pueda quedar
                document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
                
                // Restaurar el scroll del body
                document.body.classList.remove('modal-open');
                document.body.style.removeProperty('padding-right');
                
                // Limpiar datos previos antes de mostrar el nuevo modal
                window.currentServiceData = null;
                
                // Mostrar el modal de detalles del servicio
                showServiceDetailModal(serviceId);
                
                // Remover este event listener para evitar múltiples ejecuciones
                this.removeEventListener('hidden.bs.modal', handleModalHidden);
            });
        }
    });
}

/**
 * Muestra un modal con las reviews de un servicio específico.
 */
async function showReviewsModal(serviceId) {
    // Eliminar modal anterior si existe
    let oldModal = document.getElementById('reviewsModal');
    if (oldModal) oldModal.remove();

    // Limpiar cualquier backdrop residual antes de crear el nuevo modal
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
        
        // Crear el modal con configuración explícita para asegurar el backdrop
        const reviewsModal = new bootstrap.Modal(document.getElementById('reviewsModal'), {
            backdrop: true,
            keyboard: true,
            focus: true
        });
        reviewsModal.show();
        
        // Configurar evento para restaurar el modal de detalles cuando se cierre el modal de reviews
        document.getElementById('reviewsModal').addEventListener('hidden.bs.modal', function() {
            // Limpiar backdrops residuales
            cleanupModalBackdrops();
            
            // Restaurar el modal de detalles del servicio inmediatamente
            const serviceDetailModal = document.getElementById('serviceDetailModal');
            if (serviceDetailModal) {
                const detailModal = new bootstrap.Modal(serviceDetailModal);
                detailModal.show();
            }
        }, { once: true }); // Solo ejecutar una vez
        
    } catch (error) {
        console.error('Error al cargar reviews:', error);
        showModal('Error', 'Error al cargar las reviews del servicio.', 'error');
        
        // Si hay error, también restaurar el modal de detalles inmediatamente
        const serviceDetailModal = document.getElementById('serviceDetailModal');
        if (serviceDetailModal) {
            const detailModal = new bootstrap.Modal(serviceDetailModal);
            detailModal.show();
        }
    }
}

/**
 * Función utilitaria para limpiar backdrops residuales de Bootstrap modals
 */
function cleanupModalBackdrops() {
    // Remover todos los backdrops
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    
    // Restaurar el estado del body
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('overflow');
}

/**
 * Muestra un modal personalizado en lugar de alert()
 * @param {string} title - Título del modal
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de modal: 'success', 'error', 'warning', 'info'
 * @param {function} onConfirm - Función a ejecutar al hacer clic en "Aceptar" (opcional)
 */
function showModal(title, message, type = 'info', onConfirm = null) {
    // Limpiar modal anterior si existe
    const existingModal = document.getElementById('customModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Definir colores y iconos según el tipo
    const modalConfig = {
        success: {
            headerClass: 'bg-success text-white',
            icon: 'bi-check-circle-fill',
            iconColor: 'text-success',
            buttonClass: 'btn-success'
        },
        error: {
            headerClass: 'bg-danger text-white',
            icon: 'bi-exclamation-triangle-fill',
            iconColor: 'text-danger',
            buttonClass: 'btn-danger'
        },
        warning: {
            headerClass: 'bg-warning text-dark',
            icon: 'bi-exclamation-triangle-fill',
            iconColor: 'text-warning',
            buttonClass: 'btn-warning'
        },
        info: {
            headerClass: 'bg-primary text-white',
            icon: 'bi-info-circle-fill',
            iconColor: 'text-primary',
            buttonClass: 'btn-primary'
        }
    };
    
    const config = modalConfig[type] || modalConfig.info;
    
    const modalHtml = `
        <div class="modal fade" id="customModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header ${config.headerClass}">
                        <h5 class="modal-title">
                            <i class="bi ${config.icon} me-2"></i>
                            ${title}
                        </h5>
                    </div>
                    <div class="modal-body text-center py-4">
                        <i class="bi ${config.icon} ${config.iconColor}" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <p class="mb-0" style="font-size: 1.1rem;">${message}</p>
                    </div>
                    <div class="modal-footer justify-content-center border-0">
                        <button type="button" class="btn ${config.buttonClass} px-4" id="customModalConfirm">Aceptar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('customModal'));
    modal.show();
    
    // Manejar el botón de confirmación
    document.getElementById('customModalConfirm').addEventListener('click', () => {
        modal.hide();
        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm();
        }
    });
    
    // Limpiar el modal del DOM cuando se oculte
    document.getElementById('customModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
        cleanupModalBackdrops();
    });
}

/**
 * Muestra un modal de confirmación en lugar de confirm()
 * @param {string} title - Título del modal
 * @param {string} message - Mensaje de confirmación
 * @param {function} onConfirm - Función a ejecutar si confirma
 * @param {function} onCancel - Función a ejecutar si cancela (opcional)
 */
function showConfirmModal(title, message, onConfirm, onCancel = null) {
    // Limpiar modal anterior si existe
    const existingModal = document.getElementById('confirmModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHtml = `
        <div class="modal fade" id="confirmModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title">
                            <i class="bi bi-question-circle-fill me-2"></i>
                            ${title}
                        </h5>
                    </div>
                    <div class="modal-body text-center py-4">
                        <i class="bi bi-question-circle-fill text-warning" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <p class="mb-0" style="font-size: 1.1rem;">${message}</p>
                    </div>
                    <div class="modal-footer justify-content-center border-0">
                        <button type="button" class="btn btn-secondary px-4 me-2" id="confirmModalCancel">Cancelar</button>
                        <button type="button" class="btn btn-warning px-4" id="confirmModalConfirm">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    modal.show();
    
    // Manejar botones
    document.getElementById('confirmModalConfirm').addEventListener('click', () => {
        modal.hide();
        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm();
        }
    });
    
    document.getElementById('confirmModalCancel').addEventListener('click', () => {
        modal.hide();
        if (onCancel && typeof onCancel === 'function') {
            onCancel();
        }
    });
    
    // Limpiar el modal del DOM cuando se oculte
    document.getElementById('confirmModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
        cleanupModalBackdrops();
    });
}

/**
 * Muestra un modal de entrada de datos en lugar de prompt()
 * @param {string} title - Título del modal
 * @param {string} message - Mensaje de instrucción
 * @param {string} defaultValue - Valor por defecto del input
 * @param {string} inputType - Tipo de input: 'text', 'number', etc.
 * @param {function} onConfirm - Función a ejecutar con el valor ingresado
 * @param {function} onCancel - Función a ejecutar si cancela (opcional)
 */
function showPromptModal(title, message, defaultValue = '', inputType = 'text', onConfirm, onCancel = null) {
    // Limpiar modal anterior si existe
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
    
    // Enfocar y seleccionar el input después de que se muestre el modal
    document.getElementById('promptModal').addEventListener('shown.bs.modal', function() {
        input.focus();
        input.select();
    });
    
    // Manejar botones
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
    
    // Permitir confirmar con Enter
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('promptModalConfirm').click();
        }
    });
    
    // Limpiar el modal del DOM cuando se oculte
    document.getElementById('promptModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
        // NO llamar cleanupModalBackdrops() aquí para no interferir con el modal de detalles
    });
}

/**
 * Muestra un modal para que el cliente deje una review del servicio antes de marcar como terminado
 * @param {string} contractId - ID del contrato
 * @param {string} serviceId - ID del servicio
 * @param {string} serviceName - Nombre del servicio
 * @param {string} providerName - Nombre del proveedor
 * @param {function} onComplete - Función a ejecutar después de completar la review y el contrato
 */
function showReviewModal(contractId, serviceId, serviceName, providerName, onComplete) {
    console.log('=== SHOW REVIEW MODAL ===');
    console.log('Parámetros recibidos:');
    console.log('contractId:', contractId, 'tipo:', typeof contractId);
    console.log('serviceId:', serviceId, 'tipo:', typeof serviceId);
    console.log('serviceName:', serviceName, 'tipo:', typeof serviceName);
    console.log('providerName:', providerName, 'tipo:', typeof providerName);
    console.log('========================');
    
    // Limpiar modal anterior si existe
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
    
    // Manejar las estrellas de calificación
    const stars = document.querySelectorAll('.star-rating');
    const submitBtn = document.getElementById('reviewModalSubmit');
    const descriptionTextarea = document.getElementById('review-description');
    
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            selectedRating = index + 1;
            document.getElementById('selected-rating').value = selectedRating;
            
            // Actualizar visualización de estrellas
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
        
        // Efecto hover
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
    
    // Restaurar colores al salir del hover
    document.getElementById('rating-stars').addEventListener('mouseleave', () => {
        stars.forEach((s, i) => {
            if (i < selectedRating) {
                s.style.color = '#ffc107';
            } else {
                s.style.color = '#ddd';
            }
        });
    });
    
    // Validar formulario
    function checkFormValidity() {
        const description = descriptionTextarea.value.trim();
        const hasRating = selectedRating > 0;
        const hasDescription = description.length >= 10;
        
        submitBtn.disabled = !(hasRating && hasDescription);
    }
    
    descriptionTextarea.addEventListener('input', checkFormValidity);
    
    // Manejar botón de enviar review
    submitBtn.addEventListener('click', async () => {
        const description = descriptionTextarea.value.trim();
        
        if (selectedRating === 0 || description.length < 10) {
            showModal('Datos Incompletos', 'Por favor selecciona una calificación y escribe al menos 10 caracteres en tu comentario.', 'warning');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
        
        try {
            // Enviar la review
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
            
            // Marcar el contrato como completado
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
    
    // Manejar botón de omitir review
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
    
    // Limpiar el modal del DOM cuando se oculte
    document.getElementById('reviewModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
        cleanupModalBackdrops();
    });
}

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
// SECCIÓN 2: LÓGICA DE EVENTOS (MANEJADOR ÚNICO)
// ===================================================================
function setupPageEventListeners() {
    document.body.addEventListener('click', async (e) => {
        const target = e.target;
        
        // --- Buscamos el objetivo del clic usando .closest() para más robustez ---
        const categoryCard = target.closest('.category-card');
        const seeMoreBtn = target.closest('.btn-see-more');
        const contactBtn = target.closest('#modal-contact-btn');
        const conversationLink = target.closest('.conversation-item');
        const proposeContractBtn = target.closest('#modal-propose-contract-btn');
        const confirmContractBtn = target.closest('#confirm-contract-btn');
        const favoriteBtn = target.closest('.favorite-btn');
        const deleteContractBtn = target.closest('.btn-delete-contract');
        const completeContractBtn = target.closest('.btn-complete-contract');

        // --- Lógica para cada tipo de clic ---

        if (categoryCard) {
            const categoryId = categoryCard.dataset.idCategory;
            const categoryName = categoryCard.dataset.nameCategory;
            const servicesTitle = document.getElementById('h2Services');
            const servicesSection = document.getElementById('servicesSection');

            // Remover clase 'active' de todas las categorías
            document.querySelectorAll('.category-card').forEach(card => {
                card.classList.remove('active');
            });
            
            // Agregar clase 'active' a la categoría seleccionada
            categoryCard.classList.add('active');

            if (servicesTitle) servicesTitle.textContent = `Servicios de ${categoryName}`;
            if (servicesSection) servicesSection.classList.remove('d-none');
            
            try {
                const services = await getServices({ id_category: categoryId });
                renderServices(services);
            } catch (error) { console.error("Error al cargar servicios:", error); }
        }
        else if (favoriteBtn) {
            e.preventDefault();
            const serviceId = favoriteBtn.dataset.serviceId;
            await toggleFavorite(serviceId);
        }
        else if (seeMoreBtn) {
            const serviceId = seeMoreBtn.dataset.serviceId;
            
            // Limpiar datos previos antes de mostrar el nuevo modal
            window.currentServiceData = null;
            showServiceDetailModal(serviceId);
        }
        else if (contactBtn) {
            const serviceId = contactBtn.dataset.serviceId;
            
            // Verificar si es su propio servicio
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
                // Actualizar la sección de mensajes después de iniciar la conversación
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

            // Verificar si es su propio servicio
            const isOwnService = myUserId && service.id_user && myUserId === service.id_user;
            if (isOwnService) {
                showModal('Acción no permitida', 'No puedes contratar tu propio servicio.', 'warning');
                return;
            }

            // NO ocultar el modal de detalles, simplemente mostrar el prompt encima
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

                    // Ahora sí ocultar el modal de detalles para mostrar el resumen
                    const detailModalEl = document.getElementById('serviceDetailModal');
                    const detailModal = bootstrap.Modal.getInstance(detailModalEl);
                    
                    if (detailModal) {
                        // Esperar a que el modal se oculte completamente antes de mostrar el resumen
                        detailModalEl.addEventListener('hidden.bs.modal', function showSummaryAfterHide() {
                            // Proceder con la confirmación del contrato
                            const agreed_hours = parseFloat(hours);
                            const total_price = service.hour_price * agreed_hours;

                            document.getElementById('summary-service-name').textContent = service.name;
                            document.getElementById('summary-provider-name').textContent = service.provider_name;
                            document.getElementById('summary-hours').textContent = agreed_hours;
                            document.getElementById('summary-total-price').textContent = `$${total_price.toLocaleString('es-CO')}`;
                            
                            const confirmBtn = document.getElementById('confirm-contract-btn');
                            confirmBtn.dataset.serviceId = service.id_service;
                            confirmBtn.dataset.agreedHours = agreed_hours;

                            // Crear el modal de resumen con configuración explícita del backdrop
                            const summaryModal = new bootstrap.Modal(document.getElementById('contractSummaryModal'), {
                                backdrop: true,
                                keyboard: true,
                                focus: true
                            });
                            summaryModal.show();
                            
                            // Remover este listener para evitar múltiples ejecuciones
                            detailModalEl.removeEventListener('hidden.bs.modal', showSummaryAfterHide);
                        });
                        
                        detailModal.hide();
                    } else {
                        // Si no hay modal de detalles, mostrar directamente el resumen
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
                    // Si se cancela, no hacer nada - el modal de detalles sigue abierto
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

                // Recargar automáticamente la lista de contratos
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
                        loadAndRenderClientContracts(); // Recargamos la lista
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
            
            
            
            // Mostrar el modal de review antes de completar el contrato
            showReviewModal(contractId, serviceId, serviceName, providerName, () => {
                loadAndRenderClientContracts(); // Recargamos la lista
            });
        }
    });

    // Agregar limpieza global cuando se presione ESC
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
        
        // Filtrar contratos: solo mostrar los que NO están completados por ambas partes
        const activeContracts = allContracts.filter(contract => {
            const isCompletedByBoth = contract.client_marked_completed && contract.provider_marked_completed;
            
            // Si está completado por ambas partes, moverlo al historial y no mostrarlo
            if (isCompletedByBoth) {
                checkAndMoveToHistory(contract);
                return false; // No mostrar en la lista activa
            }
            return true; // Mostrar en la lista activa
        });
        
        console.log('=== CONTRATOS ACTIVOS ===');
        console.log('Total de contratos:', allContracts.length);
        console.log('Contratos activos:', activeContracts.length);
        console.log('=========================');
        
        if (activeContracts.length === 0) {
            container.innerHTML = '<p class="text-muted">No tienes contratos activos.</p>';
            return;
        }

        const getContractDisplay = (contract) => {
            let badge = '';
            let actions = '';

            // Lógica para determinar el estado y los botones (solo contratos activos)
            if (contract.status === 'accepted') {
                if (contract.client_marked_completed) {
                    badge = `<span class="badge bg-info">Esperando Proveedor</span>`;
                    actions = ''; // Ya confirmó, no hay más acciones para él
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
                actions = ''; // No hay acciones mientras esté pendiente
            }

            return { badge, actions };
        };

        container.innerHTML = ''; // Limpiamos el contenedor
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
        console.error("Error al cargar contratos del cliente:", error);
        container.innerHTML = '<p class="text-danger">Error al cargar los contratos.</p>';
    }
}
/**
 * Configura el botón de favoritos en el navbar
 */
function setupFavoritesButton() {
    const favBtn = document.getElementById('show-favorites-btn');
    if (favBtn) {
        favBtn.addEventListener('click', showFavoriteServices);
    }
}

/**
 * Configura el modal de perfil del cliente
 */
function setupProfileModal() {
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            // Eliminar modal anterior si existe
            let oldModal = document.getElementById('clientProfileModal');
            if (oldModal) oldModal.remove();

            // Obtener id_client
            if (!myClientId) {
                showModal('Error', 'No se encontró tu id de cliente.', 'error');
                return;
            }

            // Obtener datos del cliente
            let clientData;
            try {
                clientData = await getClientById(myClientId);
            } catch (err) {
                showModal('Error', 'No se pudo cargar tu información de perfil.', 'error');
                return;
            }

            // Crear el modal
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

            // Manejar el submit del formulario
            document.getElementById('client-profile-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
                const full_name = form.full_name.value.trim();
                // El email no se puede modificar
                try {
                    await putClient(myClientId, { full_name });
                    document.getElementById('profile-update-msg').textContent = 'Perfil actualizado con éxito.';
                    // Cerrar el modal después de 2 segundos
                    setTimeout(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('clientProfileModal'));
                        if (modal) modal.hide();
                    }, 2000);
                } catch (err) {
                    document.getElementById('profile-update-msg').textContent = 'Error al actualizar el perfil.';
                }
            });

            // Evento para resetear contraseña
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

// ===================================================================
// FUNCIÓN PARA EL BOTÓN DE SCROLL HACIA ARRIBA
// ===================================================================
function setupScrollToTopButton() {
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    
    if (!scrollToTopBtn) {
        console.error('Botón scroll-to-top no encontrado');
        return;
    }
    
    console.log('Botón de scroll configurado correctamente');
    
    // Función simple y directa para scroll
    scrollToTopBtn.onclick = function() {
        console.log('¡Click detectado! Iniciando scroll...');
        
        // Scroll inmediato para test
        document.body.scrollTop = 0; // Para Safari
        document.documentElement.scrollTop = 0; // Para Chrome, Firefox, IE y Opera
        
        console.log('Scroll ejecutado');
    };
    
    // Mostrar/ocultar el botón basado en la posición del scroll
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