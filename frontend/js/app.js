import { API_URL } from './api/config.js';

// Decode a JWT payload safely (handles base64url and padding)
function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const jsonPayload = decodeURIComponent(atob(padded).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (_) {
        return null;
    }
}

function updateNavbar() {
    const token = localStorage.getItem('token');
    const guestButtons = document.getElementById('guest-buttons');
    const userButtons = document.getElementById('user-buttons');
    const switchModeBtn = document.getElementById('switch-mode-btn');

    if (!guestButtons || !userButtons) return;

    if (token) {
        guestButtons.classList.add('d-none');
        userButtons.classList.remove('d-none');
        
        const payload = decodeJwt(token) || {};
        const userRoles = payload?.user?.roles || [];

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
// GOOGLE SIGN-IN HELPERS
// ===================================================================

/**
 * Runs when a user signs in with Google successfully.
 * Receives a JWT token with user info.
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
        
    // Redirect based on roles
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
 * Initialize Google service and render the custom button.
 */
async function setupGoogleSignIn() {
    const googleBtnContainer = document.getElementById('googleSignInBtn');
    if (!googleBtnContainer || typeof google === 'undefined') {
        if(googleBtnContainer) googleBtnContainer.innerText = 'No se pudo cargar Google Sign-In';
        return;
    }

    try {
    // Get client ID from backend dynamically
        const res = await fetch(`${API_URL}/api/google-client-id`);
        const data = await res.json();
        
        if (data.clientId) {
            google.accounts.id.initialize({
                client_id: data.clientId,
                callback: handleGoogleCredentialResponse,
                auto_select: false, // Disable "One Tap" popup
                cancel_on_tap_outside: true, 
                prompt_parent_id: 'loginModal' 
            });

            google.accounts.id.renderButton(
                googleBtnContainer,
                { theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'left' }
            );

            // Prevent "One Tap" popup across the page
            google.accounts.id.disableAutoSelect();

        } else {
            googleBtnContainer.innerText = 'No se pudo cargar Google Sign-In';
        }
    } catch (err) {
        console.error("Error setting up Google Sign-In:", err);
        googleBtnContainer.innerText = 'Error al cargar Google Sign-In';
    }
}

// ===================================================================
// MAIN SCRIPT ENTRY POINT
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();

    // If user is logged in and on the home page, redirect to their view
    try {
        const token = localStorage.getItem('token');
    const path = window.location.pathname || '';
    const isHome = path === '/' || path.endsWith('/index.html') || path.endsWith('/');
        if (token && isHome) {
        const payload = decodeJwt(token) || {};
        const roles = payload?.user?.roles || [];
            if (roles.includes('client')) {
                window.location.href = '/frontend/views/private/client.html';
            } else if (roles.includes('provider')) {
                window.location.href = '/frontend/views/private/provider.html';
            }
        }
    } catch (_) { /* noop */ }

    // Smooth animation for toggling the "About Us" section
    const aboutUsBtn = document.getElementById('aboutUsHeaderBtn');
    const aboutUsShowMoreBtn = document.getElementById('aboutUsShowMoreBtn');
    const aboutUsSection = document.getElementById('aboutUsSection');
    if (aboutUsSection) {
        // ... (Your animation code continues here unchanged)
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


// SCROLL-TO-TOP BUTTON
function setupScrollToTopButton() {
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    if (!scrollToTopBtn) {
        console.error('scroll-to-top button not found');
        return;
    }
    console.log('Scroll-to-top button configured');
    // Simple immediate scroll behavior
    scrollToTopBtn.onclick = function() {
        console.log('Click detected! Scrolling to top...');
        document.body.scrollTop = 0; // Para Safari
        document.documentElement.scrollTop = 0; // Para Chrome, Firefox, IE y Opera
        console.log('Scroll executed');
    };
    // Show/hide button based on scroll position
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