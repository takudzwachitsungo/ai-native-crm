# Database Backup & Migration Guide

## Quick Overview

You have **3 backup formats** available:

| Format | Command | Use Case | Size |
|--------|---------|----------|------|
| **Custom** | `./backup_database.sh custom` | Best for PostgreSQL-to-PostgreSQL migrations | ~268KB |
| **SQL** | `./backup_database.sh sql` | Universal, human-readable, works anywhere | ~668KB |
| **CSV** | `./backup_database.sh csv` | Import to Excel, other databases, data analysis | Varies |

---

## 🚀 Quick Start

### Create Backup
```bash
# Custom format (recommended for PostgreSQL)
./backup_database.sh custom

# SQL format (most portable)
./backup_database.sh sql

# CSV format (for data analysis/import to other systems)
./backup_database.sh csv
```

### Restore Backup
```bash
# From custom dump
./restore_database.sh backups/crm_backup_20260119_113553.dump

# From SQL dump
./restore_database.sh backups/crm_backup_20260119_113713.sql
```

---

## 📦 Backup Formats Explained

### 1. Custom Format (.dump)
**Best for PostgreSQL migrations**

```bash
./backup_database.sh custom
```

**Pros:**
- ✅ Smaller file size (~268KB vs 668KB SQL)
- ✅ Faster backup/restore
- ✅ Supports parallel restore with `pg_restore`
- ✅ Can restore specific tables

**Cons:**
- ❌ Only works with PostgreSQL
- ❌ Not human-readable

**When to use:**
- Moving between PostgreSQL databases
- Regular production backups
- Disaster recovery

---

### 2. SQL Format (.sql)
**Most portable option**

```bash
./backup_database.sh sql
```

**Pros:**
- ✅ Works with any PostgreSQL version
- ✅ Human-readable (can edit with text editor)
- ✅ Can be version controlled
- ✅ Easy to inspect/debug

**Cons:**
- ❌ Larger file size (~668KB)
- ❌ Slower restore than custom format

**When to use:**
- Sharing database schema with team
- Version control database structure
- Migrating to different PostgreSQL version
- Need to inspect/modify before restore

---

### 3. CSV Format (.csv)
**For data analysis and non-PostgreSQL systems**

```bash
./backup_database.sh csv
```

**Creates individual CSV files for each table:**
```
backups/csv_20260119_113553/
├── leads.csv
├── contacts.csv
├── companies.csv
├── deals.csv
├── tasks.csv
├── events.csv
├── products.csv
├── quotes.csv
├── invoices.csv
└── ... (all other tables)
```

**Pros:**
- ✅ Open in Excel/Google Sheets
- ✅ Import to any database system
- ✅ Data analysis with Python/R
- ✅ Easy data inspection

**Cons:**
- ❌ No database structure (schema)
- ❌ Manual restoration process
- ❌ Loses relationships/constraints

**When to use:**
- Data analysis/reporting
- Migrating to MySQL, MongoDB, etc.
- Excel reports for stakeholders
- Data audits

---

## 🔄 Migration Scenarios

### Scenario 1: Local to Production Server
```bash
# On local machine
./backup_database.sh custom

# Upload to server
scp backups/crm_backup_*.dump user@server:/path/to/backups/

# On server
./restore_database.sh backups/crm_backup_*.dump
```

---

### Scenario 2: Docker to Hosted PostgreSQL (AWS RDS, etc.)
```bash
# Export SQL dump
./backup_database.sh sql

# Restore to hosted database
psql -h your-db.rds.amazonaws.com -U admin -d crm_db < backups/crm_backup_*.sql
```

---

### Scenario 3: PostgreSQL to MySQL (requires manual work)
```bash
# Export CSV files
./backup_database.sh csv

# Create MySQL schema manually
# Import CSVs using:
LOAD DATA INFILE 'leads.csv' INTO TABLE leads 
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"' 
LINES TERMINATED BY '\n' 
IGNORE 1 ROWS;
```

---

### Scenario 4: Moving to Cloud (Azure, GCP)
```bash
# Export SQL dump
./backup_database.sh sql

# Upload to cloud storage
az storage blob upload --file backups/crm_backup_*.sql --name crm_backup.sql

# Restore on cloud database
psql -h cloud-db.postgres.database.azure.com -U admin -d crm_db < crm_backup.sql
```

---

## 🛡️ Best Practices

### Automated Backups
Add to crontab for daily backups:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /Users/ggg/Development/CRM-React && ./backup_database.sh custom

