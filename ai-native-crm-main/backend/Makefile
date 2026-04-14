.PHONY: help dev dev-stop build run test clean docker-up docker-down logs

help:
	@echo "CRM Backend - Make Commands"
	@echo ""
	@echo "  make dev          - Start development environment (infrastructure only)"
	@echo "  make dev-stop     - Stop development environment"
	@echo "  make build        - Build application with mvn"
	@echo "  make run          - Run application locally with mvn"
	@echo "  make test         - Run backend tests with mvn"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make docker-up    - Start full stack with Docker"
	@echo "  make docker-down  - Stop Docker containers"
	@echo "  make logs         - Show application logs"

dev:
	@echo "Starting development infrastructure..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Waiting for services to be ready..."
	@sleep 10
	@echo "Development environment ready!"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  pgAdmin: http://localhost:5050"
	@echo "  Redis: localhost:6379"
	@echo "  Redis Commander: http://localhost:8081"
	@echo "  RabbitMQ: http://localhost:15672 (guest/guest)"
	@echo "  Jaeger UI: http://localhost:16686"

dev-stop:
	docker-compose -f docker-compose.dev.yml down

build:
	mvn clean package -DskipTests

run:
	mvn spring-boot:run -Dspring-boot.run.profiles=dev

test:
	mvn clean test

clean:
	mvn clean
	rm -rf target/
	rm -rf logs/

docker-up:
	docker-compose up --build -d

docker-down:
	docker-compose down

logs:
	docker-compose logs -f crm-backend
