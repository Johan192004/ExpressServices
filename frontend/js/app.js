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

// ===================================================================
// NUEVAS FUNCIONES PARA GOOGLE SIGN-IN
// ===================================================================

/**
 * Esta función se ejecuta cuando un usuario inicia sesión con Google correctamente.
 * Recibe un token JWT con la información del usuario.
 */
async function handleGoogleCredentialResponse(response) {
    const res = await fetch(`${API_URL}/api/login/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
    });
    const data = await res.json();
    if (data.token) {
        localStorage.setItem('token', data.token);
        
        // Redirige según roles
        try {
            const payload = JSON.parse(atob(data.token.split('.')[1]));
            const roles = payload?.user?.roles || [];
            if (roles.includes('client')) {
                window.location.href = '/frontend/views/private/client.html';
            } else if (roles.includes('provider')) {
                window.location.href = '/frontend/views/private/provider.html';
            } else {
                window.location.href = '/index.html'; // Fallback
            }
        } catch (_) {
            window.location.href = '/index.html'; // Fallback
        }
    } else {
        const loginResult = document.getElementById('loginResult');
        if(loginResult) loginResult.innerText = data.error || 'Error de autenticación con Google';
    }
}

/**
 * Inicializa el servicio de Google y dibuja el botón personalizado.
 */
async function setupGoogleSignIn() {
    const googleBtnContainer = document.getElementById('googleSignInBtn');
    if (!googleBtnContainer || typeof google === 'undefined') {
        if(googleBtnContainer) googleBtnContainer.innerText = 'No se pudo cargar Google Sign-In';
        return;
    }

    try {
        // Obtiene el client ID desde el backend de forma dinámica
        const res = await fetch(`${API_URL}/api/google-client-id`);
        const data = await res.json();
        
        if (data.clientId) {
            google.accounts.id.initialize({
                client_id: data.clientId,
                callback: handleGoogleCredentialResponse,
                auto_select: false, // Desactiva el popup "One Tap"
                cancel_on_tap_outside: true, 
                prompt_parent_id: 'loginModal' 
            });

            google.accounts.id.renderButton(
                googleBtnContainer,
                { theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'left' }
            );

            // Previene el popup "One Tap" en toda la página
            google.accounts.id.disableAutoSelect();

        } else {
            googleBtnContainer.innerText = 'No se pudo cargar Google Sign-In';
        }
    } catch (err) {
        console.error("Error al configurar Google Sign-In:", err);
        googleBtnContainer.innerText = 'Error al cargar Google Sign-In';
    }
}

// ===================================================================
// PUNTO DE ENTRADA PRINCIPAL DEL SCRIPT
// ===================================================================

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
        // ... (Tu código de animación sigue aquí sin cambios)
        aboutUsSection.style.transition = 'max-height 0.5s cubic-bezier(.4,0,.2,1), opacity 0.4s';
        aboutUsSection.style.overflow = 'hidden';
        aboutUsSection.style.maxHeight = '0';
        aboutUsSection.style.opacity = '0';
        aboutUsSection.classList.add('d-none');

        function toggleAboutUs() {
            if (aboutUsSection.classList.contains('d-none')) {
                aboutUsSection.classList.remove('d-none');
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

    // --- LLAMADA FINAL PARA CONFIGURAR GOOGLE SIGN-IN ---
    setupGoogleSignIn();
});


// FUNCIÓN PARA EL BOTÓN DE SCROLL HACIA ARRIBA
function setupScrollToTopButton() {
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    if (!scrollToTopBtn) {
        console.error('Botón scroll-to-top no encontrado');
        return;
    }
    console.log('Botón de scroll configurado correctamente');
    // Función simple y directa para scroll
    scrollToTopBtn.onclick = function() {
        console.log('¡Click detectado! Iniciando scroll...');
        document.body.scrollTop = 0; // Para Safari
        document.documentElement.scrollTop = 0; // Para Chrome, Firefox, IE y Opera
        console.log('Scroll ejecutado');
    };
    // Mostrar/ocultar el botón basado en la posición del scroll
    window.onscroll = function() {
        if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
            scrollToTopBtn.style.opacity = '1';
            scrollToTopBtn.style.visibility = 'visible';
        } else {
            scrollToTopBtn.style.opacity = '0.7';
            scrollToTopBtn.style.visibility = 'visible';
        }
    };
}

setupScrollToTopButton();