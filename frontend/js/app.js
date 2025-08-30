import { API_URL } from './api/config.js';
function updateNavbar() {
    const token = localStorage.getItem('token');
    const guestButtons = document.getElementById('guest-buttons');
    const userButtons = document.getElementById('user-buttons');
    const switchModeBtn = document.getElementById('switch-mode-btn');

    if (!guestButtons || !userButtons) return;

    if (token) {
        guestButtons.classList.add('d-none');
        userButtons.classList.remove('d-none');
        
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userRoles = payload.user.roles || [];

        const isProviderView = window.location.pathname.includes('/views/private/provider.html');

        if (userRoles.includes('provider') && userRoles.includes('client')) {
            switchModeBtn.classList.remove('d-none');
            if (isProviderView) {
                switchModeBtn.textContent = 'Modo Cliente';
                switchModeBtn.href = '/frontend/views/private/client.html';
            } else {
                switchModeBtn.textContent = 'Modo Proveedor';
                switchModeBtn.href = '/frontend/views/private/provider.html';
            }
        } else {
            switchModeBtn.classList.add('d-none');
        }

        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/index.html'; 
        });
    } else {
        guestButtons.classList.remove('d-none');
        userButtons.classList.add('d-none');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();

    // Si el usuario ya está logueado y está en el home, redirigir a su vista
    try {
        const token = localStorage.getItem('token');
        const path = window.location.pathname || '';
        const isHome = path === '/' || path.endsWith('/index.html');
        if (token && isHome) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const roles = payload?.user?.roles || [];
            if (roles.includes('client')) {
                window.location.href = '/frontend/views/private/client.html';
            } else if (roles.includes('provider')) {
                window.location.href = '/frontend/views/private/provider.html';
            }
        }
    } catch (_) { /* noop */ }

    // Animación suave para mostrar/ocultar sección "Acerca de Nosotros"
    const aboutUsBtn = document.getElementById('aboutUsHeaderBtn');
    const aboutUsShowMoreBtn = document.getElementById('aboutUsShowMoreBtn');
    const aboutUsSection = document.getElementById('aboutUsSection');
    if (aboutUsSection) {
        // Inicializa estilos para animación
        aboutUsSection.style.transition = 'max-height 0.5s cubic-bezier(.4,0,.2,1), opacity 0.4s';
        aboutUsSection.style.overflow = 'hidden';
        aboutUsSection.style.maxHeight = '0';
        aboutUsSection.style.opacity = '0';
        aboutUsSection.classList.add('d-none');

        function toggleAboutUs() {
            if (aboutUsSection.classList.contains('d-none')) {
                aboutUsSection.classList.remove('d-none');
                // Forzar reflow para que la transición funcione
                void aboutUsSection.offsetWidth;
                aboutUsSection.style.maxHeight = aboutUsSection.scrollHeight + 'px';
                aboutUsSection.style.opacity = '1';
                setTimeout(() => {
                    const title = aboutUsSection.querySelector('h3');
                    if (title) {
                        title.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        aboutUsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            } else {
                aboutUsSection.style.maxHeight = '0';
                aboutUsSection.style.opacity = '0';
                setTimeout(() => {
                    aboutUsSection.classList.add('d-none');
                }, 500);
            }
        }
        if (aboutUsBtn) {
            aboutUsBtn.addEventListener('click', toggleAboutUs);
        }
        if (aboutUsShowMoreBtn) {
            aboutUsShowMoreBtn.addEventListener('click', toggleAboutUs);
        }
    }
});

// --- Google Sign-In ---

window.onload = async function() {
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
        // Obtiene el client ID desde el backend de forma dinámica
        try {
            const res = await fetch(`${API_URL}/api/google-client-id`);
            const data = await res.json();
            if (data.clientId) {
                google.accounts.id.initialize({
                    client_id: data.clientId,
                    callback: handleGoogleCredentialResponse,
                    auto_select: false // Desactiva selección automática de cuenta
                });
                google.accounts.id.renderButton(
                    googleBtn,
                    { theme: 'outline', size: 'large', text: 'signin_with' } // Botón genérico
                );
            } else {
                googleBtn.innerText = 'No se pudo cargar Google Sign-In';
            }
        } catch (err) {
            googleBtn.innerText = 'Error al cargar Google Sign-In';
        }
    }
};

async function handleGoogleCredentialResponse(response) {
    const res = await fetch(`${API_URL}/api/login/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
    });
    const data = await res.json();
    if (data.token) {
        localStorage.setItem('token', data.token);
        // Redirige según roles (cliente por defecto si tiene ambos)
        try {
            const payload = JSON.parse(atob(data.token.split('.')[1]));
            const roles = payload?.user?.roles || [];
            if (roles.includes('client')) {
                window.location.href = '/frontend/views/private/client.html';
            } else if (roles.includes('provider')) {
                window.location.href = '/frontend/views/private/provider.html';
            } else {
                window.location.href = '/index.html';
            }
        } catch (_) {
            window.location.href = '/index.html';
        }
    } else {
        document.getElementById('loginResult').innerText = data.error || 'Error de autenticación con Google';
    }
}