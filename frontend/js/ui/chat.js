
import { getMessages, sendMessage } from '../api/authService.js';
import { showAlert } from '../utils/modalUtils.js';

let currentConversationId = null;
let chatPollingInterval = null;
let lastMessageId = null; // Para trackear el último mensaje cargado

// Función para abrir el modal del chat y cargar los mensajes
export async function openChatModal(conversationId) {
    currentConversationId = conversationId;
    
    // Verificamos si el HTML del modal ya existe, si no, lo añadimos.
    if (!document.getElementById('chatModal')) {
                        const modalHtml = `
                                <div class="modal fade" id="chatModal" tabindex="-1">
                                    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                                        <div class="modal-content">
                                            <div class="modal-header">
                                                <h5 class="modal-title fw-bold" id="chat-modal-title">Chat con Proveedor</h5>
                                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                            </div>
                                            <div class="modal-body" id="chat-messages-container" style="display: flex; flex-direction: column-reverse; height: 400px; overflow-y: auto;"></div>
                                            <div class="modal-footer">
                                                <form id="chat-send-form" class="w-100 d-flex">
                                                    <input type="text" id="chat-message-input" class="form-control me-2" placeholder="Escribe un mensaje..." required>
                                                    <button type="submit" class="btn btn-primary"><i class="bi bi-send-fill"></i></button>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        // Añadimos el listener del formulario solo una vez
        setupChatFormListener();
        // Configurar eventos del modal
        setupModalEvents();
    }
    
    const chatModal = new bootstrap.Modal(document.getElementById('chatModal'));
    const messagesContainer = document.getElementById('chat-messages-container');
    
    messagesContainer.innerHTML = '<p class="text-center text-muted">Cargando mensajes...</p>';
    chatModal.show();

    try {
        // Cargar mensajes iniciales
        await loadInitialMessages(conversationId);
        // Iniciar polling para nuevos mensajes
        startChatPolling(conversationId);
    } catch (error) {
        messagesContainer.innerHTML = `<p class="text-center text-danger">${error.message}</p>`;
    }
}

// Función para mostrar los mensajes en el contenedor
function renderMessages(messages) {
    const messagesContainer = document.getElementById('chat-messages-container');
    if (messages.length === 0) {
        messagesContainer.innerHTML = '<p class="text-center text-muted">Aún no hay mensajes. ¡Inicia la conversación!</p>';
        return;
    }

    messagesContainer.innerHTML = ''; // Limpiamos el contenedor
    const token = localStorage.getItem('token');
    if (!token) return;
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentUserId = payload.user.id;

    messages.forEach(msg => {
        appendMessage(msg, currentUserId);
    });
}

// Función para AÑADIR un mensaje a la vista
function appendMessage(msg, currentUserId) {
    const messagesContainer = document.getElementById('chat-messages-container');
    const isSender = msg.sender_id === currentUserId;
    const messageElement = document.createElement('div');
    messageElement.className = `chat-bubble ${isSender ? 'sent' : 'received'}`;
    messageElement.dataset.messageId = msg.id_message; // Agregar ID para tracking
    messageElement.innerHTML = `
        <div class="message-content">${msg.content}</div>
        <div class="message-time">${new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    messagesContainer.prepend(messageElement);
}

// Función para manejar el envío de mensajes
function setupChatFormListener() {
    const chatForm = document.getElementById('chat-send-form');
    const messageInput = document.getElementById('chat-message-input');
    
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = messageInput.value.trim();
        if (!content || !currentConversationId) return;

        const originalButtonHtml = e.target.querySelector('button').innerHTML;
        e.target.querySelector('button').disabled = true;

        try {
            const newMessage = await sendMessage(currentConversationId, content);
            const token = localStorage.getItem('token');
            const payload = JSON.parse(atob(token.split('.')[1]));
            appendMessage(newMessage, payload.user.id);
            
            // NO actualizar lastMessageId aquí para permitir que el polling 
            // detecte tanto nuestro mensaje como cualquier mensaje nuevo del otro usuario
            messageInput.value = '';
            
            // Forzar una verificación inmediata de mensajes nuevos
            setTimeout(() => {
                if (currentConversationId) {
                    checkForNewMessages(currentConversationId);
                }
            }, 1000); // Verificar después de 1 segundo
            
        } catch (error) {
            await showAlert(`Error al enviar mensaje: ${error.message}`, 'error');
        } finally {
            e.target.querySelector('button').disabled = false;
            e.target.querySelector('button').innerHTML = originalButtonHtml;
        }
    });
}

