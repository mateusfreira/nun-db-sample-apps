import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(join(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Catch all route - serve index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`FPS Arena server running on http://localhost:${PORT}`);
});