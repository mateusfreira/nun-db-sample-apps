import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PersonalFinanceManager } from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Store user sessions
const userSessions = new Map();

/**
 * Async middleware wrapper
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}

/**
 * Get or create finance manager for user
 */
async function getFinanceManager(userId, config = {}) {
    const sessionKey = `${userId}_${config.mockMode ? 'mock' : 'real'}`;
    
    if (!userSessions.has(sessionKey)) {
        const manager = new PersonalFinanceManager({
            userId,
            ...config
        });
        
        // Initialize synchronously and wait for it
        await manager.initialize();
        userSessions.set(sessionKey, manager);
    }
    return userSessions.get(sessionKey);
}

/**
 * Middleware to extract user ID and get finance manager
 */
async function requireUser(req, res, next) {
    const userId = req.headers['x-user-id'] || req.query.userId;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID required in headers or query params' });
    }

    try {
        req.userId = userId;
        req.financeManager = await getFinanceManager(userId, {
            mockMode: req.query.mock === 'true'
        });
        
        next();
    } catch (error) {
        handleError(res, error, 'Failed to initialize finance manager');
    }
}

/**
 * Error handler
 */
function handleError(res, error, defaultMessage = 'Internal server error') {
    console.error(error);
    res.status(500).json({ 
        error: error.message || defaultMessage,
        timestamp: new Date().toISOString()
    });
}

// Routes

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        activeSessions: userSessions.size
    });
});

/**
 * Connection status
 */
app.get('/api/status', asyncHandler(requireUser), async (req, res) => {
    try {
        const status = req.financeManager.getConnectionStatus();
        res.json(status);
    } catch (error) {
        handleError(res, error, 'Failed to get connection status');
    }
});

/**
 * Account Routes
 */

// Get all accounts
app.get('/api/accounts', asyncHandler(requireUser), async (req, res) => {
    try {
        const accounts = await req.financeManager.getAllAccounts();
        res.json(accounts);
    } catch (error) {
        handleError(res, error, 'Failed to get accounts');
    }
});

// Get account hierarchy
app.get('/api/accounts/hierarchy', asyncHandler(requireUser), async (req, res) => {
    try {
        const hierarchy = await req.financeManager.getAccountHierarchy();
        res.json(hierarchy);
    } catch (error) {
        handleError(res, error, 'Failed to get account hierarchy');
    }
});

// Get specific account
app.get('/api/accounts/:id', asyncHandler(requireUser), async (req, res) => {
    try {
        const account = await req.financeManager.getAccount(req.params.id);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }
        res.json(account);
    } catch (error) {
        handleError(res, error, 'Failed to get account');
    }
});

// Create account
app.post('/api/accounts', asyncHandler(requireUser), async (req, res) => {
    try {
        const account = await req.financeManager.createAccount(req.body);
        res.status(201).json(account);
    } catch (error) {
        handleError(res, error, 'Failed to create account');
    }
});

// Update account
app.put('/api/accounts/:id', asyncHandler(requireUser), async (req, res) => {
    try {
        const account = await req.financeManager.updateAccount(req.params.id, req.body);
        res.json(account);
    } catch (error) {
        handleError(res, error, 'Failed to update account');
    }
});

// Delete account
app.delete('/api/accounts/:id', asyncHandler(requireUser), async (req, res) => {
    try {
        await req.financeManager.deleteAccount(req.params.id);
        res.status(204).send();
    } catch (error) {
        handleError(res, error, 'Failed to delete account');
    }
});

// Get account total balance (including children)
app.get('/api/accounts/:id/total-balance', asyncHandler(requireUser), async (req, res) => {
    try {
        const totalBalance = await req.financeManager.calculateTotalBalance(req.params.id);
        res.json({ accountId: req.params.id, totalBalance });
    } catch (error) {
        handleError(res, error, 'Failed to calculate total balance');
    }
});

/**
 * Transaction Routes
 */

// Get all transactions
app.get('/api/transactions', asyncHandler(requireUser), async (req, res) => {
    try {
        const options = {
            accountId: req.query.accountId,
            category: req.query.category,
            startDate: req.query.startDate ? parseInt(req.query.startDate) : undefined,
            endDate: req.query.endDate ? parseInt(req.query.endDate) : undefined,
            minAmount: req.query.minAmount ? parseFloat(req.query.minAmount) : undefined,
            maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount) : undefined,
            sortBy: req.query.sortBy || 'date',
            sortOrder: req.query.sortOrder || 'desc',
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset) : undefined
        };

        const transactions = await req.financeManager.getAllTransactions(options);
        res.json(transactions);
    } catch (error) {
        handleError(res, error, 'Failed to get transactions');
    }
});

