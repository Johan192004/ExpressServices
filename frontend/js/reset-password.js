import { resetPassword } from './api/authService.js';
import { API_URL } from './api/config.js';

document.addEventListener('DOMContentLoaded', async() => {
    const form = document.getElementById('resetPasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const resultDiv = document.getElementById('resetResult');

    // Get the token from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // If there's no token, show an error and stop
    if (!token) {
        resultDiv.className = 'alert alert-danger';
        resultDiv.textContent = 'Error: No se encontró un token de restablecimiento. Por favor, solicita un nuevo enlace.';
    form.style.display = 'none'; // Hide the form (UI remains Spanish)
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

    // Frontend validation
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
            return; // Stop if there are validation errors
        }

        resultDiv.className = 'alert alert-info';
        resultDiv.textContent = 'Actualizando contraseña...';

        try {
        // Use the authService function that doesn't go through fetchWithAuth
            const result = await resetPassword(token, newPassword);
            
            // Show success message
            resultDiv.className = 'alert alert-success';
            resultDiv.textContent = result.message || 'Contraseña actualizada exitosamente.';
            form.style.display = 'none'; // Hide the form
            

        } catch (error) {
            resultDiv.className = 'alert alert-danger';
            resultDiv.textContent = `Error: ${error.message}`;
        }
    });
});