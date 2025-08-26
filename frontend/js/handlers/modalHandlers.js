// frontend/js/handlers/modalHandlers.js

import { startConversation, getServiceById } from '../api/authService.js';
import { openChatModal } from '../ui/chat.js';

/**
 * Configura los listeners para la selección de rol (cliente/proveedor)
 * y el reseteo del modal de registro.
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
    if (!detailModalEl) return;
    
    const detailModal = new bootstrap.Modal(detailModalEl);
    const modalBody = document.getElementById('detail-modal-body');
    
    modalBody.innerHTML = `<div class="text-center p-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div></div>`;
    detailModal.show();

    try {
        const service = await getServiceById(serviceId);
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-4 text-center">
                    <img src="${service.personal_picture || 'default.png'}" class="img-fluid rounded-circle mb-3" style="width: 120px; height: 120px; object-fit: cover;" alt="${service.provider_name}">
                    <h5 class="fw-bold">${service.provider_name}</h5>
                    <p class="text-muted small">${service.bio || ''}</p>
                </div>
                <div class="col-md-8">
                    <h3>${service.name}</h3>
                    <p class="text-muted">Categoría: ${service.category_title}</p>
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
    } catch (error) {
        modalBody.innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
    }
}

/**
 * Función principal que configura todos los listeners relacionados con modales.
 */
export function setupModalListeners() {
    // 1. Configura la lógica interna del modal de registro
    setupRegisterModal();

    // 2. Listener general que escucha clics en toda la página
    document.body.addEventListener('click', async (e) => {
        // Si se hace clic en "Ver Más" en una tarjeta de servicio
        if (e.target && e.target.classList.contains('btn-see-more')) {
            const serviceId = e.target.dataset.serviceId;
            showServiceDetailModal(serviceId);
        }

        // Si se hace clic en "Contactar" DENTRO del modal de detalles
        if (e.target && e.target.id === 'modal-contact-btn') {
            const serviceId = e.target.dataset.serviceId;
            
            // Ocultamos el modal de detalles antes de abrir el chat
            const detailModal = bootstrap.Modal.getInstance(document.getElementById('serviceDetailModal'));
            if (detailModal) detailModal.hide();

            try {
                const result = await startConversation(serviceId);
                // Esperamos un poco para que la animación del modal termine
                setTimeout(() => openChatModal(result.id_conversation), 300);
            } catch (error) {
                alert(`Error: ${error.message}`);
                if (error.message.includes('iniciar sesión')) {
                    setTimeout(() => new bootstrap.Modal(document.getElementById('loginModal')).show(), 500);
                }
            }
        }
    });
}