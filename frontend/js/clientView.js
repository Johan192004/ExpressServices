// frontend/js/clientView.js

import { getClientById, putClient, getUserProfile } from "./api/authService.js";
import { getServices, getCategories, getClientConversations, startConversation, getServiceById, createContract, getContracts, completeContract, deleteContract } from './api/authService.js';
import { openChatModal } from './ui/chat.js';
import { getFavoritesById, postFavorite, deleteFavorite } from "./api/favorites.js";
import { getReviewsByServiceId } from "./api/reviews.js";

// ===================================================================
// PUNTO DE ENTRADA PRINCIPAL
// ===================================================================
let myClientId = null; // El ID de cliente del usuario logueado
let currentFavorites = []; // Array para almacenar los IDs de servicios favoritos

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificamos si el usuario tiene permiso para estar aquí
    if (!localStorage.getItem('token')) {
        alert('Debes iniciar sesión para acceder a esta página.');
        window.location.href = '/frontend/index.html';
        return;
    }

    const userProfile = await getUserProfile();
    if (!userProfile.id_client) {
        alert('Acceso denegado. Debes tener un perfil de cliente.');
        window.location.href = '/frontend/index.html';
        return;
    }
    myClientId = userProfile.id_client;

    // 2. Cargamos los favoritos del usuario
    await loadCurrentFavorites();

    // 3. Cargamos todos los componentes dinámicos de la página
    loadAndRenderClientConversations();
    loadAndSetupCategories();
    setupPageEventListeners();
    loadAndRenderClientContracts();
    setupFavoritesButton();
    setupProfileModal();
});


// ===================================================================
// SECCIÓN 1: LÓGICA DE CARGA Y RENDERIZACIÓN DE DATOS
// ===================================================================

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
        servicesContainer.innerHTML += `
            <div class="col">
                <div class="card service-card h-100">
                    <div class="card-body text-center d-flex flex-column">
                        <img src="${service.personal_picture || 'default.png'}" alt="${service.provider_name}" class="provider-avatar">
                        <h5 class="card-title mt-3 fw-bold">${service.name}</h5>
                        <p class="card-text text-muted small">Por ${service.provider_name}</p>
                        <p class="card-text small flex-grow-1">${(service.description || '').substring(0, 80)}...</p>
                        <button class="btn btn-link p-0 favorite-btn" data-service-id="${service.id_service}" title="${isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                            <i class="bi ${isFavorite ? 'bi-star-fill text-warning' : 'bi-star'}" style="font-size: 1.5rem;"></i>
                        </button>
                        <hr>
                        <button class="btn btn-sm btn-outline-primary btn-see-more mt-auto" data-service-id="${service.id_service}">Ver Detalles</button>
                    </div>
                </div>
            </div>`;
    });
}

/**
 * Muestra un modal con la información detallada de un servicio.
 */
async function showServiceDetailModal(serviceId) {
    // Limpiar cualquier modal anterior y backdrop residual
    document.getElementById('serviceDetailModal')?.remove();
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    
    try {
        const service = await getServiceById(serviceId);
        window.currentServiceData = service;
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
                                    <img src="${service.personal_picture || 'default.png'}" class="img-fluid rounded-circle mb-3" style="width: 120px; height: 120px; object-fit: cover; aspect-ratio: 1/1;" alt="${service.provider_name}">
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
                            <div>
                                <button type="button" class="btn btn-outline-dark me-2" id="btn-show-reviews">Ver reviews</button>
                                <button type="button" class="btn btn-success" id="modal-propose-contract-btn">Contratar Horas</button>
                            </div>
                            <div><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button><button type="button" class="btn btn-primary btn-glow" id="modal-contact-btn" data-service-id="${service.id_service}">Contactar</button></div>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
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
        });
        
    } catch (error) {
        alert('Error al cargar detalles del servicio.');
    }
}

/**
 * Maneja el clic en el botón de favoritos para agregar o quitar de favoritos.
 * @param {string} serviceId - El ID del servicio.
 */
async function toggleFavorite(serviceId) {
    if (!myClientId) {
        alert('Debes iniciar sesión para agregar favoritos.');
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
        alert('Error al actualizar favoritos. Inténtalo de nuevo.');
    }
}

/**
 * Abre un modal para visualizar los servicios favoritos del cliente.
 */
