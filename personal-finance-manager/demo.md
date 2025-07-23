# Personal Finance Manager Demo

This demo showcases a complete real-time personal finance management system built with NunDB.

## Features Demonstrated

✅ **Hierarchical Account Management**
- Asset accounts (checking, savings, investments)
- Liability accounts (credit cards, loans)
- Parent-child account relationships
- Real-time balance propagation

✅ **Transaction Management**
- Income and expense tracking
- Account-to-account transfers
- Category-based organization
- Real-time balance updates

✅ **Financial Analysis**
- Net worth calculation
- Monthly income/expense tracking
- Cash flow analysis
- Spending by category

✅ **Real-time Synchronization**
- WebSocket-based updates
- Multi-user support
- Instant balance propagation
- Live transaction feeds

✅ **Comprehensive Testing**
- 4 complete test suites
- 50+ individual test cases
- Account management tests
- Transaction management tests
- Financial analysis tests
- End-to-end integration tests

## Architecture

### Backend (Node.js + Express)
- **Database Layer**: `src/database.js` - NunDB connection and mock support
- **Account Management**: `src/accounts.js` - Hierarchical account operations
- **Transaction Management**: `src/transactions.js` - CRUD operations with balance updates
- **Main Application**: `src/app.js` - Core finance manager class
- **REST API**: `src/server.js` - Express server with comprehensive endpoints

### Frontend (Vanilla JavaScript)
- **Client Application**: `public/app.js` - Real-time UI with NunDB integration
- **Responsive Design**: `public/styles.css` - Mobile-first CSS design
- **HTML Interface**: `public/index.html` - Complete dashboard interface

### Testing (Playwright)
- **Test Helper**: `tests/functional/helpers/test-helper.js` - Comprehensive test utilities
- **Account Tests**: `tests/functional/account-management.spec.js` - 15+ account tests
- **Transaction Tests**: `tests/functional/transaction-management.spec.js` - 20+ transaction tests
- **Analysis Tests**: `tests/functional/financial-analysis.spec.js` - 10+ analysis tests
- **Integration Tests**: `tests/functional/integration.spec.js` - 15+ end-to-end tests

## Technical Highlights

### Real-time Data Synchronization
```javascript
// Automatic balance propagation through account hierarchy
async updateBalance(accountId, amount) {
    const account = await this.getAccount(accountId);
    const newBalance = account.balance + amount;
    await this.updateAccount(accountId, { balance: newBalance });
    
    // Propagate to parent accounts
    if (account.parentId) {
        await this._propagateBalanceChange(account.parentId, amount);
    }
}
```

### Hierarchical Account Structure
```javascript
// Get account hierarchy with parent-child relationships
async getAccountHierarchy() {
    const allAccounts = await this.getAllAccounts();
    const rootAccounts = [];
    
    const addChildren = (account) => {
        const children = allAccounts.filter(acc => acc.parentId === account.id);
        account.children = children.map(child => {
            return addChildren({ ...child });
        });
        return account;
    };
    
    return allAccounts.filter(acc => !acc.parentId).map(addChildren);
}
```

### Transaction Processing with Balance Updates
```javascript
// Atomic transaction creation with balance updates
async createTransaction(transactionData) {
    const transaction = { /* transaction object */ };
    
    // Store transaction
    await this.db.set(`transaction:${transaction.id}`, transaction);
    
    // Update account balances atomically
    await this._updateAccountBalances(transaction);
    
    // Broadcast real-time update
    await this._broadcastTransactionUpdate('created', transaction);
}
```

### Mock Database for Testing
```javascript
// Complete mock implementation for reliable testing
initMockConnection() {
    this.nundb = {
        _mockStorage: new Map(),
        _mockWatchers: new Map(),
        
        async get(key, subKey = null) {
            const fullKey = subKey ? `${key}:${subKey}` : key;
            return this._mockStorage.get(fullKey);
        },
        
        async set(key, subKeyOrValue, valueOrUndefined) {
            // Store data and trigger watchers
            this._mockStorage.set(fullKey, value);
            this._triggerWatchers(key, value);
        }
    };
}
```

## API Endpoints

### Account Management
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account
- `GET /api/accounts/hierarchy` - Get hierarchical structure
- `GET /api/accounts/:id/total-balance` - Calculate total balance including children

### Transaction Management
- `GET /api/transactions` - List transactions with filtering
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/accounts/:id/transactions` - Get account transactions

### Financial Analysis
- `GET /api/analysis/summary` - Complete financial summary
- `GET /api/analysis/spending-by-category` - Spending breakdown
- `GET /api/analysis/cash-flow` - Daily cash flow analysis
- `GET /api/accounts/:id/balance-history` - Account balance history

## Test Coverage

### Account Management Tests (15+ tests)
- Basic account creation (asset, liability, income, expense)
- Hierarchical account structures
- Account validation and error handling
- Financial summary integration
- Real-time update propagation

### Transaction Management Tests (20+ tests)
- Income and expense transactions
- Account-to-account transfers
- Balance update verification
- Transaction filtering and sorting
- Concurrent transaction handling

### Financial Analysis Tests (10+ tests)
- Net worth calculations
- Monthly income/expense tracking
- Multi-currency support
- Large dataset handling
- UI visual indicators

### Integration Tests (15+ tests)
- Complete user workflows
- Data consistency across page refreshes
- Error recovery and resilience
- Mobile responsiveness
- Multi-user scenarios

## Key Innovations

1. **Hierarchical Balance Propagation**: Changes in child accounts automatically propagate to parent accounts in real-time

2. **Mock Database Integration**: Complete NunDB mock implementation allows reliable testing without external dependencies

3. **Atomic Transaction Processing**: All transaction operations are atomic, ensuring data consistency even with concurrent operations

4. **Real-time Financial Analysis**: Financial summaries update immediately as transactions and accounts change

5. **Comprehensive Error Handling**: Graceful degradation and recovery from network issues and validation errors

6. **Mobile-First Design**: Responsive UI that works seamlessly across desktop, tablet, and mobile devices

## Usage Examples

### Creating Account Hierarchy
```javascript
// Create parent account
const assets = await financeManager.createAccount({
    name: 'Assets',
    type: 'asset',
    balance: 0
});

// Create child accounts
const checking = await financeManager.createAccount({
    name: 'Checking Account',
    type: 'asset',
    parentId: assets.id,
    balance: 2000
});
```

### Processing Transactions
```javascript
// Create expense transaction
const transaction = await financeManager.createTransaction({
    description: 'Grocery Shopping',
    amount: -85.50,
    fromAccountId: checking.id,
    category: 'groceries'
});

// Create transfer between accounts
const transfer = await financeManager.createTransaction({
    description: 'Transfer to Savings',
    amount: -500,
    fromAccountId: checking.id,
    toAccountId: savings.id,
    category: 'transfer'
});
```

### Financial Analysis
```javascript
// Get comprehensive financial summary
const summary = await financeManager.getFinancialSummary();
console.log(`Net Worth: ${summary.netWorth}`);
console.log(`Monthly Savings: ${summary.monthlySavings}`);

// Analyze spending patterns
const spending = await financeManager.getSpendingByCategory();
spending.forEach(category => {
    console.log(`${category.category}: $${category.amount}`);
});
```

This personal finance manager demonstrates the power of NunDB for building real-time, collaborative financial applications with hierarchical data structures and comprehensive testing coverage.