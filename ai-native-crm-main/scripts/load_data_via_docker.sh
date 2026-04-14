#!/bin/bash

# Wrapper script to load fintech data via Docker exec
# This bypasses local PostgreSQL and connects directly to the Docker container

echo "Loading fintech data via Docker container..."

docker exec -i crm-postgres python3 - <<'PYTHON_SCRIPT'
import sys
sys.path.insert(0, '/tmp')

# Generate data script embedded
exec(open('/dev/stdin').read())
PYTHON_SCRIPT
