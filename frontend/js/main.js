// Importamos las funciones que se comunican con la API desde el service worker
import { loginUser, registerClient, registerProvider, getCities, checkEmailExists } from './api/authService.js';

// --- DATOS SIMULADOS (Eventualmente vendrán de tu API) ---
const featuredServices = [
    {
        img: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop',
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        title: 'Diseño y Desarrollo Web Moderno',
        provider: 'Ana Gutiérrez',
        price: 120000,
        description: 'Páginas web atractivas y funcionales para tu negocio.'
    },
    {
        img: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=2070&auto=format&fit=crop',
        avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
        title: 'Clases Particulares de Matemáticas',
        provider: 'Sofía Ramirez',
        price: 45000,
        description: 'Refuerzo escolar para primaria y bachillerato.'
    },
    {
        img: 'https://images.unsplash.com/photo-1516116216624-53e6973bea1c?q=80&w=2070&auto=format&fit=crop',
        avatar: 'https://randomuser.me/api/portraits/men/86.jpg',
        title: 'Mantenimiento de Jardines',
        provider: 'Luis Torres',
        price: 60000,
        description: 'Diseño, poda y mantenimiento para tu jardín.'
    },
    {
        img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070&auto=format&fit=crop',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        title: 'Servicio de Plomería Profesional',
        provider: 'Carlos Mendoza',
        price: 50000,
        description: 'Soluciones rápidas para fugas e instalaciones.'
    },
    {
        img: 'https://images.unsplash.com/photo-1558695423-835e2f3a6157?q=80&w=2070&auto=format&fit=crop',
        avatar: 'https://randomuser.me/api/portraits/women/12.jpg',
        title: 'Asesoría Contable para PyMEs',
        provider: 'Laura Vélez',
        price: 95000,
        description: 'Mantén tus finanzas en orden y optimiza impuestos.'
    },
    {
        img: 'https://images.unsplash.com/photo-1518601362033-765241b1d83f?q=80&w=2070&auto=format&fit=crop',
        avatar: 'https://randomuser.me/api/portraits/men/55.jpg',
        title: 'Reparación de Computadores',
        provider: 'David Correa',
        price: 70000,
        description: 'Diagnóstico y reparación de hardware y software.'
    }
];

// --- PUNTO DE ENTRADA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    // Cargar funcionalidades de la página
    loadFeaturedServices();
    loadCities();
    setupModalListeners();
    setupFormSubmissions();
    setupSmartForms();
});

// --- LÓGICA DE LA INTERFAZ "INTELIGENTE" ---
function setupSmartEmailCheck(emailInputId, passwordInputId, messageDivId, userType) {
    const emailInput = document.getElementById(emailInputId);
    const passwordInput = document.getElementById(passwordInputId);
    const messageDiv = document.getElementById(messageDivId);

    if (!emailInput) return;

    emailInput.addEventListener('blur', async (e) => {
        const email = e.target.value;
        
        if (!email || !e.target.checkValidity()) {
            passwordInput.disabled = false;
            messageDiv.textContent = '';
            return;
        }

        try {
            const response = await checkEmailExists(email);
            if (response.exists) {
                const message = userType === 'provider' 
                    ? `👋 <strong>¡Hola de nuevo!</strong> Ya tienes una cuenta. Completa tu perfil para ser proveedor.`
                    : `👋 <strong>¡Hola de nuevo!</strong> Ya tienes una cuenta. Simplemente inicia sesión.`;

                messageDiv.innerHTML = message;
                passwordInput.disabled = true;
                passwordInput.value = '********';
            } else {
                messageDiv.textContent = '';
                passwordInput.disabled = false;
                passwordInput.value = '';
            }
        } catch (error) {
            console.error(error);
            messageDiv.textContent = 'No se pudo verificar el correo. Inténtalo de nuevo.';
        }
    });
}

// NUEVA FUNCIÓN "Maestra" que configura ambos formularios
function setupSmartForms() {
    // Configura el formulario de proveedor
    setupSmartEmailCheck('provider-email', 'provider-password', 'provider-form-message', 'provider');
    
    // Configura el formulario de cliente
    setupSmartEmailCheck('client-email', 'client-password', 'client-form-message', 'client');
}

