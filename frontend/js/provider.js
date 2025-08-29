// frontend/js/provider.js

import { getUserProfile, getMyServices, getCategories, createService, updateService, deleteService, getServiceById, getProviderConversations, respondToContract, getContracts, deleteContract, completeContract } from './api/authService.js';
import { getProviderById, putProvider } from './api/provider.js';
import { openChatModal } from './ui/chat.js';
import { initContractHistory } from './contractHistory.js';

let myProviderId = null;

// ===================================================================
// FUNCIONES DE MODALES PERSONALIZADOS
// ===================================================================

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

// ===================================================================
// FUNCIONES DE PERFIL Y NAVEGACIÓN
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
    }
}

// PUNTO DE ENTRADA PRINCIPAL 

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const userProfile = await getUserProfile();
        if (!userProfile.id_provider) {
            showModal('Acceso Denegado', 'Debes tener un perfil de proveedor para acceder a esta sección. Cerraremos tu sesión y te llevaremos al inicio.', 'error', () => {
                // Cerrar sesión para que en index se muestren los botones de invitado
                localStorage.removeItem('token');
                window.location.href = '/frontend/index.html';
            });
            return;
        }
        console.log(userProfile)
        myProviderId = userProfile.id_provider;
        await main(userProfile);
    } catch (error) {
        console.error("Error de autenticación:", error);
        localStorage.removeItem('token');
        window.location.href = '/frontend/index.html';
    }
});

//Función principal que orquesta la carga de la página 
async function main(userProfile) {
    // Actualizar el enlace de perfil con el nombre del usuario
    updateProfileLink(userProfile.full_name);
    
    // Inicializar sistema de historial de contratos
    initContractHistory();
    
    await loadAndRenderContracts();
    await loadAndRenderConversations();
    await loadCategoriesIntoSelect();
    await loadMyServices();
    setupEventListeners(); 
    setupScrollToTopButton(); // Configurar botón de scroll
}

// LÓGICA DE CARGA Y RENDERIZACIÓN 

