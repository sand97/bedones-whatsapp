# Monorepo

A modern pnpm monorepo containing frontend and backend applications with shared packages.

## Project Structure

```
monorepo/
├── apps/
│   ├── frontend/          # React Router v7 application
│   └── backend/           # NestJS + Prisma + Swagger backend
├── packages/
│   └── common/            # Shared enums, constants, and utilities
├── package.json           # Root workspace configuration
├── pnpm-workspace.yaml    # pnpm workspace definition
├── docker-compose.yml     # Development environment
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

```bash
cp apps/backend/.env.example apps/backend/.env
# Edit the .env file with your configuration
# Database: app_db, User: app_user, Password: (set your own)
```

3. Start the development environment:

```bash
# Option 1: Using Docker (Recommended)
docker compose up

# Generate migration
docker exec apps-backend pnpx prisma@6.16.2 migrate dev --name [migration-name]

# Run database migrations (inside Docker container)
docker exec apps-backend pnpx prisma@6.16.2 migrate deploy

# Start frontend development server (locally)
pnpm --filter frontend run dev
```

### Services

- **Backend**: http://localhost:3005
- **API Documentation**: http://localhost:3005/api
- **Database**: PostgreSQL on port 5432
- **Frontend**: http://localhost:5173 (when running locally)

## Architecture

### Frontend (apps/frontend)

- **Framework**: React Router v7
- **Language**: TypeScript
- **Styling**: Tailwind CSS and Ant Design
- **State Management**: React Query/SWR for server state
- **Build Tool**: Vite

### Backend (apps/backend)

- **Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **API Documentation**: Swagger/OpenAPI
- **Authentication**: JWT-based authentication with Passport
- **Validation**: Class-validator with DTOs
- **Email**: Nodemailer integration for transactional emails
- **Health Checks**: Terminus for service health monitoring
- **Internationalization**: i18n support with French translations
- **Modules**: Auth, Users, Email, Health, Prisma, i18n

### Shared Package (packages/common)

- **Types**: Shared TypeScript interfaces and types
- **Enums**: Common enumerations
- **Constants**: Application-wide constants
- **Utilities**: Shared utility functions

## Code Quality

The project uses shared configurations for:

- **ESLint**: Consistent code linting across all packages
- **Prettier**: Code formatting
- **TypeScript**: Type checking and compilation
