// frontend/js/utils/modalUtils.js

/**
 * Show a custom alert modal instead of alert().
 * @param {string} message - Message to display (UI-facing; keep in Spanish where applicable)
 * @param {string} type - Alert type: 'success', 'error', 'warning', 'info'
 * @param {string|null} title - Optional title override (UI-facing)
 */
export function showAlert(message, type = 'info', title = null) {
    return new Promise((resolve) => {
     // Create the modal dynamically if it doesn't exist
        let alertModal = document.getElementById('alertModal');
        if (!alertModal) {
            alertModal = createAlertModal();
            document.body.appendChild(alertModal);
        }

        // Configurar el contenido del modal
        const modalBody = alertModal.querySelector('.modal-body');
        const icon = getIconForType(type);
        const colorClass = getColorClassForType(type);
    const heading = title || getTitleForType(type);

        modalBody.innerHTML = `
            <div class="text-center">
                <div class="mb-3">
                    <i class="${icon} ${colorClass}" style="font-size: 3rem;"></i>
                </div>
        <h5 class="fw-bold">${heading}</h5>
                <p class="text-muted">${message}</p>
            </div>
        `;

    // Show modal
        const modal = new bootstrap.Modal(alertModal);
        modal.show();

    // Resolve promise when modal is closed
        alertModal.addEventListener('hidden.bs.modal', () => {
            resolve();
        }, { once: true });
    });
}

/**
 * Show a custom confirmation modal instead of confirm().
 * @param {string} message - Confirmation message (UI-facing)
 * @param {string} title - Modal title (UI-facing)
 */
export function showConfirm(message, title = 'Confirmar acción') {
    return new Promise((resolve) => {
    // Create the modal dynamically if it doesn't exist
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

    // Show modal
        const modal = new bootstrap.Modal(confirmModal);
        modal.show();

    // Handle clicks
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
 * Show a custom prompt modal instead of prompt().
 * @param {string} message - Prompt message (UI-facing)
 * @param {string} defaultValue - Default value
 * @param {string} title - Modal title (UI-facing)
 */
export function showPrompt(message, defaultValue = '', title = 'Ingrese información') {
    return new Promise((resolve) => {
    // Create the modal dynamically if it doesn't exist
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

    // Show modal
        const modal = new bootstrap.Modal(promptModal);
        modal.show();

    // Focus input field
        setTimeout(() => {
            document.getElementById('promptInput').focus();
        }, 500);

    // Handle clicks
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

    // Allow submit with Enter key
        modalBody.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        });
    });
}

// Shared utility to clean backdrops and body class when chained modals close
export function cleanupModalBackdrops() {
    try {
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
    } catch (_) { /* noop */ }
}

// Helper functions to create modals
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
            <!-- Dynamic content -->
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
            <!-- Dynamic content -->
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
            <!-- Dynamic content -->
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