async function loadAndRenderContracts() {
    const container = document.getElementById('contracts-container');
    if (!container) return;
    container.innerHTML = '<p class="text-muted">Cargando solicitudes...</p>';

    try {
        const allContracts = await getContracts({ selected_rol: "provider" });
        
        // Filtrar contratos: excluir solo los completados (los ocultos ya los filtra el backend)
        const activeContracts = allContracts.filter(contract => {
            // Ocultar contratos completados por ambas partes (el historial lo carga el modal desde backend)
            const isCompletedByBoth = contract.client_marked_completed && contract.provider_marked_completed;
            return !isCompletedByBoth;
        });
        
        if (activeContracts.length === 0) {
            container.innerHTML = '<p class="text-muted">No tienes solicitudes de contrato activas.</p>';
            return;
        }

        // Función auxiliar para generar insignias de estado y botones de acción
        const getContractDisplay = (contract) => {
            let statusDisplay = '';
            let actions = '';

            // Lógica para contratos activos
            if (contract.status === 'pending') {
                statusDisplay = `<span class="badge bg-warning text-dark">PENDIENTE</span>`;
                actions = `<div class="btn-group mt-2">
                               <button class="btn btn-sm btn-success btn-accept-contract" data-id="${contract.id_contract}">Aceptar</button>
                               <button class="btn btn-sm btn-danger btn-deny-contract" data-id="${contract.id_contract}">Rechazar</button>
                           </div>`;
            } else if (contract.status === 'accepted') {
                if (contract.provider_marked_completed) {
                    statusDisplay = `<span class="badge bg-info">Esperando Cliente</span>`;
                    actions = ''; // Ya confirmó, no hay más acciones para él
                } else {
                    statusDisplay = `<span class="badge bg-success">ACEPTADO</span>`;
                    actions = `<button class="btn btn-sm btn-info btn-complete-contract mt-2" data-id="${contract.id_contract}">Marcar como Terminado</button>`;
                }
            } else if (contract.status === 'denied') {
                statusDisplay = `<span class="badge bg-danger">RECHAZADO</span>`;
                actions = `<button class="btn btn-sm btn-outline-danger btn-delete-contract mt-2" data-contract-id="${contract.id_contract}" title="Eliminar de mi vista">🗑️</button>`;
            }

            return { statusDisplay, actions };
        };

        container.innerHTML = activeContracts.map(c => {
            const { statusDisplay, actions } = getContractDisplay(c);
            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h5 class="card-title">${c.service_name}</h5>
                                <h6 class="card-subtitle mb-2 text-muted">De: ${c.client_name}</h6>
                                <p class="card-text">${c.agreed_hours} horas por <strong>$${(c.agreed_price || 0).toLocaleString('es-CO')}</strong></p>
                            </div>
                            <div class="text-end">
                                ${statusDisplay}
                                ${actions}
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');

    } catch (error) {
        console.error("Error al cargar contratos:", error);
        container.innerHTML = `<p class="text-danger">Error al cargar las solicitudes.</p>`;
    }
}

async function loadAndRenderConversations() {
    const container = document.getElementById('conversations-container');
    if (!container) return;
    container.innerHTML = '<p class="text-muted">Cargando mensajes...</p>';
    try {
        const conversations = await getProviderConversations();
        container.innerHTML = '';
        if (conversations.length === 0) {
            container.innerHTML = '<p class="text-muted">No tienes conversaciones nuevas.</p>';
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
                        <h6 class="mb-1 fw-bold">${convo.client_name}</h6>
                        <small class="text-muted" title="${fullCO}">${dateCO}</small>
                    </div>
                    <p class="mb-1 small">Interesado/a en: <strong>${convo.service_name}</strong></p>
                </a>`;
        });
    } catch (error) {
        container.innerHTML = '<p class="text-danger">Error al cargar conversaciones.</p>';
    }
}

async function loadMyServices() {
    const container = document.getElementById('my-services-container');
    if (!container || !myProviderId) return;
    container.innerHTML = '<p class="text-muted">Cargando tus servicios...</p>';
    try {
        const services = await getMyServices(myProviderId);
        renderMyServices(services);
    } catch (error) {
        container.innerHTML = `<p class="text-danger">${error.message}</p>`;
    }
}

function renderMyServices(services) {
    const container = document.getElementById('my-services-container');
    container.innerHTML = '';
    if (services.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-center text-muted">Aún no has publicado ningún servicio.</p></div>';
        return;
    }
    services.forEach(service => {
        container.innerHTML += `
            <div class="col-md-6 mb-4">
                <div class="card service-card h-100">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold">${service.name}</h5>
                        <p class="card-text small text-muted flex-grow-1">${(service.description || '').substring(0, 100)}...</p>
                        <div class="card-footer bg-white border-0 d-flex justify-content-center p-0 pt-3">
                            <div class="btn-group btn-group-sm w-100" role="group">
                                <button class="btn btn-outline-info btn-show-reviews" data-service-id="${service.id_service}" title="Ver reviews">Reviews</button>
                                <button type="button" class="btn btn-outline-secondary btn-edit-service" data-service-id="${service.id_service}" title="Editar servicio"><i class="bi bi-pencil"></i></button>
                                <button class="btn btn-outline-danger btn-delete-service" data-service-id="${service.id_service}" title="Eliminar servicio"><i class="bi bi-trash"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    });
}

async function loadCategoriesIntoSelect() {
    try {
        const categories = await getCategories();
        const select = document.getElementById('categorySelect');
        select.innerHTML = '<option value="" disabled selected>Selecciona una categoría</option>';
        categories.forEach(cat => {
            select.innerHTML += `<option value="${cat.id_category}">${cat.title}</option>`;
        });
    } catch (error) { console.error("No se pudieron cargar las categorías", error); }
}

// LÓGICA DE EVENTOS Y FORMULARIOS 

function setupEventListeners() {
    // Evento para mostrar reviews de cada servicio
    document.getElementById('my-services-container').addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-show-reviews');
        if (btn) {
            const serviceId = btn.dataset.serviceId;
            // Eliminar modal anterior de reviews si existe
            document.getElementById('reviewsModal')?.remove();
            // Mostrar modal de reviews inmediatamente con 'Cargando...'
            const reviewsModalHtml = `
                <div class="modal fade" id="reviewsModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Reseñas del Servicio</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="reviews-modal-body">
                                <p class='text-muted'>Cargando...</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', reviewsModalHtml);
            const modal = new bootstrap.Modal(document.getElementById('reviewsModal'));
            modal.show();
            // Cargar reviews
            try {
                const { getReviewsByServiceId } = await import('./api/reviews.js');
                const reviews = await getReviewsByServiceId(serviceId);
                let reviewsHtml = '';
                if (reviews.length === 0) {
                    reviewsHtml = '<p class="text-muted">No hay reviews para este servicio.</p>';
                } else {
                    reviewsHtml = reviews.map(r => `
                        <div class="border rounded p-3 mb-3 bg-light">
                            <div class="d-flex align-items-center mb-2">
                                <strong class="me-2">${r.full_name || r.reviewer}</strong>
                                <span class="text-warning">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span>
                            </div>
                            <div class="mb-2">${r.description}</div>
                            <small class="text-muted">
                                ${r.created_at ? 
                                    new Date(r.created_at).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }) : 'Fecha no disponible'
                                }
                            </small>
                        </div>
                    `).join('');
                }
                document.getElementById('reviews-modal-body').innerHTML = reviewsHtml;
            } catch (err) {
                document.getElementById('reviews-modal-body').innerHTML = '<p class="text-danger">Ha ocurrido un error al cargar las reviews.</p>';
            }
        }
    });

    const serviceModalEl = document.getElementById('serviceFormModal');
    if (!serviceModalEl) return;
    
    const serviceModal = new bootstrap.Modal(serviceModalEl);
    const serviceForm = document.getElementById('serviceForm');
    const modalTitle = document.getElementById('service-modal-title');


    // Lógica para crear servicio (modal original)
    document.getElementById('btn-open-create-modal').addEventListener('click', () => {
        modalTitle.textContent = 'Publicar Nuevo Servicio';
        serviceForm.reset();
        serviceForm.querySelector('input[name="id_service"]').value = '';
        serviceModal.show();
    });

    // Lógica para editar servicio (modal independiente, singleton)
    // create or get singleton edit modal
    function createEditModalOnce() {
        if (document.getElementById('editServiceModal')) return;
        const html = `
            <div class="modal fade" id="editServiceModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <form id="edit-service-form">
                            <div class="modal-header">
                                <h5 class="modal-title">Editar Servicio</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <input type="hidden" name="id_service" value="">
                                <div class="mb-3">
                                    <label class="form-label">Nombre</label>
                                    <input type="text" class="form-control" name="name" value="" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Descripción</label>
                                    <textarea class="form-control" name="description" required></textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Precio por hora</label>
                                    <input type="number" class="form-control" name="hour_price" value="" required step="1" min="0">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Años de experiencia</label>
                                    <input type="number" class="form-control" name="experience_years" value="" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Categoría</label>
                                    <select class="form-select" name="id_category" id="edit-category-select" required></select>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="submit" class="btn btn-primary">Actualizar</button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        const editForm = document.getElementById('edit-service-form');
        // attach submit handler once
        editForm.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const formData = new FormData(ev.target);
            const data = Object.fromEntries(formData.entries());
            // Forzar entero en hour_price
            data.hour_price = Math.trunc(Number(data.hour_price || 0));
            const id = data.id_service;
            try {
                await updateService(id, data);
                showModal('¡Éxito!', 'Servicio actualizado con éxito.', 'success');
                const modalEl = document.getElementById('editServiceModal');
                const bs = bootstrap.Modal.getInstance(modalEl);
                if (bs) bs.hide();
                loadMyServices();
            } catch (err) {
                showModal('Error', 'Error al actualizar el servicio.', 'error');
            }
        });
        // remove from DOM on hide to keep clean state
        document.getElementById('editServiceModal').addEventListener('hidden.bs.modal', (ev) => {
            ev.target.remove();
        }, { once: true });
    }

    document.getElementById('my-services-container').addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-edit-service');
        if (!btn) return;
        const serviceId = btn.dataset.serviceId;
        // show lightweight overlay
        const existingOverlay = document.getElementById('loadingServiceOverlay');
        if (existingOverlay) existingOverlay.remove();
        const overlay = document.createElement('div');
        overlay.id = 'loadingServiceOverlay';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.background = 'rgba(0,0,0,0.4)';
        overlay.style.zIndex = '1080';
        overlay.innerHTML = `
            <div class="text-center p-3 bg-white rounded shadow">
                <div class="spinner-border text-primary mb-2" role="status"><span class="visually-hidden">Loading...</span></div>
                <div>Cargando información del servicio...</div>
            </div>`;
        document.body.appendChild(overlay);
        try {
            const service = await getServiceById(serviceId);
            document.getElementById('loadingServiceOverlay')?.remove();
            // ensure singleton modal exists
            createEditModalOnce();
            // populate fields
            const modalEl = document.getElementById('editServiceModal');
            const form = modalEl.querySelector('#edit-service-form');
            form.id_service.value = service.id_service;
            form.name.value = service.name;
            form.description.value = service.description;
            // Mostrar precio/hora como entero
            const hp = Number(service.hour_price);
            form.hour_price.value = Number.isFinite(hp) ? Math.trunc(hp) : '';
            form.experience_years.value = service.experience_years;
            // populate categories into edit select
            const editSelect = document.getElementById('edit-category-select');
            editSelect.innerHTML = '';
            Array.from(document.getElementById('categorySelect').options).forEach(opt => {
                const o = document.createElement('option');
                o.value = opt.value;
                o.textContent = opt.text;
                if (opt.value == service.id_category) o.selected = true;
                editSelect.appendChild(o);
            });
            // show modal
            const bsModal = new bootstrap.Modal(modalEl);
            bsModal.show();
        } catch (err) {
            document.getElementById('loadingServiceOverlay')?.remove();
            showModal('Error', 'No se pudo cargar la información del servicio.', 'error');
        }
    });

    // Listener separado para ocultar (soft-delete) servicios
    document.getElementById('my-services-container').addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-delete-service');
        if (!btn) return;
        const serviceId = btn.dataset.serviceId;
        showConfirmModal(
        'Eliminar Servicio',
        '¿Seguro que quieres eliminar este servicio? No será visible para ti ni para los clientes.',
            async () => {
                try {
                    await deleteService(serviceId);
            showModal('¡Éxito!', 'Servicio eliminado con éxito.', 'success');
                    loadMyServices();
                } catch (error) {
            showModal('Error', `Error al eliminar: ${error.message}`, 'error');
                }
            }
        );
    });    serviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(serviceForm);
        const data = Object.fromEntries(formData.entries());
        // Forzar entero en hour_price para creación/actualización desde este formulario
        data.hour_price = Math.trunc(Number(data.hour_price || 0));
        const serviceId = data.id_service;
        try {
            if (serviceId) {
                await updateService(serviceId, data);
                showModal('¡Éxito!', 'Servicio actualizado con éxito.', 'success');
            } else {
                data.id_provider = myProviderId;
                await createService(data);
                showModal('¡Éxito!', 'Servicio creado con éxito.', 'success');
            }
            serviceModal.hide();
            loadMyServices();
        } catch (error) {
            showModal('Error', `Error al guardar: ${error.message}`, 'error');
        }
    });
    
    document.getElementById('conversations-container').addEventListener('click', async(e) => {
        const conversationLink = e.target.closest('.conversation-item');
        if (conversationLink) {
            e.preventDefault();
            const conversationId = conversationLink.dataset.conversationId;
            openChatModal(conversationId);
        }
    });

    // Event listener separado para los contratos
    document.getElementById('contracts-container').addEventListener('click', async (e) => {
        const acceptContractBtn = e.target.closest('.btn-accept-contract');
        const denyContractBtn = e.target.closest('.btn-deny-contract');
        const deleteContractBtn = e.target.closest('.btn-delete-contract');
        const completeContractBtn = e.target.closest('.btn-complete-contract');

        // Clic en "Aceptar" contrato
        if (acceptContractBtn) {
            const contractId = acceptContractBtn.dataset.id;
            acceptContractBtn.disabled = true;
            acceptContractBtn.textContent = '...';
            try {
                const result = await respondToContract(contractId, 'accepted');
                showModal('¡Éxito!', result.message, 'success');
                loadAndRenderContracts(); // Recargamos la lista de contratos
            } catch (error) {
                showModal('Error', `Error: ${error.message}`, 'error');
                acceptContractBtn.disabled = false;
                acceptContractBtn.textContent = 'Aceptar';
            }
        }

        // Clic en "Rechazar" contrato
        else if (denyContractBtn) {
            const contractId = denyContractBtn.dataset.id;
            denyContractBtn.disabled = true;
            denyContractBtn.textContent = '...';
            try {
                const result = await respondToContract(contractId, 'denied');
                showModal('¡Éxito!', result.message, 'success');
                loadAndRenderContracts(); // Recargamos la lista de contratos
            } catch (error) {
                showModal('Error', `Error: ${error.message}`, 'error');
                denyContractBtn.disabled = false;
                denyContractBtn.textContent = 'Rechazar';
            }
        }
        // Clic en "Eliminar" contrato rechazado (solo eliminar de la vista del proveedor)
        else if (deleteContractBtn) {
            const contractId = deleteContractBtn.dataset.contractId;
            showConfirmModal(
                'Eliminar Contrato',
                '¿Estás seguro de que deseas eliminar este contrato de tu vista?',
                async () => {
                    try {
                        await deleteContract(contractId);
                        showModal('¡Éxito!', 'Contrato eliminado de tu vista.', 'success');
                        loadAndRenderContracts(); // Recargamos la lista
                    } catch (error) {
                        showModal('Error', `Error al eliminar: ${error.message}`, 'error');
                    }
                }
            );
        }
        else if (completeContractBtn) {
            const contractId = completeContractBtn.dataset.id;
            showConfirmModal(
                'Confirmar Finalización',
                '¿Confirmas que has completado el servicio acordado?',
                async () => {
                    try {
                        await completeContract(contractId);
                        showModal('¡Éxito!', 'Has confirmado la finalización del servicio.', 'success');
                        loadAndRenderContracts(); // Recargamos la lista
                    } catch (error) {
                        showModal('Error', `Error al confirmar: ${error.message}`, 'error');
                    }
                }
            );
        }
    });
}