// ===================================================================
// FUNCIONES DE POLLING PARA MENSAJES EN TIEMPO REAL
// ===================================================================

// Función para cargar mensajes iniciales
async function loadInitialMessages(conversationId) {
    const messages = await getMessages(conversationId);
    renderMessages(messages);
    // Guardar el ID del último mensaje
    if (messages.length > 0) {
        lastMessageId = messages[messages.length - 1].id_message;
    }
}

// Función para iniciar el polling de nuevos mensajes
function startChatPolling(conversationId) {
    // Limpiar cualquier polling anterior
    stopChatPolling();
    
    console.log('🔄 Iniciando polling de chat cada 5 segundos...');
    
    chatPollingInterval = setInterval(async () => {
        try {
            await checkForNewMessages(conversationId);
        } catch (error) {
            console.error('Error al verificar nuevos mensajes:', error);
        }
    }, 1000); // Cada 1 segundos
}

// Función para detener el polling
function stopChatPolling() {
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
        console.log('⏹️ Polling de chat detenido');
    }
}

// Función para verificar y cargar solo mensajes nuevos
async function checkForNewMessages(conversationId) {
    try {
        const allMessages = await getMessages(conversationId);
        
        // Si no hay mensajes o no tenemos referencia del último
        if (!allMessages.length || !lastMessageId) {
            return;
        }
        
        // Obtener todos los IDs de mensajes que ya están en el DOM para evitar duplicados
        const existingMessageIds = Array.from(document.querySelectorAll('.chat-bubble')).map(bubble => {
            return bubble.dataset.messageId;
        }).filter(id => id); // Filtrar IDs válidos
        
        // Encontrar mensajes nuevos (posteriores al último que tenemos)
        const lastMessageIndex = allMessages.findIndex(msg => msg.id_message === lastMessageId);
        
        if (lastMessageIndex === -1) {
            // El último mensaje que teníamos ya no existe, recargar todo
            console.log('🔄 Recargando todos los mensajes...');
            renderMessages(allMessages);
            lastMessageId = allMessages.length > 0 ? allMessages[allMessages.length - 1].id_message : null;
            return;
        }
        
        // Obtener mensajes nuevos y filtrar los que ya están en el DOM
        const newMessages = allMessages.slice(lastMessageIndex + 1).filter(msg => {
            return !existingMessageIds.includes(msg.id_message.toString());
        });
        
        if (newMessages.length > 0) {
            console.log(`📨 ${newMessages.length} nuevo(s) mensaje(s) recibido(s)`);
            
            const token = localStorage.getItem('token');
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentUserId = payload.user.id;
            
            // Agregar solo los mensajes nuevos
            newMessages.forEach(msg => {
                appendMessage(msg, currentUserId);
            });
            
            // Actualizar el último ID de mensaje al más reciente de todos los mensajes
            lastMessageId = allMessages[allMessages.length - 1].id_message;
        }
    } catch (error) {
        console.error('Error al verificar nuevos mensajes:', error);
    }
}

// Función para configurar eventos del modal
function setupModalEvents() {
    const chatModal = document.getElementById('chatModal');
    
    // Detener polling cuando se cierre el modal
    chatModal.addEventListener('hidden.bs.modal', () => {
        stopChatPolling();
        currentConversationId = null;
        lastMessageId = null;
        console.log('💬 Chat cerrado, polling detenido');
    });
}