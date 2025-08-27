import { getUserProfile } from './api/authService.js';
import { API_URL } from './api/config.js';
let myProviderId = null; // El ID de proveedor del usuario logueado
let myClientId = null; // El ID de cliente del usuario logueado

document.addEventListener('DOMContentLoaded', async() => {
    const userProfile = await getUserProfile();

    if (userProfile) {
        myProviderId = userProfile.id_provider;
        myClientId = userProfile.id_client;
    }

    const form = document.getElementById('resetPasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const resultDiv = document.getElementById('resetResult');

    // Obtenemos el token de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // Si no hay token, mostramos un error y detenemos todo
    if (!token) {
        resultDiv.className = 'alert alert-danger';
        resultDiv.textContent = 'Error: No se encontró un token de restablecimiento. Por favor, solicita un nuevo enlace.';
        form.style.display = 'none'; // Ocultamos el formulario
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validación en el frontend
        let isValid = true;
        if (newPassword.length < 8) {
            newPasswordInput.classList.add('is-invalid');
            isValid = false;
        } else {
            newPasswordInput.classList.remove('is-invalid');
        }

        if (newPassword !== confirmPassword) {
            confirmPasswordInput.classList.add('is-invalid');
            isValid = false;
        } else {
            confirmPasswordInput.classList.remove('is-invalid');
        }

        if (!isValid) {
            return; // Detenemos si hay errores de validación
        }

        resultDiv.className = 'alert alert-info';
        resultDiv.textContent = 'Actualizando contraseña...';

        try {
            // Llamada a la API del backend
            const response = await fetch(`${API_URL}/api/password/reset/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ocurrió un error.');
            }
            
            // Mostramos el mensaje de éxito
            resultDiv.className = 'alert alert-success';
            resultDiv.textContent = result.message;
            form.style.display = 'none'; // Ocultamos el formulario
            
            // Redirigimos al inicio después de unos segundos
            setTimeout(() => {
                if (myProviderId) {
                    window.location.href = 'private/provider.html';
                } else if (myClientId) {
                    window.location.href = 'private/client.html';
                }
            }, 3000);

        } catch (error) {
            resultDiv.className = 'alert alert-danger';
            resultDiv.textContent = `Error: ${error.message}`;
        }
    });
});