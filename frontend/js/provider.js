// frontend/js/provider.js

import { getUserProfile, getMyServices, getCategories, createService, updateService, deleteService, getServiceById, getProviderConversations } from './api/authService.js';
import { openChatModal } from './ui/chat.js';

let myProviderId = null; // El ID de proveedor del usuario logueado

// --- PUNTO DE ENTRADA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const userProfile = await getUserProfile();
        if (!userProfile.id_provider) {
            alert('Acceso denegado. Debes tener un perfil de proveedor.');
            window.location.href = '/frontend/index.html';
            return;
        }
        myProviderId = userProfile.id_provider;
        await main();
    } catch (error) {
        console.error("Error de autenticación:", error);
        localStorage.removeItem('token');
        window.location.href = '/frontend/index.html';
    }
});

/** Función principal que orquesta la carga de la página */
async function main() {
    await loadAndRenderConversations();
    await loadCategoriesIntoSelect();
    await loadMyServices();
    setupEventListeners();
}

// --- LÓGICA DE CARGA Y RENDERIZACIÓN ---

async function loadAndRenderConversations() {
    const container = document.getElementById('conversations-container');
    if (!container) return;
    try {
        const conversations = await getProviderConversations();
        container.innerHTML = '';
        if (conversations.length === 0) {
            container.innerHTML = '<p class="text-muted">No tienes conversaciones nuevas.</p>';
            return;
        }
        conversations.forEach(convo => {
            const convoElement = document.createElement('a');
            convoElement.href = '#';
            convoElement.className = 'list-group-item list-group-item-action conversation-item';
            convoElement.dataset.conversationId = convo.id_conversation;
            convoElement.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1 fw-bold">${convo.client_name}</h6>
                    <small>${new Date(convo.created_at).toLocaleDateString()}</small>
                </div>
                <p class="mb-1 small">Interesado/a en: <strong>${convo.service_name}</strong></p>
            `;
            container.appendChild(convoElement);
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
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card service-card h-100">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold">${service.name}</h5>
                        <p class="card-text small text-muted flex-grow-1">${service.description.substring(0, 100)}...</p>
                        <div class="card-footer bg-white border-0 d-flex justify-content-end p-0 pt-3">
                            <button class="btn btn-outline-secondary btn-sm me-2 btn-edit-service" data-service-id="${service.id_service}" data-bs-toggle="modal" data-bs-target="#serviceFormModal">Editar</button>
                            <button class="btn btn-outline-danger btn-sm btn-delete-service" data-service-id="${service.id_service}">Eliminar</button>
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

// --- LÓGICA DE EVENTOS Y FORMULARIOS ---

function setupEventListeners() {
    const serviceModalEl = document.getElementById('serviceFormModal');
    if (!serviceModalEl) return;
    
    const serviceModal = new bootstrap.Modal(serviceModalEl);
    const serviceForm = document.getElementById('serviceForm');
    const modalTitle = document.getElementById('service-modal-title');

    document.getElementById('btn-open-create-modal').addEventListener('click', () => {
        modalTitle.textContent = 'Publicar Nuevo Servicio';
        serviceForm.reset();
        serviceForm.querySelector('input[name="id_service"]').value = '';
    });

    document.getElementById('my-services-container').addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-edit-service')) {
            const serviceId = e.target.dataset.serviceId;
            try {
                const service = await getServiceById(serviceId);
                modalTitle.textContent = 'Editar Servicio';
                serviceForm.querySelector('input[name="id_service"]').value = service.id_service;
                serviceForm.querySelector('input[name="name"]').value = service.name;
                serviceForm.querySelector('textarea[name="description"]').value = service.description;
                serviceForm.querySelector('input[name="hour_price"]').value = service.hour_price;
                serviceForm.querySelector('input[name="experience_years"]').value = service.experience_years;
                serviceForm.querySelector('select[name="id_category"]').value = service.id_category;
            } catch (error) { alert('No se pudo cargar la información del servicio.'); }
        }
        if (e.target.classList.contains('btn-delete-service')) {
            const serviceId = e.target.dataset.serviceId;
            if(confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
                try {
                    await deleteService(serviceId);
                    alert('Servicio eliminado.');
                    loadMyServices();
                } catch(error) { alert(`Error al eliminar: ${error.message}`); }
            }
        }
    });

    serviceForm.addEventListener('submit', async (e) => {
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
    
    document.getElementById('conversations-container').addEventListener('click', (e) => {
        const conversationLink = e.target.closest('.conversation-item');
        if (conversationLink) {
            e.preventDefault();
            const conversationId = conversationLink.dataset.conversationId;
            openChatModal(conversationId);
        }
    });
}