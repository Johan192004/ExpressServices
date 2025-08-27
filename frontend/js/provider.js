// frontend/js/provider.js

import { getUserProfile, getMyServices, getCategories, createService, updateService, deleteService, getServiceById, getProviderConversations, respondToContract, getContracts } from './api/authService.js';
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
    setupPageEventListeners(); 
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

// LÓGICA DE EVENTOS Y FORMULARIOS 

function setupPageEventListeners() {
    const serviceModalEl = document.getElementById('serviceFormModal');
    if (!serviceModalEl) return;
    
    const serviceModal = new bootstrap.Modal(serviceModalEl);
    const serviceForm = document.getElementById('serviceForm');
    const modalTitle = document.getElementById('service-modal-title');

    //  LISTENER #1: Envío del formulario de Crear/Editar Servicio 
    serviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(serviceForm);
        const data = Object.fromEntries(formData.entries());
        const serviceId = data.id_service;

        try {
            if (serviceId) { // Si hay un ID, estamos editando
                await updateService(serviceId, data);
                alert('Servicio actualizado con éxito.');
            } else { // Si no, estamos creando
                data.id_provider = myProviderId;
                await createService(data);
                alert('Servicio creado con éxito.');
            }
            serviceModal.hide();
            loadMyServices(); // Recargamos la lista para ver los cambios
        } catch (error) { 
            alert(`Error al guardar el servicio: ${error.message}`); 
        }
    });

    //  LISTENER #2: Un único listener para todos los clics en la página 
    document.body.addEventListener('click', async (e) => {
        const target = e.target;
        
        // Buscamos el objetivo del clic usando .closest() para más robustez 
        const createBtn = target.closest('#btn-open-create-modal');
        const editBtn = target.closest('.btn-edit-service');
        const deleteBtn = target.closest('.btn-delete-service');
        const conversationLink = target.closest('.conversation-item');
        const acceptContractBtn = target.closest('.btn-accept-contract');
        const denyContractBtn = target.closest('.btn-deny-contract');

        // Ahora creamos lógica para cada tipo de clic 

        // Clic en "Publicar Nuevo Servicio"
        if (createBtn) {
            modalTitle.textContent = 'Publicar Nuevo Servicio';
            serviceForm.reset();
            serviceForm.querySelector('input[name="id_service"]').value = '';
            // No es necesario el data-bs-toggle="modal" en el botón si lo manejamos aquí
            serviceModal.show();
        }
        
        // Clic en "Editar" en una tarjeta de servicio
        else if (editBtn) {
            const serviceId = editBtn.dataset.serviceId;
            try {
                const service = await getServiceById(serviceId);
                modalTitle.textContent = 'Editar Servicio';
                // Llenamos el formulario con los datos del servicio
                serviceForm.querySelector('input[name="id_service"]').value = service.id_service;
                serviceForm.querySelector('input[name="name"]').value = service.name;
                serviceForm.querySelector('textarea[name="description"]').value = service.description;
                serviceForm.querySelector('input[name="hour_price"]').value = service.hour_price;
                serviceForm.querySelector('input[name="experience_years"]').value = service.experience_years;
                serviceForm.querySelector('select[name="id_category"]').value = service.id_category;
            } catch (error) { 
                alert('No se pudo cargar la información del servicio.'); 
            }
        }
        
        // Clic en "Eliminar" en una tarjeta de servicio
        else if (deleteBtn) {
            const serviceId = deleteBtn.dataset.serviceId;
            if (confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
                try {
                    await deleteService(serviceId);
                    alert('Servicio eliminado.');
                    loadMyServices(); // Recargamos la lista de servicios
                } catch(error) { 
                    alert(`Error al eliminar: ${error.message}`); 
                }
            }
        }
        
        // Clic en una conversación de la bandeja de entrada
        else if (conversationLink) {
            e.preventDefault();
            const conversationId = conversationLink.dataset.conversationId;
            openChatModal(conversationId);
        }

        // Clic en "Aceptar" contrato
        else if (acceptContractBtn) {
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