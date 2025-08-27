// frontend/js/provider.js

import { getUserProfile, getMyServices, getCategories, createService, updateService, deleteService, getServiceById, getProviderConversations, respondToContract, getContracts } from './api/authService.js';
import { getProviderById, putProvider } from './api/provider.js';
import { openChatModal } from './ui/chat.js';

let myProviderId = null;

// PUNTO DE ENTRADA PRINCIPAL 

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const userProfile = await getUserProfile();
        if (!userProfile.id_provider) {
            alert('Acceso denegado. Debes tener un perfil de proveedor.');
            window.location.href = '/frontend/index.html';
            return;
        }
        console.log(userProfile)
        myProviderId = userProfile.id_provider;
        await main();
    } catch (error) {
        console.error("Error de autenticación:", error);
        localStorage.removeItem('token');
        window.location.href = '/frontend/index.html';
    }
});

//Función principal que orquesta la carga de la página 
async function main() {
    await loadAndRenderContracts();
    await loadAndRenderConversations();
    await loadCategoriesIntoSelect();
    await loadMyServices();
    setupEventListeners(); 
}

// LÓGICA DE CARGA Y RENDERIZACIÓN 

async function loadAndRenderContracts() {
    const container = document.getElementById('contracts-container');
    if (!container) return;
    container.innerHTML = '<p class="text-muted">Cargando solicitudes...</p>';
    try {
        const contracts = await getContracts();
        if (contracts.length === 0) {
            container.innerHTML = '<p class="text-muted">No tienes solicitudes de contrato.</p>';
            return;
        }
        const getStatusBadgeClass = (status) => {
            const map = { pending: 'bg-warning text-dark', accepted: 'bg-success', denied: 'bg-danger' };
            return map[status] || 'bg-secondary';
        };
        container.innerHTML = contracts.map(c => `
            <div class="card mb-3"><div class="card-body"><div class="d-flex justify-content-between align-items-start">
            <div><h5 class="card-title">${c.service_name}</h5><h6 class="card-subtitle mb-2 text-muted">De: ${c.client_name}</h6><p class="card-text">${c.agreed_hours} horas por <strong>$${(c.agreed_price || 0).toLocaleString('es-CO')}</strong></p></div>
            <div class="text-end"><span class="badge ${getStatusBadgeClass(c.status)} mb-2">${c.status.toUpperCase()}</span>
            ${c.status === 'pending' ? `<div class="btn-group mt-2"><button class="btn btn-sm btn-success btn-accept-contract" data-id="${c.id_contract}">Aceptar</button><button class="btn btn-sm btn-danger btn-deny-contract" data-id="${c.id_contract}">Rechazar</button></div>` : ''}
            </div></div></div></div>`).join('');
    } catch (error) {
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
            container.innerHTML += `<a href="#" class="list-group-item list-group-item-action conversation-item" data-conversation-id="${convo.id_conversation}"><div class="d-flex w-100 justify-content-between"><h6 class="mb-1 fw-bold">${convo.client_name}</h6><small>${new Date(convo.created_at).toLocaleDateString()}</small></div><p class="mb-1 small">Interesado/a en: <strong>${convo.service_name}</strong></p></a>`;
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
                            <div>${r.description}</div>
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
                                    <input type="number" class="form-control" name="hour_price" value="" required>
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
            const id = data.id_service;
            try {
                await updateService(id, data);
                alert('Servicio actualizado con éxito.');
                const modalEl = document.getElementById('editServiceModal');
                const bs = bootstrap.Modal.getInstance(modalEl);
                if (bs) bs.hide();
                loadMyServices();
            } catch (err) {
                alert('Error al actualizar el servicio.');
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
            form.hour_price.value = service.hour_price;
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
            alert('No se pudo cargar la información del servicio.');
        }
    });

    // Listener separado para eliminar servicios
    document.getElementById('my-services-container').addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-delete-service');
        if (!btn) return;
        const serviceId = btn.dataset.serviceId;
        if (confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
            try {
                await deleteService(serviceId);
                alert('Servicio eliminado.');
                loadMyServices();
            } catch (error) { alert(`Error al eliminar: ${error.message}`); }
        }
    });    serviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(serviceForm);
        const data = Object.fromEntries(formData.entries());
        const serviceId = data.id_service;
        try {
            if (serviceId) {
                await updateService(serviceId, data);
                alert('Servicio actualizado con éxito.');
            } else {
                data.id_provider = myProviderId;
                await createService(data);
                alert('Servicio creado con éxito.');
            }
            serviceModal.hide();
            loadMyServices();
        } catch (error) { alert(`Error al guardar: ${error.message}`); }
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

        // Clic en "Aceptar" contrato
        if (acceptContractBtn) {
            const contractId = acceptContractBtn.dataset.id;
            acceptContractBtn.disabled = true;
            acceptContractBtn.textContent = '...';
            try {
                const result = await respondToContract(contractId, 'accepted');
                alert(result.message);
                loadAndRenderContracts(); // Recargamos la lista de contratos
            } catch (error) {
                alert(`Error: ${error.message}`);
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
                alert(result.message);
                loadAndRenderContracts(); // Recargamos la lista de contratos
            } catch (error) {
                alert(`Error: ${error.message}`);
                denyContractBtn.disabled = false;
                denyContractBtn.textContent = 'Rechazar';
            }
        }
    });
}

const profileLink = document.getElementById('profile-link');
if (profileLink) {
    profileLink.addEventListener('click', async (e) => {
        e.preventDefault();
        // Eliminar modal anterior si existe
        let oldModal = document.getElementById('clientProfileModal');
        if (oldModal) oldModal.remove();

        // Obtener id_client del sessionStorage
        if (!myProviderId) {
            alert('No se encontró tu id de proveedor.');
            return;
        }

        // Obtener datos del proveedor
        let providerData;
        try {
            providerData = await getProviderById(myProviderId);
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