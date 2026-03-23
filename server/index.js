const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = 'kodbank_secret'; // In production, use environment variable

app.use(cors());
app.use(bodyParser.json());

const DB_PATH = path.join(__dirname, 'db.json');

// Helper to read DB
const readDB = () => {
    const data = fs.readFileSync(DB_PATH);
    return JSON.parse(data);
};

// Helper to write DB
const writeDB = (data) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// --- Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access Denied' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid Token' });
        req.user = user;
        next();
    });
};

// --- Routes ---

// Register
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    const db = readDB();

    if (db.find(u => u.email === email)) {
        return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: db.length + 1,
        name,
        email,
        password: hashedPassword,
        balance: 2000
    };

    db.push(newUser);
    writeDB(db);

    res.status(201).json({ message: 'User registered successfully' });
});

// Login (Updated: Auto-registers if user doesn't exist)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const db = readDB();

    const user = db.find(u => u.email === email);

    if (!user) {
        return res.status(400).json({ message: 'User not found. Please register first.' });
    }

    // Use bcrypt compare for all logins
    const isMatched = await bcrypt.compare(password, user.password);

    // Fallback for demo users with plain text passwords (if any left)
    const isPlainMatched = user.password === password;

    if (!isMatched && !isPlainMatched) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// Get Balance
app.get('/api/balance', authenticateToken, (req, res) => {
    const db = readDB();
    const user = db.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ balance: user.balance });
});

// Transfer Money
app.post('/api/transfer', authenticateToken, (req, res) => {
    const { receiverEmail, amount } = req.body;
    const transferAmount = parseFloat(amount);

    if (isNaN(transferAmount) || transferAmount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
    }

    const db = readDB();
    const sender = db.find(u => u.id === req.user.id);
    const receiver = db.find(u => u.email === receiverEmail);

    if (!receiver) {
        return res.status(404).json({ message: 'Receiver not found' });
    }

    if (sender.email === receiverEmail) {
        return res.status(400).json({ message: 'Cannot transfer to yourself' });
    }

    if (sender.balance - transferAmount < 2000) {
        return res.status(400).json({ message: 'Insufficient balance: Minimum balance of ₹2,000 must be maintained' });
    }

    // Perform transfer
    sender.balance -= transferAmount;
    receiver.balance += transferAmount;

    writeDB(db);

    res.json({ message: 'Transfer successful', newBalance: sender.balance });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
