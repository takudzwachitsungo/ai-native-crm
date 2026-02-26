#!/bin/bash
# CRM Database Restore Script
# Usage: ./restore_database.sh <backup_file>

set -e

CONTAINER_NAME="crm-postgres"
DB_USER="crm_user"
DB_NAME="crm_db"
BACKUP_FILE="$1"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$BACKUP_FILE" ]; then
  echo -e "${RED}❌ Error: No backup file specified${NC}"
  echo "Usage: $0 <backup_file>"
  echo ""
  echo "Examples:"
  echo "  $0 backups/crm_backup_20260119_113553.dump"
  echo "  $0 backups/crm_backup_20260119_113553.sql"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
  exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will drop and recreate the database!${NC}"
echo -e "${YELLOW}⚠️  All existing data will be lost!${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${BLUE}❌ Restore cancelled${NC}"
  exit 0
fi

echo -e "${BLUE}🔄 Starting database restore...${NC}"

# Detect file type
EXT="${BACKUP_FILE##*.}"

if [ "$EXT" = "dump" ]; then
  echo -e "${BLUE}📦 Restoring from custom format dump...${NC}"
  
  # Copy dump into container
  docker cp "$BACKUP_FILE" "$CONTAINER_NAME:/tmp/restore.dump"
  
  # Drop and recreate database
  docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
  docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
  
  # Restore
  docker exec "$CONTAINER_NAME" pg_restore -U "$DB_USER" -d "$DB_NAME" -v /tmp/restore.dump
  
  # Cleanup
  docker exec "$CONTAINER_NAME" rm /tmp/restore.dump
  
elif [ "$EXT" = "sql" ]; then
  echo -e "${BLUE}📦 Restoring from SQL dump...${NC}"
  
  # Drop and recreate database
  docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
  docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
  
  # Restore
  cat "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
  
else
  echo -e "${RED}❌ Unsupported file format: $EXT${NC}"
  echo "Supported formats: .dump, .sql"
  exit 1
fi

echo -e "${GREEN}✅ Database restored successfully!${NC}"
echo -e "${BLUE}🔧 Restarting backend to reconnect to database...${NC}"

# Restart backend if running
docker restart crm-backend 2>/dev/null && echo -e "${GREEN}✅ Backend restarted${NC}" || echo -e "${YELLOW}⚠️  Backend not running${NC}"

echo -e "${GREEN}✅ Restore completed!${NC}"
