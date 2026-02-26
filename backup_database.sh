#!/bin/bash
# CRM Database Backup Script
# Usage: ./backup_database.sh [format]
# Formats: sql (default), custom, csv

set -e

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="crm-postgres"
DB_USER="crm_user"
DB_NAME="crm_db"
FORMAT="${1:-custom}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Starting CRM Database Backup...${NC}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

case "$FORMAT" in
  sql)
    echo -e "${BLUE}📦 Creating SQL dump...${NC}"
    BACKUP_FILE="$BACKUP_DIR/crm_backup_${TIMESTAMP}.sql"
    docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
    echo -e "${GREEN}✅ SQL backup created: $BACKUP_FILE${NC}"
    ;;
    
  custom)
    echo -e "${BLUE}📦 Creating custom format dump...${NC}"
    BACKUP_FILE="$BACKUP_DIR/crm_backup_${TIMESTAMP}.dump"
    docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" -F c -f /tmp/backup.dump
    docker cp "$CONTAINER_NAME:/tmp/backup.dump" "$BACKUP_FILE"
    docker exec "$CONTAINER_NAME" rm /tmp/backup.dump
    echo -e "${GREEN}✅ Custom format backup created: $BACKUP_FILE${NC}"
    ;;
    
  csv)
    echo -e "${BLUE}📦 Creating CSV exports...${NC}"
    CSV_DIR="$BACKUP_DIR/csv_${TIMESTAMP}"
    mkdir -p "$CSV_DIR"
    
    # List of tables to export
    TABLES=(
      "leads"
      "contacts"
      "companies"
      "deals"
      "tasks"
      "events"
      "products"
      "quotes"
      "invoices"
      "documents"
      "emails"
      "users"
      "tenants"
    )
    
    for table in "${TABLES[@]}"; do
      echo -e "  📄 Exporting $table..."
      docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "\COPY $table TO '/tmp/${table}.csv' CSV HEADER" 2>/dev/null || echo "  ⚠️  Table $table not found or empty"
      docker cp "$CONTAINER_NAME:/tmp/${table}.csv" "$CSV_DIR/${table}.csv" 2>/dev/null || true
      docker exec "$CONTAINER_NAME" rm -f "/tmp/${table}.csv" 2>/dev/null || true
    done
    
    echo -e "${GREEN}✅ CSV exports created in: $CSV_DIR${NC}"
    ;;
    
  *)
    echo -e "${RED}❌ Invalid format: $FORMAT${NC}"
    echo "Usage: $0 [sql|custom|csv]"
    exit 1
    ;;
esac

# Show backup size
if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
  echo -e "${GREEN}📊 Backup size: $SIZE${NC}"
elif [ -d "$CSV_DIR" ]; then
  SIZE=$(du -sh "$CSV_DIR" | awk '{print $1}')
  echo -e "${GREEN}📊 Total CSV size: $SIZE${NC}"
fi

echo -e "${GREEN}✅ Backup completed successfully!${NC}"