// --- LÓGICA DEL CARRUSEL ---
function loadFeaturedServices() {
    const carouselContainer = document.getElementById('carousel-inner-container');
    if (!carouselContainer) return;

    carouselContainer.innerHTML = ''; // Limpiamos el contenedor
    const chunkSize = 3; // Mostrar 3 tarjetas por slide en desktop

    // Agrupamos los servicios de 3 en 3
    for (let i = 0; i < featuredServices.length; i += chunkSize) {
        const chunk = featuredServices.slice(i, i + chunkSize);
        
        const carouselItem = document.createElement('div');
        // El primer 'item' del carrusel debe tener la clase 'active'
        carouselItem.className = `carousel-item ${i === 0 ? 'active' : ''}`;
        
        const row = document.createElement('div');
        row.className = 'row';

        chunk.forEach(service => {
            row.innerHTML += `
                <div class="col-12 col-md-4 mb-4">
                    <div class="card service-card h-100">
                        <img src="${service.img}" class="card-img-top" alt="${service.title}">
                        <div class="card-body text-center">
                            <img src="${service.avatar}" alt="${service.provider}" class="provider-avatar">
                            <h5 class="card-title mt-3 fw-bold">${service.title}</h5>
                            <p class="card-text text-muted small">Por ${service.provider}</p>
                            <p class="card-text">${service.description}</p>
                            <hr>
                            <div class="d-flex justify-content-between align-items-center">
                                <p class="card-price mb-0">$${service.price.toLocaleString('es-CO')} <span>/hora</span></p>
                                <a href="#" class="btn btn-outline-primary">Ver Más</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        carouselItem.appendChild(row);
        carouselContainer.appendChild(carouselItem);
    }
}

// --- LÓGICA DE MODALES ---
function setupModalListeners() {
    // Selectores de los elementos del modal de registro
    const roleSelector = document.getElementById('role-selector');
    const clientFormContainer = document.getElementById('client-form-container');
    const providerFormContainer = document.getElementById('provider-form-container');
    const showClientFormBtn = document.getElementById('showClientFormBtn');
    const showProviderFormBtn = document.getElementById('showProviderFormBtn');
    const registerModalElement = document.getElementById('registerModal');

    // Función para mostrar un formulario y ocultar el selector de rol
    const showForm = (formToShow) => {
        roleSelector.classList.add('d-none'); // Oculta los botones de selección
        formToShow.classList.remove('d-none'); // Muestra el formulario elegido
    };

    // Asignamos el evento al botón del cliente
    if (showClientFormBtn) {
        showClientFormBtn.addEventListener('click', () => {
            showForm(clientFormContainer);
        });
    }

    // Asignamos el evento al botón del proveedor
    if (showProviderFormBtn) {
        showProviderFormBtn.addEventListener('click', () => {
            showForm(providerFormContainer);
        });
    }

    // Lógica para resetear el modal cuando se cierra
    if (registerModalElement) {
        registerModalElement.addEventListener('hidden.bs.modal', () => {
            roleSelector.classList.remove('d-none'); // Vuelve a mostrar los botones
            clientFormContainer.classList.add('d-none');
        providerFormContainer.classList.add('d-none');
            // Limpiamos los formularios
            document.getElementById('clientForm').reset();
            document.getElementById('providerForm').reset();
        });
    }
}
// --- LÓGICA DE ENVÍO DE FORMULARIOS ---
function setupFormSubmissions() {
    const loginForm = document.getElementById("loginForm");
    const clientForm = document.getElementById("clientForm");
    const providerForm = document.getElementById("providerForm");
    const loginResultDiv = document.getElementById("loginResult");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        loginResultDiv.textContent = 'Iniciando sesión...';
        loginResultDiv.className = 'mt-3 text-center text-info';

        try {
            const result = await loginUser(data);
            localStorage.setItem('token', result.token);
            loginResultDiv.textContent = `¡Bienvenido, ${result.user.full_name}!`;
            loginResultDiv.className = 'mt-3 text-center text-success';
            
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
                window.location.reload(); 
            }, 1000);

        } catch (error) {
            loginResultDiv.textContent = `Error: ${error.message}`;
            loginResultDiv.className = 'mt-3 text-center text-danger';
        }
    });

    clientForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            const result = await registerClient(data);
            alert(result.message || 'Cliente registrado con éxito. Ahora puedes iniciar sesión.');
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
            new bootstrap.Modal(document.getElementById('loginModal')).show();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    providerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            const result = await registerProvider(data);
            alert(result.message || 'Proveedor registrado con éxito. Ahora puedes iniciar sesión.');
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
            new bootstrap.Modal(document.getElementById('loginModal')).show();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });
}

// --- CARGA DE DATOS (CIUDADES) ---
async function loadCities() {
    const citySelect = document.getElementById('provider-city-select');
    if (!citySelect) return;
    try {
        const cities = await getCities();
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
    } catch (error) {
        console.error(error.message);
    }
}