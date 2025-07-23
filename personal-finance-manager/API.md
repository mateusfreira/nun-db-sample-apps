# Personal Finance Manager API Documentation

A comprehensive REST API for managing personal finances with real-time synchronization powered by NunDB.

## Base URL
```
http://localhost:3000/api
```

## Authentication
All API endpoints require a `userId` parameter either in the request headers (`X-User-ID`) or as a query parameter.

```bash
# Header method (recommended)
curl -H "X-User-ID: your-user-id" http://localhost:3000/api/accounts

# Query parameter method
curl http://localhost:3000/api/accounts?userId=your-user-id
```

## Response Format

### Success Response
```json
{
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "error": "Error message description",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Data Models

### Account Model
```json
{
  "id": "account_1703097600000_abc123",
  "name": "Checking Account",
  "type": "asset",
  "parentId": null,
  "balance": 1500.00,
  "currency": "USD",
  "userId": "user_1703097600000_def456",
  "created": 1703097600000,
  "updated": 1703097600000,
  "metadata": {}
}
```

**Account Types:**
- `asset` - Assets (checking, savings, investments)
- `liability` - Liabilities (credit cards, loans)
- `income` - Income categories
- `expense` - Expense categories

### Transaction Model
```json
{
  "id": "txn_1703097600000_xyz789",
  "description": "Grocery shopping",
  "amount": -85.50,
  "fromAccountId": "account_1703097600000_abc123",
  "toAccountId": "account_1703097600000_def456",
  "category": "groceries",
  "date": 1703097600000,
  "userId": "user_1703097600000_def456",
  "created": 1703097600000,
  "updated": 1703097600000,
  "metadata": {}
}
```

## API Endpoints

### Health & Status

#### GET /health
Get service health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "activeSessions": 5
}
```

#### GET /api/status
Get user connection status.

**Response:**
```json
{
  "isConnected": true,
  "userId": "user_1703097600000_def456",
  "database": {
    "isConnected": true,
    "isMock": false,
    "config": {
      "url": "wss://ws-staging.nundb.org/",
      "db": "personal-finance-demo",
      "user": "user_1703097600000_def456"
    }
  }
}
```

### Account Management

#### GET /api/accounts
Get all accounts for the user.

**Response:**
```json
[
  {
    "id": "account_1703097600000_abc123",
    "name": "Checking Account",
    "type": "asset",
    "parentId": null,
    "balance": 1500.00,
    "currency": "USD",
    "userId": "user_1703097600000_def456",
    "created": 1703097600000,
    "updated": 1703097600000,
    "metadata": {}
  }
]
```

#### GET /api/accounts/hierarchy
Get accounts organized in hierarchical structure.

**Response:**
```json
[
  {
    "id": "account_parent",
    "name": "Bank Accounts",
    "type": "asset",
    "balance": 0,
    "children": [
      {
        "id": "account_child1",
        "name": "Checking",
        "type": "asset",
        "balance": 1500,
        "children": []
      },
      {
        "id": "account_child2",
        "name": "Savings",
        "type": "asset",
        "balance": 5000,
        "children": []
      }
    ]
  }
]
```

#### GET /api/accounts/:id
Get specific account by ID.

**Response:**
```json
{
  "id": "account_1703097600000_abc123",
  "name": "Checking Account",
  "type": "asset",
  "parentId": null,
  "balance": 1500.00,
  "currency": "USD",
  "userId": "user_1703097600000_def456",
  "created": 1703097600000,
  "updated": 1703097600000,
  "metadata": {}
}
```

#### POST /api/accounts
Create a new account.

**Request Body:**
```json
{
  "name": "Savings Account",
  "type": "asset",
  "parentId": null,
  "balance": 5000.00,
  "currency": "USD",
  "metadata": {
    "bank": "Example Bank",
    "accountNumber": "****1234"
  }
}
```

**Response:** Account object (201 Created)

#### PUT /api/accounts/:id
Update an existing account.

**Request Body:**
```json
{
  "name": "Updated Account Name",
  "balance": 2000.00,
  "metadata": {
    "updated": true
  }
}
```

**Response:** Updated account object

#### DELETE /api/accounts/:id
Delete an account.

**Response:** 204 No Content

#### GET /api/accounts/:id/total-balance
Get total balance including child accounts.

**Response:**
```json
{
  "accountId": "account_1703097600000_abc123",
  "totalBalance": 6500.00
}
```

### Transaction Management

#### GET /api/transactions
Get transactions with optional filtering and pagination.

**Query Parameters:**
- `accountId` - Filter by account ID
- `category` - Filter by category
- `startDate` - Filter by start date (timestamp)
- `endDate` - Filter by end date (timestamp)
- `minAmount` - Minimum transaction amount
- `maxAmount` - Maximum transaction amount
- `sortBy` - Sort field (date, amount, description, category)
- `sortOrder` - Sort order (asc, desc)
- `limit` - Number of results to return
- `offset` - Number of results to skip

**Response:**
```json
[
  {
    "id": "txn_1703097600000_xyz789",
    "description": "Grocery shopping",
    "amount": -85.50,
    "fromAccountId": "account_1703097600000_abc123",
    "toAccountId": null,
    "category": "groceries",
    "date": 1703097600000,
    "userId": "user_1703097600000_def456",
    "created": 1703097600000,
    "updated": 1703097600000,
    "metadata": {}
  }
]
```

