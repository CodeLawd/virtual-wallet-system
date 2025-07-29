# Virtual Wallet System

A comprehensive multi-tenant virtual wallet system built with NestJS, providing secure financial transaction management, payment processing, and virtual account services.

## About the Application

The Virtual Wallet System is a robust financial platform that enables businesses to:

- **Multi-tenant Architecture**: Support multiple tenants with isolated data and operations
- **User Management**: Secure user registration and authentication with JWT tokens
- **Digital Wallets**: Create and manage multiple currency wallets per user
- **Virtual Accounts**: Generate virtual bank accounts for seamless fund collection
- **Transaction Processing**: Handle deposits, withdrawals, and transfers with atomic operations
- **Payment Integration**: Support for multiple payment providers (Paystack, Flutterwave, Stripe)
- **Webhook Processing**: Real-time payment notifications and status updates
- **Idempotency**: Prevent duplicate transactions with idempotency key support
- **Caching**: Redis-based caching for improved performance
- **Queue Management**: Background job processing with BullMQ
- **Rate Limiting**: API throttling for security and stability

### Key Features

- **Secure Authentication**: Tenant-based API key authentication and JWT user sessions
- **Multi-currency Support**: Handle transactions in different currencies
- **Atomic Transactions**: Database transactions ensure data consistency
- **Real-time Updates**: WebSocket support for live transaction updates
- **Comprehensive API**: RESTful APIs with Swagger documentation
- **Error Handling**: Robust error handling and validation
- **Audit Trail**: Complete transaction history and logging

## Prerequisites

Before setting up the application, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Yarn** package manager
- **PostgreSQL** database
- **Redis** server

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=virtual_wallet_db

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Environment
ENV=development
```

## Step-by-Step Setup Process

### 1. Install Dependencies

```bash
$ yarn install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
$ createdb virtual_wallet_db

# The application uses TypeORM with synchronize: true
# Tables will be created automatically on first run
```

### 3. Start Redis Server

```bash
# On macOS with Homebrew
$ brew services start redis

# Or start manually
$ redis-server
```

### 4. Run the Application

```bash
# Development mode with hot reload
$ yarn run start:dev

# Production mode
$ yarn run start:prod

# Debug mode
$ yarn run start:debug
```

The application will be available at `http://localhost:3100`

### 5. API Documentation

Once the application is running, you can access the Swagger API documentation at:
`http://localhost:3100/api`

## How to Create a User

The application uses a multi-tenant architecture. Follow these steps to create a user:

### 1. Create a Tenant (First-time setup)

Before creating users, you need to create a tenant. Use the following API endpoint:

```bash
POST /tenants
Content-Type: application/json

{
  "name": "Your Company Name",
  "email": "admin@yourcompany.com",
  "description": "Your company description"
}
```

This will return a tenant with an `apiKey` that you'll use for user registration.

### 2. Register a New User

Use the tenant's API key to register users:

```bash
POST /auth/register
Content-Type: application/json
tenant-api-key: YOUR_TENANT_API_KEY

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### 3. User Login

After registration, users can login to get a JWT token:

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

This returns a JWT token for authenticated API calls.

### 4. Create a Wallet

Once logged in, create a wallet for the user:

```bash
POST /wallets
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "currency": "USD"
}
```

### 5. Perform Transactions

#### Deposit Money
```bash
POST /transactions/deposit
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
Idempotency-Key: unique-key-123

{
  "walletId": "wallet-uuid",
  "amount": 100.00,
  "provider": "paystack",
  "description": "Initial deposit"
}
```

#### Transfer Money
```bash
POST /transactions/transfer
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
Idempotency-Key: unique-key-456

{
  "fromWalletId": "sender-wallet-uuid",
  "toWalletId": "recipient-wallet-uuid",
  "amount": 50.00,
  "description": "Payment for services"
}
```

#### Withdraw Money
```bash
POST /transactions/withdrawal
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
Idempotency-Key: unique-key-789

{
  "walletId": "wallet-uuid",
  "amount": 25.00,
  "provider": "paystack",
  "description": "Withdrawal to bank account"
}
```

### 6. Create Virtual Accounts

Generate virtual bank accounts for easy fund collection:

```bash
POST /virtual-accounts
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "walletId": "wallet-uuid",
  "provider": "paystack",
  "currency": "USD"
}
```

## API Endpoints Overview

- **Authentication**: `/auth/register`, `/auth/login`
- **Tenants**: `/tenants` (CRUD operations)
- **Users**: `/users` (User management)
- **Wallets**: `/wallets` (Wallet management)
- **Transactions**: `/transactions` (Deposits, withdrawals, transfers)
- **Virtual Accounts**: `/virtual-accounts` (Virtual account management)
- **Webhooks**: `/webhooks` (Payment provider webhooks)

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Architecture Overview

The Virtual Wallet System follows a modular architecture with the following key components:

### Core Modules
- **Auth Module**: Handles user authentication and authorization
- **Users Module**: User management and profile operations
- **Tenants Module**: Multi-tenant support and isolation
- **Wallets Module**: Digital wallet creation and management
- **Transactions Module**: Financial transaction processing
- **Virtual Accounts Module**: Virtual bank account generation
- **Payment Providers Module**: Integration with external payment services
- **Webhooks Module**: Real-time payment notifications
- **Queue Module**: Background job processing
- **Idempotency Module**: Duplicate transaction prevention

### Technology Stack
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with TypeORM
- **Caching**: Redis
- **Queue**: BullMQ
- **Authentication**: JWT tokens
- **API Documentation**: Swagger/OpenAPI
- **Validation**: Class-validator
- **Rate Limiting**: NestJS Throttler

### Security Features
- Tenant-based API key authentication
- JWT token-based user sessions
- Request rate limiting
- Input validation and sanitization
- Atomic database transactions
- Idempotency key support

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Verify database credentials in `.env`
   - Check if the database exists

2. **Redis Connection Error**
   - Ensure Redis server is running
   - Verify Redis host and port in `.env`

3. **Module Resolution Errors**
   - Run `yarn install` to ensure all dependencies are installed
   - Clear node_modules and reinstall if needed

4. **Authentication Issues**
   - Ensure JWT_SECRET is set in `.env`
   - Verify tenant API key is correct
   - Check token expiration

## Contributing

When contributing to this project:

1. Follow the existing code style and conventions
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [Redis Documentation](https://redis.io/documentation)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## License

This project is licensed under the MIT License.
