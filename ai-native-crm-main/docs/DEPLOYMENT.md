# 🚀 CRM System - Complete Deployment Guide

> **Step-by-step guide to deploying the CRM system on a new server/PC**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (New Server)](#quick-start-new-server)
3. [Production Deployment](#production-deployment)
4. [Database Migration](#database-migration)
5. [Environment Configuration](#environment-configuration)
6. [Running the Application](#running-the-application)
7. [Debugging Commands](#debugging-commands)
8. [Monitoring & Logs](#monitoring--logs)
9. [Backup & Restore](#backup--restore)
10. [Troubleshooting](#troubleshooting)
11. [Production Checklist](#production-checklist)

---

## 🎯 Prerequisites

### Required Software

```bash
# Check versions
docker --version          # Required: 20.10+
docker-compose --version  # Required: 2.0+
git --version            # Required: 2.0+
node --version           # Required: 18+ (for frontend build)
npm --version            # Required: 9+

# Optional (for manual backend build)
java --version           # Required: 17+
mvn --version            # Required: 3.9+
python --version         # Required: 3.11+ (if running AI service locally)
```

### Minimum System Requirements

| Component | Development | Production |
|-----------|-------------|------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4GB | 8GB+ |
| **Disk** | 20GB | 50GB+ |
| **OS** | macOS/Linux/Windows | Linux (Ubuntu 22.04 LTS recommended) |

---

## ⚡ Quick Start (New Server)

### Method 1: Docker Deployment (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/your-org/CRM-React.git
cd CRM-React

# 2. Set up environment variables
cp .env.example .env
nano .env  # Edit with your settings

# 3. Build and start all services
cd backend
docker-compose up -d --build

# 4. Wait for services to be healthy
docker-compose ps

# 5. Check all services are running
curl http://localhost:8080/actuator/health  # Backend
curl http://localhost:8000/health           # AI Service

# 6. Import data (optional)
cd ..
python import_crm_data.py

# 7. Build frontend
npm install
npm run build

# 8. Serve frontend (production)
npm install -g serve
serve -s dist -l 3000
```

**🎉 Done! Application running at:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- AI Service: http://localhost:8000

---

### Method 2: Clone from Existing System

```bash
# On source machine
cd /path/to/CRM-React

# Create full backup
./backup_database.sh custom
tar -czf crm-full-backup.tar.gz \
  backups/ \
  .env \
  backend/.env \
  ai-service/.env

# Copy to new server
scp crm-full-backup.tar.gz user@new-server:/home/user/

# On new server
cd /home/user
git clone https://github.com/your-org/CRM-React.git
cd CRM-React

# Extract backup
tar -xzf ../crm-full-backup.tar.gz

# Start services
cd backend
docker-compose up -d --build

# Wait for services to start (30 seconds)
sleep 30

# Restore database
cd ..
./restore_database.sh backups/crm_backup_TIMESTAMP.dump

# Build frontend
npm install
npm run build
serve -s dist -l 3000
```

---

## 🏭 Production Deployment

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for frontend build)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Create app directory
sudo mkdir -p /opt/crm
sudo chown $USER:$USER /opt/crm
cd /opt/crm
```

---

### Step 2: Clone & Configure

```bash
# Clone repository
git clone https://github.com/your-org/CRM-React.git .

# Create production .env files
cat > .env << 'EOF'
NODE_ENV=production
VITE_API_URL=http://your-domain.com:8080
VITE_AI_API_URL=http://your-domain.com:8000
EOF

cat > backend/.env << 'EOF'
# Database
POSTGRES_DB=crm_db
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
DATABASE_URL=jdbc:postgresql://postgres:5432/crm_db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASS=guest

# JWT
JWT_SECRET=CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_KEY_AT_LEAST_256_BITS
JWT_EXPIRATION=900000
JWT_REFRESH_EXPIRATION=604800000

# OpenAI (optional)
OPENAI_API_KEY=your-openai-api-key

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourcompany.com
EOF

cat > ai-service/.env << 'EOF'
# Groq LLM
GROQ_API_KEY=your-groq-api-key

# CRM Backend
CRM_API_URL=http://crm-backend:8080
CRM_API_USERNAME=admin@crm.com
CRM_API_PASSWORD=admin123

# Model settings
LLM_MODEL=llama-3.3-70b-versatile
LLM_TEMPERATURE=0.3
EMBEDDING_MODEL=all-MiniLM-L6-v2
EOF

# Secure environment files
chmod 600 .env backend/.env ai-service/.env
```

---

### Step 3: Build & Deploy

```bash
# Build frontend
npm install
npm run build

# Build and start Docker services
cd backend
docker-compose up -d --build

# Check services are healthy
docker-compose ps

# Expected output:
# NAME                IMAGE                             STATUS
# crm-backend         backend-crm-backend               Up (healthy)
# crm-ai-service      backend-ai-service                Up (healthy)
# crm-postgres        pgvector/pgvector:pg15            Up (healthy)
# crm-redis           redis:7-alpine                    Up (healthy)
# crm-rabbitmq        rabbitmq:3-management-alpine      Up (healthy)
# crm-jaeger          jaegertracing/all-in-one:latest   Up
```

---

### Step 4: Nginx Reverse Proxy (Production)

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/crm
```

```nginx
# /etc/nginx/sites-available/crm
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (React)
    location / {
        root /opt/crm/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Static assets (cached)
    location /assets {
        root /opt/crm/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # AI Service
    location /ai/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # SSE support
        proxy_buffering off;
        proxy_cache off;
    }

    # Backend health check
    location /actuator/health {
        proxy_pass http://localhost:8080/actuator/health;
    }

    # AI service health check
    location /health {
        proxy_pass http://localhost:8000/health;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

### Step 5: SSL/HTTPS with Let's Encrypt (Optional)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (already set up by certbot)
sudo systemctl status certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

---

## 📦 Database Migration

### Option 1: Migrate from Development to Production

```bash
# On development machine
cd /path/to/CRM-React

# Create backup
./backup_database.sh custom

# Copy to production server
scp backups/crm_backup_*.dump user@production-server:/opt/crm/backups/

# On production server
cd /opt/crm

# Restore backup
./restore_database.sh backups/crm_backup_*.dump

# Verify data
docker exec crm-postgres psql -U crm_user -d crm_db -c "SELECT COUNT(*) FROM leads;"
docker exec crm-postgres psql -U crm_user -d crm_db -c "SELECT COUNT(*) FROM deals;"
docker exec crm-postgres psql -U crm_user -d crm_db -c "SELECT COUNT(*) FROM contacts;"
```

---

### Option 2: Fresh Database with Test Data

```bash
# On production server
cd /opt/crm

# Generate test data
python generate_crm_data.py

# Import data
python import_crm_data.py

# Verify
docker exec crm-postgres psql -U crm_user -d crm_db -c "
SELECT 
  'leads' as table_name, COUNT(*) as count FROM leads
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL
SELECT 'deals', COUNT(*) FROM deals
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'events', COUNT(*) FROM events;
"
```

---

### Option 3: Migrate from Another PostgreSQL Server

```bash
# On source PostgreSQL server
pg_dump -h source-server -U crm_user -d crm_db -F c -f crm_export.dump

# Copy to production
scp crm_export.dump user@production-server:/opt/crm/backups/

# On production server
./restore_database.sh backups/crm_export.dump
```

---

## ⚙️ Environment Configuration

### Frontend (.env)

```bash
# Production
NODE_ENV=production
VITE_API_URL=https://api.your-domain.com
VITE_AI_API_URL=https://api.your-domain.com/ai

# Development
NODE_ENV=development
VITE_API_URL=http://localhost:8080
VITE_AI_API_URL=http://localhost:8000
```

### Backend (backend/.env)

```bash
# Database
POSTGRES_DB=crm_db
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=strong_password_here
DATABASE_URL=jdbc:postgresql://postgres:5432/crm_db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=optional_redis_password

# JWT Security
JWT_SECRET=your_super_secret_key_at_least_256_bits_long
JWT_EXPIRATION=900000              # 15 minutes
JWT_REFRESH_EXPIRATION=604800000   # 7 days

# CORS
CORS_ALLOWED_ORIGINS=https://your-domain.com,http://localhost:5173

# OpenAI (optional)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourcompany.com

# Logging
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_COM_CRM=DEBUG

# Actuator (monitoring)
MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE=health,metrics,prometheus
```

### AI Service (ai-service/.env)

```bash
# Groq LLM
GROQ_API_KEY=gsk_...
LLM_MODEL=llama-3.3-70b-versatile
LLM_TEMPERATURE=0.3

# CRM Backend
CRM_API_URL=http://crm-backend:8080
CRM_API_USERNAME=admin@crm.com
CRM_API_PASSWORD=admin123

# Embeddings
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIMENSIONS=384

# PostgreSQL (for vector storage)
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=crm_db
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=same_as_backend_password
```

---

## 🎮 Running the Application

### All Services (Docker - Recommended)

```bash
cd backend

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

---

### Individual Services

#### 1. PostgreSQL

```bash
# Start
docker-compose up -d postgres

# Connect
docker exec -it crm-postgres psql -U crm_user -d crm_db

# Check data
SELECT COUNT(*) FROM leads;
SELECT COUNT(*) FROM deals;

# Exit
\q
```

#### 2. Backend (Spring Boot)

```bash
# Via Docker
docker-compose up -d crm-backend

# View logs
docker logs -f crm-backend

# Restart
docker restart crm-backend

# Or manually (outside Docker)
cd backend
./mvnw clean install
./mvnw spring-boot:run

# With specific profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

#### 3. AI Service (FastAPI)

```bash
# Via Docker
docker-compose up -d ai-service

# View logs
docker logs -f crm-ai-service

# Restart
docker restart crm-ai-service

# Or manually (outside Docker)
cd ai-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 4. Frontend (React)

```bash
# Development
npm run dev
# → http://localhost:5173

# Production build
npm run build
# → Outputs to dist/

# Serve production build
npm install -g serve
serve -s dist -l 3000
# → http://localhost:3000

# Or with Nginx (see production deployment)
```

---

### Startup Order (If starting manually)

```bash
# 1. Infrastructure first
docker-compose up -d postgres redis rabbitmq

# 2. Wait for health checks (30 seconds)
sleep 30

# 3. Start backend
docker-compose up -d crm-backend

# 4. Wait for backend (20 seconds)
sleep 20

# 5. Start AI service
docker-compose up -d ai-service

# 6. Start frontend
npm run dev
```

---

## 🐛 Debugging Commands

### Check Service Health

```bash
# All services
docker-compose ps

# Backend health
curl http://localhost:8080/actuator/health | jq .

# AI service health
curl http://localhost:8000/health | jq .

# Database connection
docker exec crm-postgres pg_isready -U crm_user

# Redis connection
docker exec crm-redis redis-cli ping

# RabbitMQ status
curl -u guest:guest http://localhost:15672/api/overview | jq .
```

---

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker logs -f crm-backend
docker logs -f crm-ai-service
docker logs -f crm-postgres

# Last 100 lines
docker logs --tail 100 crm-backend

# Follow logs with timestamps
docker logs -f --timestamps crm-backend

# Search logs
docker logs crm-backend 2>&1 | grep ERROR
docker logs crm-ai-service 2>&1 | grep "HTTP Request"
```

---

### Database Debugging

```bash
# Connect to database
docker exec -it crm-postgres psql -U crm_user -d crm_db

# Check tables
\dt

# Check table structure
\d leads
\d deals

# Check row counts
SELECT 
  'leads' as table_name, COUNT(*) as count FROM leads
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'deals', COUNT(*) FROM deals
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'events', COUNT(*) FROM events
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'quotes', COUNT(*) FROM quotes
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'documents', COUNT(*) FROM documents;

# Check recent leads
SELECT id, first_name, last_name, email, status, created_at 
FROM leads 
ORDER BY created_at DESC 
LIMIT 10;

# Check active deals
SELECT id, title, stage, value, probability, created_at 
FROM deals 
WHERE stage NOT IN ('CLOSED_WON', 'CLOSED_LOST')
ORDER BY created_at DESC;

# Check database size
SELECT pg_size_pretty(pg_database_size('crm_db'));

# Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Exit
\q
```

---

### Network Debugging

```bash
# Check container network
docker network ls
docker network inspect backend_crm-network

# Check ports
sudo lsof -i :8080  # Backend
sudo lsof -i :8000  # AI Service
sudo lsof -i :5432  # PostgreSQL
sudo lsof -i :6379  # Redis
sudo lsof -i :5672  # RabbitMQ

# Test connectivity between containers
docker exec crm-backend curl http://crm-postgres:5432
docker exec crm-ai-service curl http://crm-backend:8080/actuator/health
```

---

### API Testing

```bash
# Get JWT token
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"@ukta0022."}' \
  | jq -r .token)

echo "Token: $TOKEN"

# Test endpoints
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/leads | jq .
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/deals | jq .
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/contacts | jq .

# Create a lead
curl -X POST http://localhost:8080/api/v1/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Lead",
    "email": "test@example.com",
    "phone": "+1234567890",
    "status": "NEW",
    "source": "API"
  }' | jq .

# Test AI service
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Show me high-value leads"}],
    "context": {"page": "leads"}
  }' | jq .

# Test report generation
curl -X POST http://localhost:8000/reports/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"report_type":"custom","custom_query":"meeting reports"}' | jq .
```

---

### Performance Monitoring

```bash
# Container resource usage
docker stats

# Backend metrics (Prometheus format)
curl http://localhost:8080/actuator/metrics | jq .

# Specific metric
curl http://localhost:8080/actuator/metrics/jvm.memory.used | jq .

# Database performance
docker exec crm-postgres psql -U crm_user -d crm_db -c "
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
"

# Slow queries
docker exec crm-postgres psql -U crm_user -d crm_db -c "
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"
```

---

## 📊 Monitoring & Logs

### Centralized Logging

```bash
# View all logs
docker-compose logs -f

# Filter by service
docker-compose logs -f crm-backend
docker-compose logs -f crm-ai-service

# Grep for errors
docker-compose logs | grep -i error
docker-compose logs | grep -i exception
docker-compose logs | grep -i "HTTP/1.1 500"

# Export logs to file
docker-compose logs > logs_$(date +%Y%m%d_%H%M%S).txt
```

---

### Monitoring Endpoints

| Service | Endpoint | Purpose |
|---------|----------|---------|
| **Backend Health** | http://localhost:8080/actuator/health | Health check |
| **Backend Metrics** | http://localhost:8080/actuator/metrics | Prometheus metrics |
| **Backend Info** | http://localhost:8080/actuator/info | App information |
| **AI Service Health** | http://localhost:8000/health | Health check |
| **AI Service Docs** | http://localhost:8000/docs | API documentation |
| **RabbitMQ UI** | http://localhost:15672 | Queue management (guest/guest) |
| **SMTP Provider** | Configured via `MAIL_*` env vars | Outbound email delivery |
| **Jaeger UI** | http://localhost:16686 | Distributed tracing |

---

### Set Up Monitoring (Production)

```bash
# Install Prometheus
docker run -d \
  --name prometheus \
  --network backend_crm-network \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Install Grafana
docker run -d \
  --name grafana \
  --network backend_crm-network \
  -p 3001:3000 \
  grafana/grafana

# Access Grafana: http://localhost:3001 (admin/admin)
# Add Prometheus data source: http://prometheus:9090
```

---

## 💾 Backup & Restore

### Automated Daily Backups

```bash
# Add to crontab
crontab -e

# Add this line (daily at 2 AM)
0 2 * * * cd /opt/crm && ./backup_database.sh custom >> /var/log/crm-backup.log 2>&1

# Weekly SQL backup (Sundays at 3 AM)
0 3 * * 0 cd /opt/crm && ./backup_database.sh sql >> /var/log/crm-backup.log 2>&1

# Clean old backups (keep 30 days)
0 4 * * * find /opt/crm/backups -name "crm_backup_*.dump" -mtime +30 -delete
```

---

### Manual Backup

```bash
# Custom format (recommended)
./backup_database.sh custom

# SQL format (portable)
./backup_database.sh sql

# CSV exports (for analysis)
./backup_database.sh csv

# Backup with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
./backup_database.sh custom
mv backups/crm_backup_*.dump backups/crm_production_${TIMESTAMP}.dump
```

---

### Restore

```bash
# From custom dump
./restore_database.sh backups/crm_backup_TIMESTAMP.dump

# From SQL dump
./restore_database.sh backups/crm_backup_TIMESTAMP.sql

# Restore to different database name
docker exec crm-postgres psql -U crm_user -d postgres -c "CREATE DATABASE crm_test;"
docker cp backups/crm_backup.dump crm-postgres:/tmp/
docker exec crm-postgres pg_restore -U crm_user -d crm_test /tmp/crm_backup.dump
```

---

### Backup to Cloud Storage

```bash
# AWS S3
aws s3 cp backups/crm_backup_*.dump s3://your-bucket/crm-backups/

# Google Cloud Storage
gsutil cp backups/crm_backup_*.dump gs://your-bucket/crm-backups/

# Azure Blob Storage
az storage blob upload \
  --account-name youraccount \
  --container-name backups \
  --file backups/crm_backup_*.dump \
  --name crm-backups/crm_backup_$(date +%Y%m%d).dump
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port
sudo lsof -i :8080
sudo lsof -i :8000
sudo lsof -i :5432

# Kill process
sudo kill -9 <PID>

# Or stop Docker container
docker ps
docker stop <container_name>
```

#### 2. Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs crm-postgres

# Test connection
docker exec crm-postgres psql -U crm_user -d crm_db -c "SELECT 1;"

# Restart PostgreSQL
docker restart crm-postgres

# Check connection from backend
docker exec crm-backend curl http://crm-postgres:5432
```

#### 3. Backend Not Starting

```bash
# Check logs for errors
docker logs crm-backend

# Common issues:
# - Database not ready: Wait 30 seconds after starting PostgreSQL
# - Invalid JWT_SECRET: Check backend/.env
# - Port conflict: Check if 8080 is available

# Rebuild backend
cd backend
docker-compose build --no-cache crm-backend
docker-compose up -d crm-backend
```

#### 4. AI Service Not Responding

```bash
# Check logs
docker logs crm-ai-service

# Common issues:
# - GROQ_API_KEY missing: Check ai-service/.env
# - Backend not reachable: Check network connectivity
# - Model loading failed: Wait for first request (downloads model)

# Rebuild AI service
cd backend
docker-compose build --no-cache ai-service
docker-compose up -d ai-service

# Test AI service directly
curl http://localhost:8000/health
```

#### 5. Frontend Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules dist package-lock.json
npm install
npm run build

# Check Node version
node --version  # Should be 18+

# Check environment variables
cat .env
```

#### 6. CORS Errors

```bash
# Check backend CORS configuration
docker exec crm-backend cat /app/src/main/resources/application.yml | grep -A5 cors

# Update CORS allowed origins in backend/.env
CORS_ALLOWED_ORIGINS=https://your-domain.com,http://localhost:5173

# Restart backend
docker restart crm-backend
```

#### 7. JWT Token Expired

```bash
# Get new token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"@ukta0022."}' \
  | jq -r .token

# Or login via frontend
# Frontend auto-refreshes tokens
```

#### 8. Database Migration Failed

```bash
# Check Flyway migrations
docker exec crm-postgres psql -U crm_user -d crm_db -c "SELECT * FROM flyway_schema_history ORDER BY installed_on DESC LIMIT 5;"

# Repair failed migration
docker exec crm-backend java -jar app.jar db:repair

# Or drop and recreate database
docker exec crm-postgres psql -U crm_user -d postgres -c "DROP DATABASE crm_db;"
docker exec crm-postgres psql -U crm_user -d postgres -c "CREATE DATABASE crm_db;"
docker restart crm-backend
```

---

### Emergency Recovery

```bash
# Stop all services
docker-compose down

# Backup current state (if possible)
./backup_database.sh custom

# Remove all containers and volumes
docker-compose down -v

# Start fresh
docker-compose up -d --build

# Wait for services to be healthy
sleep 60

# Restore from backup
./restore_database.sh backups/latest_backup.dump

# Or reimport data
python import_crm_data.py
```

---

## ✅ Production Checklist

### Before Deployment

- [ ] Update all `.env` files with production values
- [ ] Change default passwords (database, RabbitMQ, admin user)
- [ ] Generate strong JWT_SECRET (at least 256 bits)
- [ ] Configure proper CORS_ALLOWED_ORIGINS
- [ ] Set up SSL/HTTPS with Let's Encrypt
- [ ] Configure firewall rules
- [ ] Set up automated backups (cron jobs)
- [ ] Configure log rotation
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Test backup and restore procedures
- [ ] Configure email SMTP settings
- [ ] Set up domain DNS records
- [ ] Test all API endpoints
- [ ] Run security scan
- [ ] Document admin credentials (securely)
- [ ] Set up error alerting

### After Deployment

- [ ] Verify all services are running
- [ ] Check health endpoints
- [ ] Test user registration and login
- [ ] Test CRUD operations for all entities
- [ ] Test AI chat functionality
- [ ] Verify email delivery
- [ ] Check logs for errors
- [ ] Monitor resource usage
- [ ] Test backup creation
- [ ] Document deployment date and version

---

## 🚀 Quick Command Reference

```bash
# DEPLOYMENT
git clone repo && cd repo
cp .env.example .env && nano .env
cd backend && docker-compose up -d --build
npm install && npm run build
serve -s dist -l 3000

# MONITORING
docker-compose ps                    # Service status
docker-compose logs -f               # All logs
docker logs -f crm-backend          # Backend logs
curl localhost:8080/actuator/health # Health check

# DATABASE
./backup_database.sh custom         # Backup
./restore_database.sh backup.dump   # Restore
docker exec -it crm-postgres psql -U crm_user -d crm_db  # Connect

# MAINTENANCE
docker-compose restart              # Restart all
docker restart crm-backend         # Restart backend
docker-compose down && docker-compose up -d  # Full restart
docker system prune -a             # Clean Docker

# DEBUGGING
docker stats                        # Resource usage
docker inspect crm-backend         # Container details
docker exec crm-backend env        # Environment variables
docker-compose logs | grep ERROR   # Find errors
```

---

## 📞 Support & Resources

### Documentation
- **Main README**: `README.md`
- **Architecture**: `STRUCTURE.md`
- **Database Backup**: `DATABASE_BACKUP_GUIDE.md`
- **AI Service**: `ai-service/README.md`

### Endpoints
- **Frontend**: http://your-domain.com
- **Backend API**: http://your-domain.com/api
- **API Docs**: http://your-domain.com:8080/swagger-ui.html
- **Health Check**: http://your-domain.com/actuator/health

### Logs Location
- Docker logs: `docker logs <container>`
- Nginx logs: `/var/log/nginx/`
- Application logs: Inside containers

---

**🎉 Deployment Complete!**

Your CRM system is now running in production. Monitor logs, set up alerts, and enjoy! 🚀
