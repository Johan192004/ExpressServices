document.addEventListener('DOMContentLoaded', function() {

    // --- Simulación de datos de servicios destacados ---
    const featuredServices = [
        {
            img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070&auto=format&fit=crop',
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            title: 'Servicio de Plomería Profesional',
            provider: 'Carlos Mendoza',
            price: 50000,
            description: 'Soluciones rápidas y eficientes para fugas, instalaciones y reparaciones.'
        },
        {
            img: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop',
            avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
            title: 'Diseño y Desarrollo Web Moderno',
            provider: 'Ana Gutiérrez',
            price: 120000,
            description: 'Páginas web atractivas y funcionales para tu negocio o proyecto personal.'
        },
        {
            img: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=2070&auto=format&fit=crop',
            avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
            title: 'Clases Particulares de Matemáticas',
            provider: 'Sofía Ramirez',
            price: 45000,
            description: 'Refuerzo escolar para primaria y bachillerato con pedagogía efectiva.'
        },
        {
            img: 'https://images.unsplash.com/photo-1516116216624-53e6973bea1c?q=80&w=2070&auto=format&fit=crop',
            avatar: 'https://randomuser.me/api/portraits/men/86.jpg',
            title: 'Mantenimiento de Jardines',
            provider: 'Luis Torres',
            price: 60000,
            description: 'Diseño, poda y mantenimiento para que tu jardín luzca increíble todo el año.'
        }
    ];

    // --- Función para cargar los servicios en el carrusel ---
    function loadFeaturedServices() {
        const carouselContainer = document.getElementById('carousel-inner-container');
        if (!carouselContainer) return;

        let active = 'active';
        featuredServices.forEach(service => {
            const carouselItem = `
                <div class="carousel-item ${active}">
                    <div class="col-12 col-md-4 p-2">
                        <div class="card service-card h-100">
                            <img src="${service.img}" class="card-img-top" alt="${service.title}">
                            <div class="card-body text-center">
                                <img src="${service.avatar}" alt="${service.provider}" class="provider-avatar">
                                <h5 class="card-title mt-3 fw-bold">${service.title}</h5>
                                <p class="card-text text-muted">Por ${service.provider}</p>
                                <p class="card-text">${service.description}</p>
                                <hr>
                                <div class="d-flex justify-content-between align-items-center">
                                    <p class="card-price mb-0">$${service.price.toLocaleString('es-CO')} <span>/hora</span></p>
                                    <a href="#" class="btn btn-outline-primary">Ver Más</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            carouselContainer.innerHTML += carouselItem;
            active = ''; // Solo el primer item debe tener la clase 'active'
        });
        
        // Adaptar el carrusel para mostrar 3 tarjetas a la vez en desktop
        adaptCarouselForMultipleItems();
    }
    
    function adaptCarouselForMultipleItems() {
        const carousel = new bootstrap.Carousel(document.getElementById('servicesCarousel'));
        const items = document.querySelectorAll('#servicesCarousel .carousel-item');
        items.forEach((el) => {
            const minPerSlide = 3;
            let next = el.nextElementSibling;
            for (let i = 1; i < minPerSlide; i++) {
                if (!next) {
                    next = items[0];
                }
                let cloneChild = next.cloneNode(true);
                el.appendChild(cloneChild.children[0]);
                next = next.nextElementSibling;
            }
        });
    }

    // --- Simulación de funcionalidad de botones ---
    document.getElementById('loginBtn').addEventListener('click', () => {
        alert('Simulación: Abriendo modal de Inicio de Sesión...');
    });

    document.getElementById('registerBtn').addEventListener('click', () => {
        alert('Simulación: Redirigiendo a la página de Registro...');
    });

    // --- Ejecutar funciones al cargar la página ---
    loadFeaturedServices();

});