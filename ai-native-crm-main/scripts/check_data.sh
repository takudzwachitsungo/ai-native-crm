#!/bin/bash

echo "=========================================="
echo "   CRM DATABASE DATA SUMMARY"
echo "=========================================="
echo ""

TENANT_ID="2779be28-889e-45eb-816b-98e9407dca9c"

echo "📊 TOTAL RECORDS:"
docker exec crm-postgres psql -U crm_user -d crm_db -t -c "
  SELECT '  Companies: ' || COUNT(*) FROM companies WHERE tenant_id = '$TENANT_ID';
"
docker exec crm-postgres psql -U crm_user -d crm_db -t -c "
  SELECT '  Contacts:  ' || COUNT(*) FROM contacts WHERE tenant_id = '$TENANT_ID';
"
docker exec crm-postgres psql -U crm_user -d crm_db -t -c "
  SELECT '  Leads:     ' || COUNT(*) FROM leads WHERE tenant_id = '$TENANT_ID';
"
docker exec crm-postgres psql -U crm_user -d crm_db -t -c "
  SELECT '  Deals:     ' || COUNT(*) FROM deals WHERE tenant_id = '$TENANT_ID';
"
docker exec crm-postgres psql -U crm_user -d crm_db -t -c "
  SELECT '  Products:  ' || COUNT(*) FROM products WHERE tenant_id = '$TENANT_ID';
"
docker exec crm-postgres psql -U crm_user -d crm_db -t -c "
  SELECT '  Tasks:     ' || COUNT(*) FROM tasks WHERE tenant_id = '$TENANT_ID';
"
docker exec crm-postgres psql -U crm_user -d crm_db -t -c "
  SELECT '  Events:    ' || COUNT(*) FROM events WHERE tenant_id = '$TENANT_ID';
"
docker exec crm-postgres psql -U crm_user -d crm_db -t -c "
  SELECT '  Quotes:    ' || COUNT(*) FROM quotes WHERE tenant_id = '$TENANT_ID';
"
docker exec crm-postgres psql -U crm_user -d crm_db -t -c "
  SELECT '  Invoices:  ' || COUNT(*) FROM invoices WHERE tenant_id = '$TENANT_ID';
"
docker exec crm-postgres psql -U crm_user -d crm_db -t -c "
  SELECT '  Documents: ' || COUNT(*) FROM documents WHERE tenant_id = '$TENANT_ID';
"

echo ""
echo "🎯 INSIGHT BADGES (Should appear in frontend):"
docker exec crm-postgres psql -U crm_user -d crm_db -t -c "
  SELECT '  🔴 Overdue Tasks:    ' || COUNT(*) 
  FROM tasks 
  WHERE tenant_id = '$TENANT_ID' 
    AND due_date < CURRENT_DATE 
    AND status NOT IN ('COMPLETED');
"
docker exec crm-postgres psql -U crm_user -d crm_db -t -c "
  SELECT '  💰 Overdue Invoices: ' || COUNT(*) 
  FROM invoices 
  WHERE tenant_id = '$TENANT_ID' 
    AND due_date < CURRENT_DATE 
    AND status NOT IN ('PAID', 'CANCELLED');
"
docker exec crm-postgres psql -U crm_user -d crm_db -t -c "
  SELECT '  🔥 Hot Deals:        ' || COUNT(*) 
  FROM deals 
  WHERE tenant_id = '$TENANT_ID' 
    AND stage = 'NEGOTIATION';
"

echo ""
echo "=========================================="
echo "✅ Data successfully loaded!"
echo "🌐 Refresh your frontend to see badges"
echo "=========================================="