// Get transactions for specific account
app.get('/api/accounts/:id/transactions', asyncHandler(requireUser), async (req, res) => {
    try {
        const options = {
            sortBy: req.query.sortBy || 'date',
            sortOrder: req.query.sortOrder || 'desc'
        };

        const transactions = await req.financeManager.getTransactionsForAccount(req.params.id, options);
        res.json(transactions);
    } catch (error) {
        handleError(res, error, 'Failed to get account transactions');
    }
});

// Get specific transaction
app.get('/api/transactions/:id', asyncHandler(requireUser), async (req, res) => {
    try {
        const transaction = await req.financeManager.getTransaction(req.params.id);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json(transaction);
    } catch (error) {
        handleError(res, error, 'Failed to get transaction');
    }
});

// Create transaction
app.post('/api/transactions', asyncHandler(requireUser), async (req, res) => {
    try {
        const transaction = await req.financeManager.createTransaction(req.body);
        res.status(201).json(transaction);
    } catch (error) {
        handleError(res, error, 'Failed to create transaction');
    }
});

// Update transaction
app.put('/api/transactions/:id', asyncHandler(requireUser), async (req, res) => {
    try {
        const transaction = await req.financeManager.updateTransaction(req.params.id, req.body);
        res.json(transaction);
    } catch (error) {
        handleError(res, error, 'Failed to update transaction');
    }
});

// Delete transaction
app.delete('/api/transactions/:id', asyncHandler(requireUser), async (req, res) => {
    try {
        await req.financeManager.deleteTransaction(req.params.id);
        res.status(204).send();
    } catch (error) {
        handleError(res, error, 'Failed to delete transaction');
    }
});

/**
 * Analysis Routes
 */

// Get financial summary
app.get('/api/analysis/summary', asyncHandler(requireUser), async (req, res) => {
    try {
        const summary = await req.financeManager.getFinancialSummary();
        res.json(summary);
    } catch (error) {
        handleError(res, error, 'Failed to get financial summary');
    }
});

// Get spending by category
app.get('/api/analysis/spending-by-category', asyncHandler(requireUser), async (req, res) => {
    try {
        const options = {
            startDate: req.query.startDate ? parseInt(req.query.startDate) : undefined,
            endDate: req.query.endDate ? parseInt(req.query.endDate) : undefined
        };

        const spending = await req.financeManager.getSpendingByCategory(options);
        res.json(spending);
    } catch (error) {
        handleError(res, error, 'Failed to get spending by category');
    }
});

// Get cash flow analysis
app.get('/api/analysis/cash-flow', asyncHandler(requireUser), async (req, res) => {
    try {
        const periodDays = req.query.days ? parseInt(req.query.days) : 30;
        const cashFlow = await req.financeManager.getCashFlowAnalysis(periodDays);
        res.json(cashFlow);
    } catch (error) {
        handleError(res, error, 'Failed to get cash flow analysis');
    }
});

// Get balance history for account
app.get('/api/accounts/:id/balance-history', asyncHandler(requireUser), async (req, res) => {
    try {
        const options = {
            startDate: req.query.startDate ? parseInt(req.query.startDate) : undefined,
            endDate: req.query.endDate ? parseInt(req.query.endDate) : undefined
        };

        const history = await req.financeManager.getBalanceHistory(req.params.id, options);
        res.json(history);
    } catch (error) {
        handleError(res, error, 'Failed to get balance history');
    }
});

/**
 * Utility Routes
 */

// Reset user data (for testing)
app.post('/api/reset', asyncHandler(requireUser), async (req, res) => {
    try {
        await req.financeManager.reset();
        userSessions.delete(req.userId);
        res.json({ message: 'User data reset successfully' });
    } catch (error) {
        handleError(res, error, 'Failed to reset user data');
    }
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Personal Finance Manager server running on port ${port}`);
    console.log(`Open http://localhost:${port} to access the application`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down server...');
    
    // Disconnect all user sessions
    for (const [userId, manager] of userSessions) {
        try {
            await manager.disconnect();
        } catch (error) {
            console.error(`Error disconnecting user ${userId}:`, error);
        }
    }
    
    process.exit(0);
});

export default app;