import { getClientById, putClient,getUserProfile } from "./api/authService.js";
import { getServices, getCategories, getClientConversations, startConversation, getServiceById } from './api/authService.js';
import { openChatModal } from './ui/chat.js';

// ===================================================================
// PUNTO DE ENTRADA PRINCIPAL: Se ejecuta cuando la página ha cargado
// ===================================================================
let myClientId = null; // El ID de cliente del usuario logueado

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificamos si el usuario tiene permiso para estar aquí
    if (!localStorage.getItem('token')) {
        alert('Debes iniciar sesión para acceder a esta página.');
        window.location.href = '../../index.html';
        return;
    }

    
    // Inicia todas las funcionalidades de la página


    const userProfile = await getUserProfile();
    if (!userProfile.id_client) {
            alert('Acceso denegado. Debes tener un perfil de cliente.');
            window.location.href = '/frontend/index.html';
            return;
    }
    myClientId = userProfile.id_client;
    console.log(userProfile)

    // 2. Cargamos todos los componentes dinámicos de la página

    loadAndRenderClientConversations();
    loadAndSetupCategories();
    setupPageEventListeners();
});


// LÓGICA DE CARGA Y RENDERIZACIÓN DE DATOS 

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
        console.error("Error al cargar categorías:", error);
        container.innerHTML = '<p class="text-danger small">No se pudieron cargar las categorías.</p>';
    }
}

function renderServices(services) {
    const servicesContainer = document.getElementById("servicio-container");
    if (!servicesContainer) return;
    servicesContainer.innerHTML = "";
    if (services.length === 0) {
        servicesContainer.innerHTML = '<p class="text-center text-muted col-12">No se encontraron servicios.</p>';
        return;
    }
    services.forEach(service => {
        servicesContainer.innerHTML += `
            <div class="col">
                <div class="card service-card h-100">
                    <div class="card-body text-center d-flex flex-column">
                        <img src="${service.personal_picture || 'default.png'}" alt="${service.provider_name}" class="provider-avatar">
                        <h5 class="card-title mt-3 fw-bold">${service.name}</h5>
                        <p class="card-text text-muted small">Por ${service.provider_name}</p>
                        <p class="card-text small flex-grow-1">${(service.description || '').substring(0, 80)}...</p>
                        <hr>
                        <button class="btn btn-sm btn-outline-primary btn-see-more mt-auto" data-service-id="${service.id_service}">Ver Detalles</button>
                    </div>
                </div>
            </div>`;
    });
}

async function showServiceDetailModal(serviceId) {
    document.getElementById('serviceDetailModal')?.remove();
    try {
        const service = await getServiceById(serviceId);
        window.currentServiceData = service;
        const modalHtml = `
            <div class="modal fade" id="serviceDetailModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content">
                        <div class="modal-header"><h5 class="modal-title fw-bold">${service.name}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-4 text-center"><img src="${service.personal_picture || 'default.png'}" class="img-fluid rounded-circle mb-3" style="width: 120px; height: 120px; object-fit: cover;" alt="${service.provider_name}"><h5 class="fw-bold">${service.provider_name}</h5><p class="text-muted small">${service.bio || ''}</p></div>
                                <div class="col-md-8"><p class="text-muted">Categoría: ${service.category_title || 'No especificada'}</p><p>${service.description}</p><hr><p><strong>Años de experiencia:</strong> ${service.experience_years}</p><h4 class="fw-bold text-primary">$${(service.hour_price || 0).toLocaleString('es-CO')} / hora</h4></div>
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
        new bootstrap.Modal(document.getElementById('serviceDetailModal')).show();
    } catch (error) {
        alert('Error al cargar detalles del servicio.');
    }
}


// LÓGICA DE EVENTOS 
function setupPageEventListeners() {
    document.body.addEventListener('click', async (e) => {
        const categoryCard = e.target.closest('.category-card');
        const seeMoreBtn = e.target.closest('.btn-see-more');
        const contactBtn = e.target.closest('#modal-contact-btn');
        const conversationLink = e.target.closest('.conversation-item');

        if (categoryCard) {
            const categoryId = categoryCard.dataset.idCategory;
            const categoryName = categoryCard.dataset.nameCategory;
            const servicesTitle = document.getElementById('h2Services');
            if (servicesTitle) servicesTitle.textContent = `Servicios de ${categoryName}`;
            try {
                // 2. USAMOS la función correcta de authService.js
                const services = await getServices({ id_category: categoryId });
                renderServices(services);
            } catch (error) { console.error("Error al cargar servicios:", error); }
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