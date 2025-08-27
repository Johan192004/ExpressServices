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
// Evento para mostrar favoritos
document.addEventListener('DOMContentLoaded', () => {
    const favBtn = document.getElementById('show-favorites-btn');
    if (favBtn) {
        favBtn.addEventListener('click', showFavoriteServices);
    }
});
import { getClientById, putClient,getUserProfile } from "./api/authService.js";
import { getServices, getCategories, getClientConversations, startConversation, getServiceById } from './api/authService.js';
import { openChatModal } from './ui/chat.js';
import { getFavoritesById, postFavorite, deleteFavorite } from "./api/favorites.js";

// ===================================================================
// PUNTO DE ENTRADA PRINCIPAL: Se ejecuta cuando la página ha cargado
// ===================================================================
let myClientId = null; // El ID de cliente del usuario logueado
let currentFavorites = []; // Array para almacenar los IDs de servicios favoritos

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificamos si el usuario tiene permiso para estar aquí
    if (!localStorage.getItem('token')) {
        alert('Debes iniciar sesión para acceder a esta página.');
        window.location.href = '../../index.html';
        return;
    }

    const userProfile = await getUserProfile();
    if (!userProfile.id_client) {
            alert('Acceso denegado. Debes tener un perfil de cliente.');
            window.location.href = '/frontend/index.html';
            return;
    }
    myClientId = userProfile.id_client;
    console.log(userProfile)

    // 2. Cargamos los favoritos del usuario
    await loadCurrentFavorites();

    // 3. Cargamos todos los componentes dinámicos de la página
    loadAndRenderClientConversations();
    loadAndSetupCategories();
    
    // 4. Activamos todos los "escuchadores" de eventos
    setupPageEventListeners();
});


// ===================================================================
// SECCIÓN 1: LÓGICA DE CARGA Y RENDERIZACIÓN DE DATOS
// (Funciones que piden datos a la API y los "pintan" en el HTML)
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
        container.innerHTML = '<p class="text-danger">Error al cargar tus mensajes.</p>';
    }
}

/**
 * Pide las categorías a la API, las traduce y las muestra en la página.
 */
async function loadAndSetupCategories() {
    const container = document.getElementById('category-container');
    if (!container) return;
    const categoryTranslationMap = { 'Plumbing': 'Plomería', 'Electricity': 'Electricidad', 'Carpentry': 'Carpintería', 'Cleaning': 'Construcción', 'Construction & Remodeling': 'Construcción & Remodelación'};

    try {
        const categories = await getCategories();
        container.innerHTML = '';
        categories.forEach(category => {
            const translatedName = categoryTranslationMap[category.title] || category.title;
            const iconClass = (category.title.match(/electric/i) ? 'bi-plug-fill' : 
                              (category.title.match(/plumb/i) ? 'bi-wrench-adjustable' : 
                              (category.title.match(/carpen/i) ? 'bi-hammer' : 'bi-house-up-fill')));
            container.innerHTML += `
                <div class="col-6 col-sm-3">
                    <div class="category-card" style="cursor: pointer;" data-id-category="${category.id_category}" data-name-category="${translatedName}">
                         <div class="icon-wrapper"><i class="bi ${iconClass}"></i></div>
                         <p class="small">${translatedName}</p>
                    </div>
                </div>`;
        });
    } catch (error) {
        container.innerHTML = '<p class="text-danger small">No se pudieron cargar las categorías.</p>';
    }
}

/**
 * "Pinta" una lista de servicios en su contenedor correspondiente.
 * @param {Array} services - Un array de objetos de servicio.
 */
function renderServices(services) {
    const servicesContainer = document.getElementById("servicio-container");
    if (!servicesContainer) return;
    servicesContainer.innerHTML = "";
    if (services.length === 0) {
        servicesContainer.innerHTML = '<p class="text-center text-muted col-12">No se encontraron servicios.</p>';
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
 * Muestra un modal con la información detallada de un servicio específico.
 * @param {string} serviceId - El ID del servicio a mostrar.
 */
async function showServiceDetailModal(serviceId) {
    // Limpiar cualquier modal anterior y backdrop residual
    document.getElementById('serviceDetailModal')?.remove();
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    
    try {
        const service = await getServiceById(serviceId);
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
                                    <img src="${service.personal_picture || 'default.png'}" class="img-fluid rounded-circle mb-3" style="width: 120px; height: 120px; object-fit: cover;" alt="${service.provider_name}">
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
                        <div class="modal-footer border-0">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-primary btn-glow" id="modal-contact-btn" data-service-id="${service.id_service}">Contactar</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const serviceModal = new bootstrap.Modal(document.getElementById('serviceDetailModal'));
        serviceModal.show();
        
        // Limpiar backdrop cuando se cierre este modal
        document.getElementById('serviceDetailModal').addEventListener('hidden.bs.modal', function() {
            document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('padding-right');
        });
        
    } catch (error) {
        alert('Error al cargar detalles del servicio.');
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

// Agregar limpieza global cuando se presione ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        setTimeout(cleanupModalBackdrops, 100);
    }
});


// ===================================================================
// SECCIÓN 2: LÓGICA DE EVENTOS
// (Una única función que maneja todos los clics de la página)
// ===================================================================

function setupPageEventListeners() {
    document.body.addEventListener('click', async (e) => {
        const target = e.target;
        const categoryCard = target.closest('.category-card');
        const seeMoreBtn = target.closest('.btn-see-more');
        const contactBtn = target.closest('#modal-contact-btn');
        const conversationLink = target.closest('.conversation-item');
        const favoriteBtn = target.closest('.favorite-btn');

        if (categoryCard) {
            const categoryId = categoryCard.dataset.idCategory;
            const categoryName = categoryCard.dataset.nameCategory;
            const servicesTitle = document.getElementById('h2Services');
            if (servicesTitle) servicesTitle.textContent = `Servicios de ${categoryName}`;
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
            } catch (error) { alert(`Error: ${error.message}`); }
        }
        else if (conversationLink) {
            e.preventDefault();
            const conversationId = conversationLink.dataset.conversationId;
            openChatModal(conversationId);
        }
    });
}


// MODAL DE PERFIL DE CLIENTE
const profileLink = document.getElementById('profile-link');
if (profileLink) {
    profileLink.addEventListener('click', async (e) => {
        e.preventDefault();
        // Eliminar modal anterior si existe
        let oldModal = document.getElementById('clientProfileModal');
        if (oldModal) oldModal.remove();

        // Obtener id_client del sessionStorage
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