async function showFavoriteServices() {
    if (!myClientId) {
        alert('No se encontró tu id de cliente.');
        return;
    }
    
    // Recargar favoritos actuales
    await loadCurrentFavorites();
    
    let favorites = [];
    try {
        favorites = await getFavoritesById(myClientId);
    } catch (err) {
        alert('No se pudieron cargar tus favoritos.');
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
                        <div class="row g-3">
                            ${favorites.length === 0 ? '<p class="text-center text-muted">No tienes servicios favoritos.</p>' : favorites.map(service => `
                                <div class="col-md-6">
                                    <div class="card h-100">
                                        <div class="card-body text-center d-flex flex-column">
                                            <img src="${service.personal_picture || 'default.png'}" alt="${service.provider_name}" class="provider-avatar mb-2">
                                            <h5 class="card-title fw-bold">${service.name}</h5>
                                            <p class="card-text text-muted small">Por ${service.provider_name}</p>
                                            <p class="card-text small flex-grow-1">${(service.description || '').substring(0, 80)}...</p>
                                            <h6 class="fw-bold text-primary mt-2">$${(service.hour_price || 0).toLocaleString('es-CO')} / hora</h6>
                                            <button class="btn btn-sm btn-outline-primary btn-see-more mt-2" data-service-id="${service.id_service}">Ver Detalles</button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
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
    console.log(serviceId)
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
                                            <small class="text-muted">${new Date(review.created_at).toLocaleDateString()}</small>
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
        alert('Error al cargar las reviews del servicio.');
        
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
            showServiceDetailModal(serviceId);
        }
        else if (contactBtn) {
            const serviceId = contactBtn.dataset.serviceId;
            const detailModal = bootstrap.Modal.getInstance(document.getElementById('serviceDetailModal'));
            if (detailModal) detailModal.hide();
            try {
                const result = await startConversation(serviceId);
                setTimeout(() => openChatModal(result.id_conversation), 300);
            } catch (error) {
                 if (error.message.includes('iniciar sesión') || error.message.includes('Sesión expirada')) {
                    new bootstrap.Modal(document.getElementById('authActionModal')).show();
                } else {
                    alert(`Error: ${error.message}`);
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
            if (!service) return;

            const hours = prompt(`¿Cuántas horas del servicio "${service.name}" deseas contratar?`, "1");
            
            if (hours === null || isNaN(hours) || parseFloat(hours) <= 0) {
                alert('Por favor, ingresa un número de horas válido.');
                return;
            }

            const detailModalEl = document.getElementById('serviceDetailModal');
            const detailModal = bootstrap.Modal.getInstance(detailModalEl);

            detailModalEl.addEventListener('hidden.bs.modal', () => {
                const agreed_hours = parseFloat(hours);
                const total_price = service.hour_price * agreed_hours;

                document.getElementById('summary-service-name').textContent = service.name;
                document.getElementById('summary-provider-name').textContent = service.provider_name;
                document.getElementById('summary-hours').textContent = agreed_hours;
                document.getElementById('summary-total-price').textContent = `$${total_price.toLocaleString('es-CO')}`;
                
                const confirmBtn = document.getElementById('confirm-contract-btn');
                confirmBtn.dataset.serviceId = service.id_service;
                confirmBtn.dataset.agreedHours = agreed_hours;

                new bootstrap.Modal(document.getElementById('contractSummaryModal')).show();
            }, { once: true });

            if (detailModal) detailModal.hide();
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
                alert(`${result.message}\nHas propuesto contratar ${agreedHours} horas con ${providerName}.`);

            } catch (error) {
                alert(`Error al enviar la oferta: ${error.message}`);
            } finally {
                confirmContractBtn.disabled = false;
                confirmContractBtn.innerHTML = 'Confirmar y Enviar Oferta';
            }
        }
                else if (deleteContractBtn) {
            const contractId = deleteContractBtn.dataset.contractId;
            const confirmed = confirm('¿Estás seguro de que deseas eliminar este contrato de tu historial?');
            if (confirmed) {
                try {
                    await deleteContract(contractId);
                    alert('Contrato eliminado con éxito.');
                    loadAndRenderClientContracts(); // Recargamos la lista
                } catch (error) {
                    alert(`Error al eliminar: ${error.message}`);
                }
            }
        }
        else if (completeContractBtn) {
            const contractId = completeContractBtn.dataset.contractId;
            const confirmed = confirm('¿Confirmas que el servicio ha sido completado a tu satisfacción?');
            if (confirmed) {
                try {
                    await completeContract(contractId);
                    alert('Has confirmado la finalización del servicio.');
                    loadAndRenderClientContracts(); // Recargamos la lista
                } catch (error) {
                    alert(`Error al confirmar: ${error.message}`);
                }
            }
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
        const contracts = await getContracts();
        if (contracts.length === 0) {
            container.innerHTML = '<p class="text-muted">No has enviado ninguna oferta de contrato.</p>';
            return;
        }

        const getContractDisplay = (contract) => {
            let badge = '';
            let actions = '';
            const isCompletedByBoth = contract.client_marked_completed && contract.provider_marked_completed;

            // Lógica para determinar el estado y los botones
            if (isCompletedByBoth) {
                badge = `<span class="badge bg-primary">Terminado</span>`;
                actions = `<button class="btn btn-sm btn-outline-danger btn-delete-contract" data-contract-id="${contract.id_contract}">🗑️</button>`;
            } else if (contract.status === 'accepted') {
                if (contract.client_marked_completed) {
                    badge = `<span class="badge bg-info">Esperando Proveedor</span>`;
                    actions = ''; // Ya confirmó, no hay más acciones para él
                } else {
                    badge = `<span class="badge bg-success">Aceptado</span>`;
                    actions = `<button class="btn btn-sm btn-info btn-complete-contract" data-contract-id="${contract.id_contract}">Marcar Terminado</button>`;
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
        contracts.forEach(contract => {
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
    const profileLink = document.getElementById('profile-link');
    if (profileLink) {
        profileLink.addEventListener('click', async (e) => {
            e.preventDefault();
            // Eliminar modal anterior si existe
            let oldModal = document.getElementById('clientProfileModal');
            if (oldModal) oldModal.remove();

            // Obtener id_client
            if (!myClientId) {
                alert('No se encontró tu id de cliente.');
                return;
            }

            // Obtener datos del cliente
            let clientData;
            try {
                clientData = await getClientById(myClientId);
            } catch (err) {
                alert('No se pudo cargar tu información de perfil.');
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
                if (!email) return alert('No se encontró el correo.');
                try {
                    await import('./api/authService.js').then(mod => mod.requestPasswordReset(email));
                    alert('Se ha enviado un enlace de reseteo de contraseña a tu correo.');
                } catch (err) {
                    alert('No se pudo enviar el correo de reseteo.');
                }
            });
        });
    }
}