# Add weekly SQL backup every Sunday
0 3 * * 0 cd /Users/ggg/Development/CRM-React && ./backup_database.sh sql
```

---

### Backup Rotation
Keep last 7 days of backups:
```bash
# Add to backup script or run separately
find backups/ -name "crm_backup_*.dump" -mtime +7 -delete
find backups/ -name "crm_backup_*.sql" -mtime +7 -delete
```

---

### Cloud Backup Storage
```bash
# AWS S3
aws s3 cp backups/crm_backup_*.dump s3://your-bucket/backups/

# Google Cloud Storage
gsutil cp backups/crm_backup_*.dump gs://your-bucket/backups/

# Azure Blob Storage
az storage blob upload --container backups --file backups/crm_backup_*.dump
```

---

## 🔍 Backup Verification

### Test Restore in Separate Database
```bash
# Create test database
docker exec crm-postgres psql -U crm_user -d postgres -c "CREATE DATABASE crm_test;"

# Restore backup to test database
docker exec crm-postgres pg_restore -U crm_user -d crm_test /tmp/backup.dump

# Verify data
docker exec crm-postgres psql -U crm_user -d crm_test -c "SELECT COUNT(*) FROM leads;"
docker exec crm-postgres psql -U crm_user -d crm_test -c "SELECT COUNT(*) FROM deals;"

# Drop test database
docker exec crm-postgres psql -U crm_user -d postgres -c "DROP DATABASE crm_test;"
```

---

## 📊 Current Database Stats
```bash
# Check database size
docker exec crm-postgres psql -U crm_user -d crm_db -c "SELECT pg_size_pretty(pg_database_size('crm_db'));"

# Check table sizes
docker exec crm-postgres psql -U crm_user -d crm_db -c "
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
"

# Check row counts
docker exec crm-postgres psql -U crm_user -d crm_db -c "
SELECT 
  schemaname,
  tablename,
  n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
"
```

---

## 🆘 Troubleshooting

### Problem: "Database already exists"
```bash
# Drop existing database first
docker exec crm-postgres psql -U crm_user -d postgres -c "DROP DATABASE crm_db;"
docker exec crm-postgres psql -U crm_user -d postgres -c "CREATE DATABASE crm_db;"
```

### Problem: "Permission denied"
```bash
# Make scripts executable
chmod +x backup_database.sh restore_database.sh
```

### Problem: Backup too large
```bash
# Compress backups
gzip backups/crm_backup_*.dump
# Creates: crm_backup_20260119_113553.dump.gz

# Restore compressed backup
gunzip backups/crm_backup_*.dump.gz
./restore_database.sh backups/crm_backup_*.dump
```

### Problem: Need specific table only
```bash
# Export single table
docker exec crm-postgres pg_dump -U crm_user -d crm_db -t leads > backups/leads_only.sql

# Restore single table
cat backups/leads_only.sql | docker exec -i crm-postgres psql -U crm_user -d crm_db
```

---

## 📈 Production Recommendations

1. **Daily automated backups** (custom format)
2. **Weekly SQL backups** (for archival)
3. **Store backups off-site** (S3, Google Cloud, etc.)
4. **Test restore monthly** to verify backups work
5. **Keep 30 days of backups** minimum
6. **Encrypt sensitive backups** before uploading to cloud

```bash
# Example: Encrypted backup
./backup_database.sh custom
gpg --encrypt --recipient your@email.com backups/crm_backup_*.dump
# Creates: crm_backup_*.dump.gpg

# Decrypt
gpg --decrypt backups/crm_backup_*.dump.gpg > backups/crm_backup.dump
```

---

## 📋 Quick Reference

| Task | Command |
|------|---------|
| Create backup | `./backup_database.sh custom` |
| Create SQL backup | `./backup_database.sh sql` |
| Create CSV exports | `./backup_database.sh csv` |
| Restore backup | `./restore_database.sh backups/file.dump` |
| List backups | `ls -lh backups/` |
| Check backup size | `du -sh backups/` |
| Compress backup | `gzip backups/file.dump` |
| Delete old backups | `find backups/ -mtime +30 -delete` |

---

## 🎯 Summary

**✅ You now have:**
- Automated backup scripts for 3 formats
- Restore script with safety prompts
- Complete migration guide
- Production-ready backup strategy

**Your backup is in:** `backups/crm_backup_20260119_113553.dump` (268KB)

**To migrate to production:**
1. Run `./backup_database.sh custom`
2. Copy .dump file to production server
3. Run `./restore_database.sh backups/file.dump` on production
4. Done! ✅
