class ChatManager {
    constructor(networkManager) {
        this.networkManager = networkManager;
        this.messagesElement = document.getElementById('chatMessages');
        this.inputElement = document.getElementById('chatInput');
        this.isOpen = false;
        
        this.init();
    }

    init() {
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }
        });

        this.inputElement.addEventListener('blur', () => {
            this.close();
        });

        // Set up network callback
        this.networkManager.onChatMessage = (message) => {
            this.addMessage(message);
        };
    }

    open() {
        this.isOpen = true;
        this.inputElement.disabled = false;
        this.inputElement.focus();
    }

    close() {
        this.isOpen = false;
        this.inputElement.disabled = true;
        this.inputElement.value = '';
        this.inputElement.blur();
        
        // Return focus to game
        if (document.pointerLockElement) {
            document.exitPointerLock();
            setTimeout(() => {
                document.getElementById('game').click();
            }, 100);
        }
    }

    sendMessage() {
        const text = this.inputElement.value.trim();
        if (!text) return;

        this.networkManager.sendChatMessage({
            type: 'player',
            username: this.networkManager.username,
            message: text,
            timestamp: Date.now()
        });

        this.inputElement.value = '';
    }

    addMessage(messageData) {
        const messageElement = document.createElement('p');
        
        if (messageData.type === 'system') {
            messageElement.className = 'system';
            messageElement.textContent = messageData.message;
        } else {
            const usernameSpan = document.createElement('span');
            usernameSpan.className = 'player-name';
            usernameSpan.textContent = messageData.username + ': ';
            
            messageElement.appendChild(usernameSpan);
            messageElement.appendChild(document.createTextNode(messageData.message));
        }
        
        this.messagesElement.appendChild(messageElement);
        
        // Auto-scroll to bottom
        this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
        
        // Limit message history
        while (this.messagesElement.children.length > 50) {
            this.messagesElement.removeChild(this.messagesElement.firstChild);
        }
    }

    addSystemMessage(message) {
        this.addMessage({
            type: 'system',
            message: message,
            timestamp: Date.now()
        });
    }
}