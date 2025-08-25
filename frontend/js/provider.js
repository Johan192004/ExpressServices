import { getMyServices, getCategories, postService, deleteService, putService } from "./api/provider.js";

if (window.sessionStorage.getItem('role') === 'both') {
    const liClient = document.getElementById('li-i-am-client');
    if (liClient) liClient.classList.remove('d-none');
}

const myProviderId = window.localStorage.getItem("providerId") || 7;
const servicesContainer = document.getElementById("servicio-container");

function showMyServices(list) {
    servicesContainer.innerHTML = "";
    servicesContainer.className = "d-flex justify-content-center";

    list.forEach(service => {
        const card = document.createElement('div');
        card.className = "col-12 col-md-4 p-2";
        card.innerHTML = `
            <div class="card service-card h-100">
                <div class="card-body text-center">
                    <h5 class="card-title mt-3 fw-bold">${service.name}</h5>
                    <p class="card-text text-muted">Por ${service.provider_name}</p>
                    <p class="card-text">${service.description}</p>
                    <hr>
                    <div class="d-flex justify-content-between align-items-center">
                        <p class="card-price mb-0">$${service.hour_price.toLocaleString('es-CO')} <span>/hora</span></p>
                        <button class="btn btn-outline-primary btn-see-more">Ver Más</button>
                    </div>
                </div>
            </div>
        `;
        // Agregar evento al botón "Ver Más"
        card.querySelector('.btn-see-more').addEventListener('click', () => showServiceModal(service));
        servicesContainer.appendChild(card);
    });
}

// Crear y mostrar modal de detalles del servicio
function showServiceModal(service) {
    // Si ya existe el modal, elimínalo
    let oldModal = document.getElementById('serviceDetailModal');
    if (oldModal) oldModal.remove();

    const modalHtml = `
        <div class="modal fade" id="serviceDetailModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Detalles del Servicio</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <h5>${service.name}</h5>
                        <p><strong>Proveedor:</strong> ${service.provider_name}</p>
                        <p><strong>Descripción:</strong> ${service.description}</p>
                        <p><strong>Precio por hora:</strong> $${service.hour_price.toLocaleString('es-CO')}</p>
                        <p><strong>Años de experiencia:</strong> ${service.experience_years}</p>
                        <p><strong>Categoría:</strong> ${service.category_title || ''}</p>
                        <p><strong>Fecha de creación:</strong> ${service.creation_date || ''}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-danger" id="btn-delete-service">Eliminar</button>
                        <button class="btn btn-secondary" id="btn-edit-service">Editar</button>
                        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('serviceDetailModal'));
    modal.show();

    // Aquí puedes agregar lógica para eliminar y editar
    document.getElementById('btn-delete-service').addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
            try {
                const result = await deleteService(service.id_service);
                if (result && !result.error) {
                    alert('Servicio eliminado exitosamente.');
                    // Cerrar el modal
                    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('serviceDetailModal'));
                    modal.hide();
                    // Refrescar la lista de servicios
                    const updated = await getMyServices(myProviderId);
                    showMyServices(updated);
                } else {
                    alert('Error al eliminar el servicio.');
                }
            } catch (err) {
                alert('Error al eliminar el servicio.');
            }
        }
    });
    document.getElementById('btn-edit-service').addEventListener('click', async () => {
        // Obtener categorías
        const categories = await getCategories();
        // Generar las opciones del select
        let optionsHtml = '';
        categories.forEach(cat => {
            const selected = cat.id_category == service.id_category ? 'selected' : '';
            optionsHtml += `<option value="${cat.id_category}" ${selected}>${cat.title}</option>`;
        });

        // Reemplazar TODO el contenido del modal por el formulario editable
        const modalContent = document.querySelector('#serviceDetailModal .modal-content');
        modalContent.innerHTML = `
            <div class="modal-header">
                <h5 class="modal-title">Editar Servicio</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="editServiceForm">
                    <div class="mb-3">
                        <label class="form-label">Título</label>
                        <input type="text" class="form-control" name="name" value="${service.name}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Descripción</label>
                        <textarea class="form-control" name="description" rows="3" required>${service.description}</textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Precio por hora</label>
                        <input type="number" class="form-control" name="hour_price" value="${service.hour_price}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Años de experiencia</label>
                        <input type="number" class="form-control" name="experience_years" value="${service.experience_years}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Categoría</label>
                        <select class="form-control" name="id_category" required>
                            ${optionsHtml}
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                    <button type="button" class="btn btn-secondary ms-2" data-bs-dismiss="modal">Cancelar</button>
                </form>
            </div>
        `;

        // Manejar el submit del formulario de edición
        document.getElementById('editServiceForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const updatedData = Object.fromEntries(formData);

            // Validar que los campos numéricos no sean negativos
            const hourPrice = parseFloat(updatedData.hour_price);
            const experienceYears = parseInt(updatedData.experience_years);
            if (isNaN(hourPrice) || hourPrice < 0) {
                alert("El precio por hora no puede ser negativo.");
                return;
            }
            if (isNaN(experienceYears) || experienceYears < 0) {
                alert("Los años de experiencia no pueden ser negativos.");
                return;
            }

            // Llamar a putService
            const result = await putService(service.id_service, updatedData);
            if (result && !result.error) {
                alert("¡Servicio actualizado exitosamente!");
                const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('serviceDetailModal'));
                modal.hide();
                // Refrescar la lista de servicios
                const updated = await getMyServices(myProviderId);
                showMyServices(updated);
            } else {
                alert("Error al actualizar el servicio.");
            }
        });
    });
}


async function main() {
    const result = await getMyServices(myProviderId);
    chargeCategories();
    postServiceFunction();
    console.log(result);
    showMyServices(result);
}

async function chargeCategories() {
    const categories = await getCategories();

    const selectCategory = document.getElementById("categorySelect");
    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category.id_category;
        option.textContent = category.title;
        console.log(category);
        selectCategory.appendChild(option);
    });
}


async function postServiceFunction() {
    const postServiceForm = document.getElementById("postServiceForm");
    postServiceForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const serviceData = Object.fromEntries(formData);
        serviceData.id_provider = parseInt(myProviderId);

        // Validar que id_category no sea vacío ni undefined
        if (!serviceData.id_category) {
            alert("Por favor selecciona una categoría válida.");
            return;
        }

        // Validar que los campos numéricos no sean negativos
        const hourPrice = parseFloat(serviceData.hour_price);
        const experienceYears = parseInt(serviceData.experience_years);

        if (isNaN(hourPrice) || hourPrice < 0) {
            alert("El precio por hora no puede ser negativo.");
            return;
        }
        if (isNaN(experienceYears) || experienceYears < 0) {
            alert("Los años de experiencia no pueden ser negativos.");
            return;
        }

        // Si todo está bien, continuar
        console.log(serviceData);

        const result = await postService(serviceData);
        console.log(result);

        // Mostrar mensaje de éxito y cerrar el modal
        if (result && !result.error) {
            alert("¡Servicio publicado exitosamente!");
            // Cerrar el modal de Bootstrap
            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('postServiceModal'));
            modal.hide();
            // Opcional: limpiar el formulario
            postServiceForm.reset();
        }
    });
}


main();
