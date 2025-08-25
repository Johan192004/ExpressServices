import { getServicesByCategory } from "./api/client.js";

// Show the 'Soy Proveedor' li only if the role is 'both'
if (window.sessionStorage.getItem('role') === 'both') {
    const liProvider = document.getElementById('li-soy-proveedor');
    if (liProvider) {
        liProvider.classList.remove('d-none');
        liProvider.addEventListener('click', () => {
            window.location.href = 'provider.html';
        });
    }
}





function createServicesSection() {
    if(!document.getElementById("h2Services")){
        const servicesOutputContainer = document.getElementById("servicesContainer");
        document.getElementById("servicesSection").classList.remove("d-none");
        // Usar row y justify-content-center para responsividad
        servicesOutputContainer.innerHTML=`<h2 class="fw-bold text-center mb-4" id="h2Services">Servicios</h2>
            <div id="servicio-container" class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4 justify-content-center">
                <!-- Las tarjetas se mostrarán aquí -->
            </div>`;
    }
}


function showServices(list) {
    const servicesContainer = document.getElementById("servicio-container");
    servicesContainer.innerHTML = "";
    // No sobreescribir las clases de grid responsivo

    list.forEach(service => {
        const card = document.createElement('div');
        card.className = "col-12 col-md-4 p-2";
        card.innerHTML = `
            <div class="card service-card h-100">
                <div class="card-body text-center">
                    <img src="${service.personal_picture}" alt="${service.provider_name}" class="provider-avatar">
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
        card.querySelector('.btn-see-more').addEventListener('click', () => showServiceDetailModal(service));
        servicesContainer.appendChild(card);
    });
}

// Modal reutilizable para detalles de servicio
function showServiceDetailModal(service) {

    // Eliminar modal anterior de detalles si existe
    let oldModal = document.getElementById('serviceDetailModal');
    if (oldModal) oldModal.remove();
    // Eliminar modal anterior de contacto si existe
    let oldContactModal = document.getElementById('contactModal');
    if (oldContactModal) oldContactModal.remove();

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
                        <button class="btn btn-outline-primary" id="btn-contratar">Contratar</button>
                        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Modal de contacto -->
        <div class="modal fade" id="contactModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Contacto del Proveedor</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Email:</strong> <span id="contact-email">${service.email || 'No disponible'}</span></p>
                        <p><strong>Teléfono:</strong> <span id="contact-phone">${service.phone_number || 'No disponible'}</span></p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('serviceDetailModal'));
    modal.show();
    // Evento para abrir el modal de contacto
    document.getElementById('btn-contratar').addEventListener('click', () => {
        // Cerrar el modal de detalles antes de abrir el de contacto
        const detailModalEl = document.getElementById('serviceDetailModal');
        const detailModal = bootstrap.Modal.getInstance(detailModalEl);
        if (detailModal) detailModal.hide();
        // Esperar a que termine la animación antes de mostrar el de contacto
        setTimeout(() => {
            const contactModal = new bootstrap.Modal(document.getElementById('contactModal'));
            contactModal.show();
        }, 300); // 300ms coincide con la animación de Bootstrap
    });
}


const btnPlumbing = document.getElementById("btn-plumbing");
const btnElectricity = document.getElementById("btn-electricity");
const btnCarpentry = document.getElementById("btn-carpentry");
const btnConstruction = document.getElementById("btn-construction");

function createBtnEventListener(referenceBtn, category) {


    referenceBtn.addEventListener("click", async () => {
        createServicesSection();
        const h2Services = document.getElementById("h2Services");


        h2Services.textContent = category;

        const services = await getServicesByCategory(category);
        showServices(services);
    });
}

createBtnEventListener(btnPlumbing, "Plumbing");
createBtnEventListener(btnElectricity, "Electricity");
createBtnEventListener(btnCarpentry, "Cleaning");
createBtnEventListener(btnConstruction, "Carpentry");

const btnLogOut = document.getElementById('btn-logout');
btnLogOut.addEventListener('click', () => {
    window.sessionStorage.clear();
    window.location.href = '../../index.html';
});