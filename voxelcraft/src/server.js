const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Start server
app.listen(PORT, () => {
    console.log(`VoxelCraft server running at http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
});