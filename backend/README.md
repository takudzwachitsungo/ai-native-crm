# CRM Backend - AI-Powered Spring Boot Application

A production-ready, enterprise-grade Spring Boot backend for a modern Customer Relationship Management system with advanced AI capabilities, multi-tenancy support, and comprehensive observability.

## Features

- **Complete CRM Entity Management**: Leads, Contacts, Companies, Deals, Tasks, Events, Products, Quotes, Invoices, Documents, Emails
- **AI/RAG Capabilities**: OpenAI integration with pgvector for semantic search, intelligent lead scoring, chat assistant
- **Security**: JWT authentication, role-based authorization (Admin, Manager, Sales Rep, User)
- **Multi-Tenancy**: Tenant isolation with Hibernate filters and PostgreSQL Row-Level Security
- **Performance**: Redis caching, connection pooling, async processing with RabbitMQ
- **Observability**: OpenTelemetry tracing, Prometheus metrics, structured JSON logging
- **Rate Limiting**: Bucket4j with tier-based limits (Free: 100/min, Pro: 1000/min, Enterprise: custom)

## Tech Stack

- **Framework**: Spring Boot 3.2.1 with Java 17
- **Database**: PostgreSQL 15 with pgvector extension
- **Caching**: Redis 7
- **Message Queue**: RabbitMQ 3
- **Security**: Spring Security with JWT (jjwt)
- **AI**: OpenAI API with text-embedding-3-small
- **Observability**: OpenTelemetry, Prometheus, Logstash
- **Documentation**: OpenAPI/Swagger
- **Build Tool**: Maven

## Prerequisites

- Java 17 or higher
- Docker and Docker Compose
- Maven 3.9+ (or use included Maven wrapper)

## Quick Start

### 1. Clone and Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start Infrastructure with Docker

```bash
# Start PostgreSQL, Redis, RabbitMQ, Jaeger
docker-compose up -d

# For development with additional tools (pgAdmin, Redis Commander)
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Build and Run

```bash
# Using Maven Wrapper
./mvnw clean install

# Run application
./mvnw spring-boot:run

# Or run with specific profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

The API will be available at `http://localhost:8080`

### 4. Access Documentation

- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **API Docs**: http://localhost:8080/v3/api-docs
- **Health Check**: http://localhost:8080/actuator/health
- **Prometheus Metrics**: http://localhost:8080/actuator/prometheus

## Package Structure

```
com.crm/
├── entity/          # JPA entities with audit support
├── repository/      # Spring Data JPA repositories
├── service/         # Service interfaces
├── service/impl/    # Service implementations
├── controller/      # REST controllers
├── config/          # Spring configurations
├── dto/             # Request/Response DTOs
│   ├── request/
│   └── response/
├── mapper/          # MapStruct entity-DTO mappers
├── security/        # JWT and authentication
├── ai/              # AI/RAG services
├── messaging/       # RabbitMQ message consumers
├── exception/       # Custom exceptions and handlers
└── util/            # Utility classes
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout

### Core Entities
- `/api/v1/leads` - Lead management
- `/api/v1/contacts` - Contact management
- `/api/v1/companies` - Company management
- `/api/v1/deals` - Deal management
- `/api/v1/tasks` - Task management
- `/api/v1/calendar/events` - Calendar events
- `/api/v1/products` - Product catalog
- `/api/v1/quotes` - Quote management
- `/api/v1/invoices` - Invoice management
- `/api/v1/documents` - Document management
- `/api/v1/emails` - Email management

### Analytics & AI
- `/api/v1/dashboard/metrics` - Dashboard KPIs
- `/api/v1/forecasting` - Sales forecasting
- `/api/v1/ai/chat` - AI chat assistant
- `/api/v1/ai/email/generate` - AI email generation

## Database Migrations

Flyway migrations are located in `src/main/resources/db/migration/`:

- `V1__create_schema.sql` - Initial schema with all tables
- `V2__create_indexes.sql` - Performance indexes
- `V3__enable_pgvector.sql` - pgvector extension setup
- `V4__row_level_security.sql` - PostgreSQL RLS policies

## Testing

```bash
# Run all tests
./mvnw test

# Run with coverage report
./mvnw clean test jacoco:report

# View coverage report
open target/site/jacoco/index.html
```

## Docker Deployment

```bash
# Build Docker image
docker build -t crm-backend:latest .

# Run with docker-compose
docker-compose up -d
```

## Environment Variables

See [.env.example](.env.example) for all available environment variables.

## Contributing

1. Create feature branch
2. Make changes with tests
3. Run `./mvnw clean verify`
4. Submit pull request

## License

Proprietary - All rights reserved
