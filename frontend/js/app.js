// en frontend/js/app.js

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
                // ▼▼▼ CORRECCIÓN CLAVE: El enlace debe apuntar a client.html ▼▼▼
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
            window.location.href = '/frontend/index.html'; 
        });
    } else {
        guestButtons.classList.remove('d-none');
        userButtons.classList.add('d-none');
    }
}

document.addEventListener('DOMContentLoaded', updateNavbar);