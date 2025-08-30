// frontend/js/handlers/authHandlers.js

import { loginUser, registerClient, registerProvider, checkEmailExists, requestPasswordReset } from '../api/authService.js';
import { showAlert } from '../utils/modalUtils.js';

/**
 * Adds a listener to an email field to check if the email exists in the DB
 * and adjusts the registration form UI dynamically.
 */
function setupSmartEmailCheck(emailInputId, passwordInputId, messageDivId) {
    const emailInput = document.getElementById(emailInputId);
    const passwordInput = document.getElementById(passwordInputId);
    const messageDiv = document.getElementById(messageDivId);

    if (!emailInput || !passwordInput || !messageDiv) return; // Robust guard

    emailInput.addEventListener('blur', async (e) => {
        const email = e.target.value;
    const defaultPlaceholder = 'Contraseña (mín. 8 caracteres)';
        if (!email || !e.target.checkValidity()) {
            passwordInput.disabled = false;
            passwordInput.placeholder = defaultPlaceholder;
            messageDiv.textContent = '';
            return;
        }
        try {
            const response = await checkEmailExists(email);
            if (response.exists) {
                messageDiv.innerHTML = `👋 <strong>¡Hola de nuevo!</strong> Ingresa tu contraseña actual para continuar.`;
                passwordInput.placeholder = 'Ingresa tu contraseña actual';
            } else {
                messageDiv.textContent = '';
                passwordInput.placeholder = defaultPlaceholder;
            }
            passwordInput.disabled = false;
            passwordInput.value = '';
    } catch (error) { console.error(error); }
    });
}


/**
 * Main function that wires all authentication forms
 * (Login, Client/Provider Register, Forgot Password).
 */
export function setupAuthForms() {
    setupSmartEmailCheck('provider-email', 'provider-password', 'provider-form-message');
    setupSmartEmailCheck('client-email', 'client-password', 'client-form-message');

    const loginForm = document.getElementById("loginForm");
    const clientForm = document.getElementById("clientForm");
    const providerForm = document.getElementById("providerForm");
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    
if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            const loginResultDiv = document.getElementById("loginResult");
            
            if (loginResultDiv) {
                loginResultDiv.textContent = 'Iniciando sesión...';
                loginResultDiv.className = 'mt-3 text-center text-info';
            }

            try {
                const result = await loginUser(data);
                localStorage.setItem('token', result.token);
                
                if (loginResultDiv) {
                    loginResultDiv.textContent = `¡Bienvenido, ${result.user.full_name}! Redirigiendo...`;
                    loginResultDiv.className = 'mt-3 text-center text-success';
                }
                setTimeout(() => {
                    // Check roles returned by backend
                    const userRoles = result.user.roles || [];

                    // Prefer client view if both roles
                    if (userRoles.includes('client')) {
                        window.location.href = '/frontend/views/private/client.html';
                    } else if (userRoles.includes('provider')) {
                        window.location.href = '/frontend/views/private/provider.html';
                    } else {
                        // If no role, clear and reload index
                        window.localStorage.clear();
                        window.location.href = '/index.html';
                    }
                }, 1000);

            } catch (error) {
                if (loginResultDiv) {
                    loginResultDiv.textContent = `Error: ${error.message}`;
                    loginResultDiv.className = 'mt-3 text-center text-danger';
                }
                console.error("Login error:", error);
            }
        });
    }

    
    const handleRegister = async (form, registerFunction) => {
        const data = Object.fromEntries(new FormData(form));
        try {
            const result = await registerFunction(data);
            await showAlert(result.message || 'Registro exitoso. Ahora puedes iniciar sesión.', 'success');
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
            new bootstrap.Modal(document.getElementById('loginModal')).show();
        } catch (error) {
            await showAlert(`Error: ${error.message}`, 'error');
        }
    };

    if(clientForm) clientForm.addEventListener("submit", (e) => {
        e.preventDefault();
        handleRegister(e.target, registerClient);
    });

    if(providerForm) providerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        handleRegister(e.target, registerProvider);
    });
    
    if(forgotPasswordForm) {
        forgotPasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const resultDiv = document.getElementById('forgotPasswordResult');
            const email = e.target.querySelector('input[name="email"]').value;
            if (resultDiv) resultDiv.textContent = 'Enviando enlace...';
            try {
                const result = await requestPasswordReset(email);
                if (resultDiv) resultDiv.textContent = result.message;
            } catch (error) {
                if (resultDiv) resultDiv.textContent = `Error: ${error.message}`;
            }
        });
    }
}