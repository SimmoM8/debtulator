// index.js
const express = require('express');
const app = express();
const PORT = 3000;

// Middleware to parse JSON in requests
app.use(express.json());

// Test route
app.get('/', (req, res) => {
    res.send('Debtulator backend is running ✅');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});