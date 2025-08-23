import { getFavoritesById } from "./api/favorites.js";

async function loadFavorites(idClient) {
    const Favorites = await getFavoritesById(idClient);
    const carouselContainer = document.getElementById('carousel-inner-container');
    if (!carouselContainer) return;

        Favorites.forEach(service => {

            const serviceContainer = document.createElement('div');
            

            serviceContainer.innerHTML = `
                    <div class="col-12 col-md-4 p-2">
                        <div class="card service-card h-100">
                            <div class="card-body text-center">
                                <img src="${service.personal_picture}" alt="${service.provider_name}" class="provider-avatar">
                                <h5 class="card-title mt-3 fw-bold">${service.name}</h5>
                                <p class="card-text text-muted">Por ${service.provider_name}</p>
                                <p class="card-text">${service.description}</p>
                                <hr>
                                <div class="d-flex justify-content-between align-items-center">
                                    <p class="card-price mb-0">$${service.hour_price.toLocaleString('es-CO')} <span>/hora</span></p>
                                    <a href="#" class="btn btn-outline-primary">Ver Más</a>
                                </div>
                            </div>
                        </div>
                    </div>`;
            carouselContainer.appendChild(serviceContainer);
        });
    }

document.addEventListener('DOMContentLoaded', () => {
    const idClient = window.localStorage.getItem("userId") || 0;
    if(idClient == 0) return;
    loadFavorites(idClient);
});

//Cuando se inicie sesion, se tiene que guardar el id del usuario para luego cargar los respectivos servicios favoritos