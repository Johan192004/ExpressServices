import { resetPassword } from './api/authService.js';
import { API_URL } from './api/config.js';

document.addEventListener('DOMContentLoaded', async() => {
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
            // Usar la función del authService que no pasa por fetchWithAuth
            const result = await resetPassword(token, newPassword);
            
            // Mostramos el mensaje de éxito
            resultDiv.className = 'alert alert-success';
            resultDiv.textContent = result.message || 'Contraseña actualizada exitosamente.';
            form.style.display = 'none'; // Ocultamos el formulario
            

        } catch (error) {
            resultDiv.className = 'alert alert-danger';
            resultDiv.textContent = `Error: ${error.message}`;
        }
    });
});