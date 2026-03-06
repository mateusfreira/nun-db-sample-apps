let game = null;

document.addEventListener('DOMContentLoaded', () => {
    const menuElement = document.getElementById('menu');
    const gameElement = document.getElementById('game');
    const usernameInput = document.getElementById('username');
    const roomIdInput = document.getElementById('roomId');
    const playButton = document.getElementById('playBtn');
    
    // Generate default room ID
    roomIdInput.value = 'room_' + Math.random().toString(36).substr(2, 6);
    
    // Focus username input
    usernameInput.focus();
    
    // Play button click handler
    playButton.addEventListener('click', startGame);
    
    // Enter key handler
    usernameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') startGame();
    });
    
    roomIdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') startGame();
    });
    
    async function startGame() {
        const username = usernameInput.value.trim();
        const roomId = roomIdInput.value.trim() || 'default';
        
        if (!username) {
            alert('Please enter a username');
            usernameInput.focus();
            return;
        }
        
        try {
            console.log('Starting game...');
            
            // Check if required libraries are loaded
            if (typeof THREE === 'undefined') {
                throw new Error('Three.js library not loaded');
            }
            
            if (typeof Game === 'undefined') {
                throw new Error('Game class not loaded');
            }
            
            // Hide menu, show game
            menuElement.style.display = 'none';
            gameElement.style.display = 'block';
            
            // Create and start game
            console.log('Creating game instance...');
            game = new Game();
            
            console.log('Initializing game...');
            await game.init(username, roomId);
            
            console.log('Game started successfully!');
        } catch (error) {
            console.error('Failed to start game:', error);
            alert('Failed to start game: ' + error.message);
            
            // Show menu again
            menuElement.style.display = 'block';
            gameElement.style.display = 'none';
        }
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (game && game.isRunning) {
        if (document.hidden) {
            // Pause updates when tab is hidden
            game.isRunning = false;
        } else {
            // Resume when tab is visible
            game.isRunning = true;
            game.lastTime = performance.now();
            game.animate();
        }
    }
});