//import { createRequire } from "module";
//const require = createRequire(import.meta.url);

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const db = new sqlite3.Database(':memory:');

// Create users table
db.serialize(() => {
    db.run(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// Registration endpoint
app.post('/register', async (req, res) => {
    try {
        const name = req.body["registerName"];
        const email = req.body["registerEmail"];
        const password = req.body["registerPassword"];
        
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required!' });
        }
        
        // Check if user already exists
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (row) {
                return res.status(400).json({ error: 'User already exists' });
            }
            
            // Hash password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            // Insert new user
            db.run(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                [name, email, hashedPassword],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to create user' });
                    }
                    
                    res.status(201).json({ message: 'User created successfully' });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login endpoint
app.post('/login', (req, res) => {
    try {
        const email = req.body["loginEmail"];
        const password = req.body["loginPassword"];
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user by email
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!row) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Compare passwords
            const isMatch = await bcrypt.compare(password, row.password);
            
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Successful login
            res.json({ 
                message: 'Login successful',
                user: {
                    id: row.id,
                    name: row.name,
                    email: row.email
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

//////////// ------ CODE FOR BANKING WEBPAGE

// Simulated database
let users = [
  { id: 1, email: "placeholder@gmail.com", name: 'John Doe', balance: 5247.85, cardNumber: '4517843256913278', expiry: '09/25', cvv: '327' }
];

let transactions = [
  { id: 1, userId: 1, description: 'Amazon Purchase', amount: -128.50, date: '2023-08-15' },
  { id: 2, userId: 1, description: 'Deposit', amount: 1200.00, date: '2023-08-12' },
  { id: 3, userId: 1, description: 'Restaurant Payment', amount: -67.80, date: '2023-08-10' }
];

//export { transactions }; // TODO: THIS IS PROBABLY UNSAFE!! VERIFY
module.exports = { transactions }; // TODO: THIS IS PROBABLY UNSAFE!! VERIFY

// Routes
app.get('/api/user/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.get('/api/transactions/:userId', (req, res) => {
  const userTransactions = transactions.filter(t => t.userId === parseInt(req.params.userId));
  res.json(userTransactions);
});

app.post('/deposit', (req, res) => {
    console.log("In deposit");
    const userId = req.body["id"];
    const amount = parseInt(req.body["amount"]);
    const method = req.body["method"];

    const user = users.find(u => u.id === parseInt(userId));
    
    if (!user) return res.status(400).json({ error: 'User not found' });
    console.log("Deposited money. Old balance was:", user.balance);
    user.balance += amount;
    console.log("New user balance is:", user.balance);
    transactions.push({
        id: transactions.length + 1,
        userId,
        description: 'Deposit',
        amount,
        date: new Date().toISOString().split('T')[0]
    });
    
    res.json({ success: true, newBalance: user.balance });
});

app.post('/api/validate-purchase', (req, res) => {
  const { userId, merchant, amount } = req.body;
  const user = users.find(u => u.id === parseInt(userId));
  
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Simulate validation logic
  const isValid = Math.random() > 0.3;
  const reason = !isValid ? (Math.random() > 0.15 ? 'Suspicious activity detected' : 'Insufficient funds') : '';
  
  if (isValid) {
    user.balance -= amount;
    transactions.push({
      id: transactions.length + 1,
      userId,
      description: `Purchase at ${merchant}`,
      amount: -amount,
      date: new Date().toISOString().split('T')[0]
    });
  }
  
  res.json({ isValid, reason, newBalance: user.balance });
});

// Serve the HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});