# Personal Finance Manager

A real-time personal finance management system built with NunDB, featuring hierarchical accounts, real-time balance updates, and comprehensive transaction management.

## Features

- **Hierarchical Account Structure**: Parent-child account relationships with automatic balance propagation
- **Real-time Transaction Management**: CRUD operations with instant synchronization across clients
- **Live Balance Updates**: Automatic balance calculations that propagate through account hierarchies
- **Multi-user Support**: Real-time collaboration with user session management
- **Comprehensive Testing**: End-to-end Playwright tests for all scenarios

## Technical Architecture

- **Backend**: Node.js with Express.js REST API
- **Database**: NunDB for real-time data synchronization
- **Frontend**: Vanilla JavaScript with ES modules
- **Testing**: Playwright for end-to-end testing
- **Real-time**: WebSocket connections for instant updates

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** to `http://localhost:3000`

4. **Run tests**:
   ```bash
   npm test
   ```

## API Endpoints

### Accounts
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create new account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

### Transactions
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Real-time Events
- Account balance updates
- New transaction notifications
- Account hierarchy changes

## Account Structure

```javascript
{
  id: "account_123",
  name: "Checking Account",
  type: "asset", // asset, liability, income, expense
  parentId: null, // or parent account ID
  balance: 1500.00,
  currency: "USD",
  userId: "user_456",
  created: 1703097600000,
  updated: 1703097600000
}
```

## Transaction Structure

```javascript
{
  id: "txn_789",
  description: "Grocery shopping",
  amount: -85.50,
  fromAccountId: "account_123",
  toAccountId: "account_456",
  category: "groceries",
  date: 1703097600000,
  userId: "user_456",
  created: 1703097600000
}
```