// Event listeners para el dropdown del perfil
const editProfileBtn = document.getElementById('edit-profile-btn');
if (editProfileBtn) {
    editProfileBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        // Eliminar modal anterior si existe
        let oldModal = document.getElementById('clientProfileModal');
        if (oldModal) oldModal.remove();

        // Obtener id_client del sessionStorage
        if (!myProviderId) {
            showModal('Error', 'No se encontró tu id de proveedor.', 'error');
            return;
        }

        // Obtener datos del proveedor
        let providerData;
        try {
            providerData = await getProviderById(myProviderId);
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
                                    <input type="text" class="form-control" id="profile-full-name" name="full_name" value="${providerData[0].full_name || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label for="profile-email" class="form-label">Correo electrónico</label>
                                    <input type="email" class="form-control" id="profile-email" name="email" value="${providerData[0].email || ''}" readonly disabled>
                                </div>
                                <div class="mb-3">
                                    <label for="profile-phone" class="form-label">Teléfono</label>
                                    <input type="text" class="form-control" id="profile-phone" name="phone_number" value="${providerData[0].phone_number || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label for="profile-personal-picture" class="form-label">Foto de perfil</label>
                                    <input type="text" class="form-control" id="profile-personal-picture" name="personal_picture" value="${providerData[0].personal_picture || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label for="profile-bio" class="form-label">Biografía</label>
                                    <textarea class="form-control" id="profile-bio" name="bio" rows="3" required>${providerData[0].bio || ''}</textarea>
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
            const phone_number = form.phone_number.value.trim();
            const personal_picture = form.personal_picture.value.trim();
            const bio = form.bio.value.trim();
            // El email no se puede modificar
            try {
                await putProvider(myProviderId, { full_name, phone_number, personal_picture, bio });
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
            const email = providerData[0].email;
            if (!email) {
                showModal('Error', 'No se encontró el correo electrónico.', 'error');
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

// Event listener para el botón de logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/frontend/index.html';
    });
}

// FUNCIÓN PARA EL BOTÓN DE SCROLL HACIA ARRIBA
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

// ===================================================================
// FUNCIONES PARA GESTIONAR CONTRATOS OCULTOS
// ===================================================================


/**
 * Actualiza el badge del botón de contratos ocultos
 */
async function updateHiddenContractsBadge() {
    const hiddenBtn = document.getElementById('hidden-contracts-btn');
    if (!hiddenBtn) return;
    
    try {
        const hiddenContracts = await getHiddenContractsForProvider();
        const count = hiddenContracts.length;
        
        // Remover badge existente
        const existingBadge = hiddenBtn.querySelector('.badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Agregar nuevo badge si hay contratos ocultos
        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'badge bg-secondary ms-1';
            badge.textContent = count;
            hiddenBtn.appendChild(badge);
        }
    } catch (error) {
        console.error('Error al actualizar badge de contratos ocultos:', error);
    }
}

/**
 * Configura los event listeners para contratos ocultos
 */
function setupHiddenContractsListeners() {
    // Botón para abrir modal de contratos ocultos
    const hiddenBtn = document.getElementById('hidden-contracts-btn');
    if (hiddenBtn) {
        hiddenBtn.addEventListener('click', () => {
            renderHiddenContracts();
            const modal = new bootstrap.Modal(document.getElementById('hiddenContractsModal'));
            modal.show();
        });
    }
    
    // Event delegation para botones de restaurar
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.restore-contract-btn')) {
            const btn = e.target.closest('.restore-contract-btn');
            const contractId = parseInt(btn.dataset.contractId);
            
            const success = await showContractInProviderView(contractId);
            if (success) {
                showModal('¡Éxito!', 'Contrato restaurado en tu vista principal.', 'success');
                renderHiddenContracts(); // Actualizar la lista de ocultos
                loadAndRenderContracts(); // Actualizar la lista principal
            } else {
                showModal('Error', 'No se pudo restaurar el contrato. Inténtalo de nuevo.', 'error');
            }
        }
    });
}