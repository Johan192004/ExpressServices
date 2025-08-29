// frontend/js/utils/modalUtils.js

/**
 * Muestra un modal de alerta personalizado en lugar de alert()
 * @param {string} message - El mensaje a mostrar
 * @param {string} type - Tipo de alerta: 'success', 'error', 'warning', 'info'
 */
export function showAlert(message, type = 'info') {
    return new Promise((resolve) => {
        // Crear el modal dinámicamente si no existe
        let alertModal = document.getElementById('alertModal');
        if (!alertModal) {
            alertModal = createAlertModal();
            document.body.appendChild(alertModal);
        }

        // Configurar el contenido del modal
        const modalBody = alertModal.querySelector('.modal-body');
        const icon = getIconForType(type);
        const colorClass = getColorClassForType(type);

        modalBody.innerHTML = `
            <div class="text-center">
                <div class="mb-3">
                    <i class="${icon} ${colorClass}" style="font-size: 3rem;"></i>
                </div>
                <h5 class="fw-bold">${getTitleForType(type)}</h5>
                <p class="text-muted">${message}</p>
            </div>
        `;

        // Mostrar el modal
        const modal = new bootstrap.Modal(alertModal);
        modal.show();

        // Resolver la promesa cuando se cierre el modal
        alertModal.addEventListener('hidden.bs.modal', () => {
            resolve();
        }, { once: true });
    });
}

/**
 * Muestra un modal de confirmación personalizado en lugar de confirm()
 * @param {string} message - El mensaje a mostrar
 * @param {string} title - Título del modal
 */
export function showConfirm(message, title = 'Confirmar acción') {
    return new Promise((resolve) => {
        // Crear el modal dinámicamente si no existe
        let confirmModal = document.getElementById('confirmModal');
        if (!confirmModal) {
            confirmModal = createConfirmModal();
            document.body.appendChild(confirmModal);
        }

        // Configurar el contenido del modal
        const modalTitle = confirmModal.querySelector('.modal-title');
        const modalBody = confirmModal.querySelector('.modal-body');
        const confirmBtn = confirmModal.querySelector('#confirmBtn');
        const cancelBtn = confirmModal.querySelector('#cancelBtn');

        modalTitle.textContent = title;
        modalBody.innerHTML = `
            <div class="text-center">
                <div class="mb-3">
                    <i class="bi bi-question-circle-fill text-warning" style="font-size: 3rem;"></i>
                </div>
                <p>${message}</p>
            </div>
        `;

        // Mostrar el modal
        const modal = new bootstrap.Modal(confirmModal);
        modal.show();

        // Manejar los clicks
        const handleConfirm = () => {
            modal.hide();
            resolve(true);
            cleanup();
        };

        const handleCancel = () => {
            modal.hide();
            resolve(false);
            cleanup();
        };

        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

/**
 * Muestra un modal de prompt personalizado en lugar de prompt()
 * @param {string} message - El mensaje a mostrar
 * @param {string} defaultValue - Valor por defecto
 * @param {string} title - Título del modal
 */
export function showPrompt(message, defaultValue = '', title = 'Ingrese información') {
    return new Promise((resolve) => {
        // Crear el modal dinámicamente si no existe
        let promptModal = document.getElementById('promptModal');
        if (!promptModal) {
            promptModal = createPromptModal();
            document.body.appendChild(promptModal);
        }

        // Configurar el contenido del modal
        const modalTitle = promptModal.querySelector('.modal-title');
        const modalBody = promptModal.querySelector('.modal-body');
        const submitBtn = promptModal.querySelector('#promptSubmitBtn');
        const cancelBtn = promptModal.querySelector('#promptCancelBtn');

        modalTitle.textContent = title;
        modalBody.innerHTML = `
            <div class="mb-3">
                <label class="form-label">${message}</label>
                <input type="text" class="form-control" id="promptInput" value="${defaultValue}">
            </div>
        `;

        // Mostrar el modal
        const modal = new bootstrap.Modal(promptModal);
        modal.show();

        // Focus en el input
        setTimeout(() => {
            document.getElementById('promptInput').focus();
        }, 500);

        // Manejar los clicks
        const handleSubmit = () => {
            const value = document.getElementById('promptInput').value;
            modal.hide();
            resolve(value);
            cleanup();
        };

        const handleCancel = () => {
            modal.hide();
            resolve(null);
            cleanup();
        };

        const cleanup = () => {
            submitBtn.removeEventListener('click', handleSubmit);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        submitBtn.addEventListener('click', handleSubmit);
        cancelBtn.addEventListener('click', handleCancel);

        // Permitir envío con Enter
        modalBody.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        });
    });
}

// Funciones helper para crear los modales
function createAlertModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'alertModal';
    modal.tabIndex = -1;
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header border-0">
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <!-- Contenido dinámico -->
                </div>
                <div class="modal-footer border-0 justify-content-center">
                    <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Entendido</button>
                </div>
            </div>
        </div>
    `;
    return modal;
}

function createConfirmModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'confirmModal';
    modal.tabIndex = -1;
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Confirmar</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <!-- Contenido dinámico -->
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancelBtn">Cancelar</button>
                    <button type="button" class="btn btn-primary" id="confirmBtn">Confirmar</button>
                </div>
            </div>
        </div>
    `;
    return modal;
}

function createPromptModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'promptModal';
    modal.tabIndex = -1;
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Información requerida</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <!-- Contenido dinámico -->
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="promptCancelBtn">Cancelar</button>
                    <button type="button" class="btn btn-primary" id="promptSubmitBtn">Enviar</button>
                </div>
            </div>
        </div>
    `;
    return modal;
}

function getIconForType(type) {
    switch (type) {
        case 'success': return 'bi bi-check-circle-fill';
        case 'error': return 'bi bi-x-circle-fill';
        case 'warning': return 'bi bi-exclamation-triangle-fill';
        default: return 'bi bi-info-circle-fill';
    }
}

function getColorClassForType(type) {
    switch (type) {
        case 'success': return 'text-success';
        case 'error': return 'text-danger';
        case 'warning': return 'text-warning';
        default: return 'text-primary';
    }
}

function getTitleForType(type) {
    switch (type) {
        case 'success': return '¡Éxito!';
        case 'error': return 'Error';
        case 'warning': return 'Advertencia';
        default: return 'Información';
    }
}
