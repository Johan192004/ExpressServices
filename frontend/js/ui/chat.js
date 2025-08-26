
import { getMessages, sendMessage } from '../api/authService.js';

let currentConversationId = null;

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
    }
    
    const chatModal = new bootstrap.Modal(document.getElementById('chatModal'));
    const messagesContainer = document.getElementById('chat-messages-container');
    
    messagesContainer.innerHTML = '<p class="text-center text-muted">Cargando mensajes...</p>';
    chatModal.show();

    try {
        const messages = await getMessages(conversationId);
        renderMessages(messages);
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
            messageInput.value = '';
        } catch (error) {
            alert(`Error al enviar mensaje: ${error.message}`);
        } finally {
            e.target.querySelector('button').disabled = false;
            e.target.querySelector('button').innerHTML = originalButtonHtml;
        }
    });
}