#### GET /api/accounts/:id/transactions
Get all transactions for a specific account.

**Query Parameters:**
- `sortBy` - Sort field (default: date)
- `sortOrder` - Sort order (default: desc)

**Response:** Array of transaction objects

#### GET /api/transactions/:id
Get specific transaction by ID.

**Response:** Transaction object

#### POST /api/transactions
Create a new transaction.

**Request Body:**
```json
{
  "description": "Grocery shopping",
  "amount": -85.50,
  "fromAccountId": "account_1703097600000_abc123",
  "toAccountId": null,
  "category": "groceries",
  "date": 1703097600000,
  "metadata": {
    "store": "SuperMarket",
    "location": "Downtown"
  }
}
```

**Response:** Transaction object (201 Created)

#### PUT /api/transactions/:id
Update an existing transaction.

**Request Body:**
```json
{
  "description": "Updated description",
  "amount": -90.00,
  "category": "food"
}
```

**Response:** Updated transaction object

#### DELETE /api/transactions/:id
Delete a transaction.

**Response:** 204 No Content

### Financial Analysis

#### GET /api/analysis/summary
Get comprehensive financial summary.

**Response:**
```json
{
  "netWorth": 11000.00,
  "totalAssets": 12500.00,
  "totalLiabilities": 1500.00,
  "monthlyIncome": 5000.00,
  "monthlyExpenses": 3200.00,
  "monthlySavings": 1800.00,
  "accountsByType": {
    "asset": [...],
    "liability": [...],
    "income": [...],
    "expense": [...]
  },
  "accountCount": 8,
  "transactionCount": 45,
  "lastTransactionDate": 1703097600000
}
```

#### GET /api/analysis/spending-by-category
Get spending breakdown by category.

**Query Parameters:**
- `startDate` - Filter start date (timestamp)
- `endDate` - Filter end date (timestamp)

**Response:**
```json
[
  {
    "category": "groceries",
    "amount": 450.00
  },
  {
    "category": "utilities",
    "amount": 320.00
  },
  {
    "category": "entertainment",
    "amount": 150.00
  }
]
```

#### GET /api/analysis/cash-flow
Get daily cash flow analysis.

**Query Parameters:**
- `days` - Number of days to analyze (default: 30)

**Response:**
```json
[
  {
    "date": "2024-01-01",
    "income": 5000.00,
    "expenses": 3200.00,
    "net": 1800.00
  },
  {
    "date": "2024-01-02",
    "income": 0.00,
    "expenses": 85.50,
    "net": -85.50
  }
]
```

#### GET /api/accounts/:id/balance-history
Get balance history for an account.

**Query Parameters:**
- `startDate` - Filter start date (timestamp)
- `endDate` - Filter end date (timestamp)

**Response:**
```json
[
  {
    "date": 1703097600000,
    "transaction": { ... },
    "amount": -85.50,
    "balance": 1414.50
  }
]
```

### Utility Endpoints

#### POST /api/reset
Reset all user data (useful for testing).

**Response:**
```json
{
  "message": "User data reset successfully"
}
```

## Real-time Updates

The application uses NunDB for real-time synchronization. When data changes occur, they are automatically propagated to all connected clients through WebSocket connections.

### Events

The following events are broadcast in real-time:

1. **Account Updates** - Account creation, modification, deletion
2. **Transaction Updates** - Transaction creation, modification, deletion
3. **Balance Updates** - Account balance changes
4. **Connection Updates** - Connection status changes

### WebSocket Connection

The client automatically establishes a WebSocket connection to receive real-time updates. No additional setup is required from the API consumer perspective.

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

## Rate Limiting

Currently, no rate limiting is implemented. In production environments, consider implementing rate limiting based on your specific requirements.

## Examples

### Complete Account Setup
```bash
# Create parent account
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user123" \
  -d '{
    "name": "Bank Accounts",
    "type": "asset",
    "balance": 0
  }'

# Create child account
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user123" \
  -d '{
    "name": "Checking Account",
    "type": "asset",
    "parentId": "account_parent_id",
    "balance": 2000
  }'
```

### Create Transaction
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user123" \
  -d '{
    "description": "Grocery shopping",
    "amount": -85.50,
    "fromAccountId": "account_checking_id",
    "category": "groceries",
    "date": 1703097600000
  }'
```

### Get Financial Summary
```bash
curl -H "X-User-ID: user123" \
  http://localhost:3000/api/analysis/summary
```

### Filter Transactions
```bash
curl -H "X-User-ID: user123" \
  "http://localhost:3000/api/transactions?category=groceries&startDate=1703001600000&limit=10"
```

## Testing

Use the `mock=true` query parameter to use mock mode for testing:

```bash
curl -H "X-User-ID: test-user" \
  "http://localhost:3000/api/accounts?mock=true"
```

Mock mode provides a local in-memory database that doesn't require external NunDB connectivity.

## SDKs and Libraries

This API is designed to work with standard HTTP clients. Examples:

### JavaScript/Node.js
```javascript
const response = await fetch('/api/accounts', {
  headers: {
    'X-User-ID': userId,
    'Content-Type': 'application/json'
  }
});
const accounts = await response.json();
```

### Python
```python
import requests

headers = {'X-User-ID': user_id}
response = requests.get('http://localhost:3000/api/accounts', headers=headers)
accounts = response.json()
```

### cURL
```bash
curl -H "X-User-ID: user123" http://localhost:3000/api/accounts
```