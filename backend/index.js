// index.js
const express = require('express');
const app = express();
const PORT = 3000;

// Middleware to parse JSON in requests
app.use(express.json());

// In-memory debts array
const debts = [];

// In-memory people array
const people = [];

// Get all debts
app.get('/debts', (req, res) => {
    res.json(debts);
});

// Add a new debt
app.post('/debts', (req, res) => {
    const { person, amount, reason, owedBySelf } = req.body;

    if (!person || typeof amount !== 'number') {
        return res.status(400).json({ error: 'Missing or invalid person or amount' });
    }

    const newDebt = {
        id: debts.length + 1,
        person,
        amount,
        reason: reason || '',
        owedBySelf: typeof owedBySelf === 'boolean' ? owedBySelf : true,
        paid: false,
        createdAt: new Date().toISOString()
    };

    debts.push(newDebt);
    res.status(201).json(newDebt);
});

// Mark debt as paid
app.patch('/debts/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const index = debts.findIndex(d => d.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Debt not found' });
    }

    const { paid } = req.body;
    if (typeof paid !== 'boolean') {
        return res.status(400).json({ error: 'Invalid paid value' });
    }

    debts[index].paid = paid;
    res.json(debts[index]);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});

// Get all people
app.get('/people', (req, res) => {
    res.json(people);
});

// Add a new person
app.post('/people', (req, res) => {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing name' });
    }

    const newPerson = {
        id: people.length + 1,
        name,
        createdAt: new Date().toISOString(),
    };

    people.push(newPerson);
    res.status(201).json(newPerson);
});