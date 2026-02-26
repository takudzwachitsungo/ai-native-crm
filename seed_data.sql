-- CRM Sample Data Seed Script
-- Run this to populate your database with sample data

-- First, get your user ID (the one you just created)
-- Replace USER_ID_HERE with your actual user ID from: SELECT id FROM users WHERE email = 'john@example.com';

-- For this script, we'll use user_id = 1 (adjust if different)

-- ==================== COMPANIES ====================
INSERT INTO companies (name, industry, website, phone, email, address, city, state, country, postal_code, owner_id, status, annual_revenue, employee_count, notes, created_at, updated_at) VALUES
('TechCorp Solutions', 'Technology', 'https://techcorp.example.com', '+1-555-0101', 'contact@techcorp.example.com', '123 Tech Street', 'San Francisco', 'CA', 'USA', '94102', 1, 'ACTIVE', 5000000.00, 150, 'Leading software development company', NOW(), NOW()),
('Global Marketing Inc', 'Marketing', 'https://globalmarketing.example.com', '+1-555-0102', 'info@globalmarketing.example.com', '456 Market Ave', 'New York', 'NY', 'USA', '10001', 1, 'ACTIVE', 3000000.00, 75, 'Full-service marketing agency', NOW(), NOW()),
('Healthcare Partners LLC', 'Healthcare', 'https://healthcarepartners.example.com', '+1-555-0103', 'contact@healthcarepartners.example.com', '789 Medical Blvd', 'Boston', 'MA', 'USA', '02108', 1, 'ACTIVE', 10000000.00, 300, 'Healthcare consulting and services', NOW(), NOW()),
('Retail Innovations Co', 'Retail', 'https://retailinnovations.example.com', '+1-555-0104', 'hello@retailinnovations.example.com', '321 Commerce Dr', 'Chicago', 'IL', 'USA', '60601', 1, 'ACTIVE', 8000000.00, 200, 'Retail technology solutions', NOW(), NOW()),
('Finance Plus Group', 'Finance', 'https://financeplus.example.com', '+1-555-0105', 'support@financeplus.example.com', '654 Bank Street', 'Austin', 'TX', 'USA', '78701', 1, 'ACTIVE', 15000000.00, 450, 'Financial services and consulting', NOW(), NOW());

-- ==================== CONTACTS ====================
INSERT INTO contacts (first_name, last_name, email, phone, mobile, title, company_id, department, lead_source, owner_id, status, address, city, state, country, postal_code, notes, created_at, updated_at) VALUES
('Sarah', 'Johnson', 'sarah.johnson@techcorp.example.com', '+1-555-0111', '+1-555-0112', 'CTO', 1, 'Technology', 'Website', 1, 'ACTIVE', '123 Tech Street', 'San Francisco', 'CA', 'USA', '94102', 'Primary technical contact', NOW(), NOW()),
('Michael', 'Chen', 'michael.chen@techcorp.example.com', '+1-555-0113', '+1-555-0114', 'VP of Sales', 1, 'Sales', 'Referral', 1, 'ACTIVE', '123 Tech Street', 'San Francisco', 'CA', 'USA', '94102', 'Decision maker for sales', NOW(), NOW()),
('Emily', 'Rodriguez', 'emily.rodriguez@globalmarketing.example.com', '+1-555-0115', '+1-555-0116', 'Marketing Director', 2, 'Marketing', 'LinkedIn', 1, 'ACTIVE', '456 Market Ave', 'New York', 'NY', 'USA', '10001', 'Key stakeholder', NOW(), NOW()),
('David', 'Williams', 'david.williams@healthcarepartners.example.com', '+1-555-0117', '+1-555-0118', 'CEO', 3, 'Executive', 'Conference', 1, 'ACTIVE', '789 Medical Blvd', 'Boston', 'MA', 'USA', '02108', 'C-level decision maker', NOW(), NOW()),
('Lisa', 'Anderson', 'lisa.anderson@retailinnovations.example.com', '+1-555-0119', '+1-555-0120', 'Operations Manager', 4, 'Operations', 'Cold Call', 1, 'ACTIVE', '321 Commerce Dr', 'Chicago', 'IL', 'USA', '60601', 'Operations contact', NOW(), NOW()),
('James', 'Taylor', 'james.taylor@financeplus.example.com', '+1-555-0121', '+1-555-0122', 'CFO', 5, 'Finance', 'Partner', 1, 'ACTIVE', '654 Bank Street', 'Austin', 'TX', 'USA', '78701', 'Financial decision maker', NOW(), NOW());

-- ==================== LEADS ====================
INSERT INTO leads (first_name, last_name, email, phone, company, title, lead_source, owner_id, status, rating, industry, website, address, city, state, country, postal_code, estimated_value, notes, created_at, updated_at) VALUES
('Jennifer', 'Martinez', 'jennifer.martinez@startup.example.com', '+1-555-0201', 'StartupHub Inc', 'Founder', 'Website', 1, 'NEW', 'HOT', 'Technology', 'https://startuphub.example.com', '111 Startup Lane', 'Seattle', 'WA', 'USA', '98101', 50000.00, 'Interested in enterprise plan', NOW(), NOW()),
('Robert', 'Brown', 'robert.brown@consulting.example.com', '+1-555-0202', 'Brown Consulting', 'Managing Partner', 'Referral', 1, 'CONTACTED', 'WARM', 'Consulting', 'https://brownconsulting.example.com', '222 Business Rd', 'Denver', 'CO', 'USA', '80202', 75000.00, 'Follow up next week', NOW(), NOW()),
('Amanda', 'Garcia', 'amanda.garcia@ecommerce.example.com', '+1-555-0203', 'E-Shop Global', 'VP Marketing', 'LinkedIn', 1, 'QUALIFIED', 'HOT', 'E-commerce', 'https://eshopglobal.example.com', '333 Online Street', 'Miami', 'FL', 'USA', '33101', 100000.00, 'Ready for demo', NOW(), NOW()),
('Christopher', 'Lee', 'christopher.lee@manufacturing.example.com', '+1-555-0204', 'Lee Manufacturing', 'Operations Director', 'Trade Show', 1, 'NEW', 'WARM', 'Manufacturing', 'https://leemanufacturing.example.com', '444 Factory Blvd', 'Detroit', 'MI', 'USA', '48201', 60000.00, 'Met at industry conference', NOW(), NOW());

-- ==================== DEALS ====================
INSERT INTO deals (title, company_id, contact_id, amount, stage, probability, expected_close_date, owner_id, status, deal_type, lead_source, description, created_at, updated_at) VALUES
('TechCorp Enterprise License', 1, 1, 250000.00, 'NEGOTIATION', 75, '2026-02-15', 1, 'OPEN', 'NEW_BUSINESS', 'Website', 'Enterprise software license agreement', NOW(), NOW()),
('Global Marketing Annual Contract', 2, 3, 180000.00, 'PROPOSAL', 60, '2026-03-01', 1, 'OPEN', 'NEW_BUSINESS', 'LinkedIn', 'Annual marketing services contract', NOW(), NOW()),
('Healthcare Partners Integration', 3, 4, 500000.00, 'QUALIFICATION', 40, '2026-04-30', 1, 'OPEN', 'NEW_BUSINESS', 'Conference', 'Healthcare system integration project', NOW(), NOW()),
('Retail Innovations Platform', 4, 5, 350000.00, 'DISCOVERY', 30, '2026-05-15', 1, 'OPEN', 'NEW_BUSINESS', 'Cold Call', 'Retail platform implementation', NOW(), NOW()),
('Finance Plus Renewal', 5, 6, 200000.00, 'CLOSED_WON', 100, '2026-01-20', 1, 'WON', 'RENEWAL', 'Partner', 'Annual subscription renewal', NOW(), NOW());

-- ==================== PRODUCTS ====================
INSERT INTO products (name, sku, category, description, unit_price, cost, stock_quantity, status, supplier, specifications, created_at, updated_at) VALUES
('CRM Enterprise License', 'CRM-ENT-001', 'Software', 'Full-featured CRM system for enterprises', 50000.00, 10000.00, 999, 'ACTIVE', 'Internal', '{"users": "unlimited", "support": "24/7", "storage": "unlimited"}', NOW(), NOW()),
('CRM Professional License', 'CRM-PRO-001', 'Software', 'Professional CRM system for mid-size businesses', 25000.00, 5000.00, 999, 'ACTIVE', 'Internal', '{"users": "100", "support": "business hours", "storage": "1TB"}', NOW(), NOW()),
('Integration Services', 'SRV-INT-001', 'Service', 'Custom integration development services', 150.00, 75.00, 999, 'ACTIVE', 'Internal', '{"billing": "hourly", "minimum": "40 hours"}', NOW(), NOW()),
('Training Package', 'TRN-BAS-001', 'Training', 'Basic CRM training for up to 20 users', 5000.00, 1000.00, 999, 'ACTIVE', 'Internal', '{"duration": "2 days", "location": "onsite or virtual"}', NOW(), NOW()),
('Support Plan Premium', 'SUP-PRM-001', 'Support', 'Premium support with 24/7 availability', 10000.00, 2000.00, 999, 'ACTIVE', 'Internal', '{"response": "1 hour", "availability": "24/7/365"}', NOW(), NOW());

-- ==================== TASKS ====================
INSERT INTO tasks (title, description, due_date, priority, status, assigned_to, related_to_type, related_to_id, task_type, created_at, updated_at) VALUES
('Follow up on TechCorp proposal', 'Send follow-up email regarding enterprise license proposal', '2026-01-25', 'HIGH', 'PENDING', 1, 'DEAL', 1, 'FOLLOW_UP', NOW(), NOW()),
('Schedule demo for Global Marketing', 'Arrange product demonstration with marketing team', '2026-01-23', 'HIGH', 'IN_PROGRESS', 1, 'DEAL', 2, 'CALL', NOW(), NOW()),
('Prepare contract for Healthcare Partners', 'Draft integration services contract', '2026-01-28', 'MEDIUM', 'PENDING', 1, 'DEAL', 3, 'TASK', NOW(), NOW()),
('Contact Jennifer Martinez', 'Initial contact call with new lead', '2026-01-22', 'HIGH', 'PENDING', 1, 'LEAD', 1, 'CALL', NOW(), NOW()),
('Send proposal to Retail Innovations', 'Create and send detailed proposal document', '2026-01-30', 'MEDIUM', 'PENDING', 1, 'DEAL', 4, 'EMAIL', NOW(), NOW());

-- ==================== QUOTES ====================
INSERT INTO quotes (quote_number, company_id, contact_id, total_amount, status, valid_until, owner_id, notes, terms_conditions, created_at, updated_at) VALUES
('Q-2026-001', 1, 1, 275000.00, 'SENT', '2026-02-28', 1, 'Enterprise package with training', 'Payment terms: Net 30. Valid for 45 days.', NOW(), NOW()),
('Q-2026-002', 2, 3, 195000.00, 'DRAFT', '2026-03-31', 1, 'Annual marketing services', 'Payment terms: Net 30. Valid for 60 days.', NOW(), NOW()),
('Q-2026-003', 5, 6, 200000.00, 'ACCEPTED', '2026-01-31', 1, 'Renewal quote', 'Payment terms: Net 30. Valid for 30 days.', NOW(), NOW());

-- ==================== QUOTE LINE ITEMS ====================
INSERT INTO quote_line_items (quote_id, product_id, quantity, unit_price, discount, tax, line_total, description) VALUES
(1, 1, 1, 250000.00, 0, 0, 250000.00, 'CRM Enterprise License'),
(1, 4, 1, 5000.00, 0, 0, 5000.00, 'Training Package'),
(1, 5, 2, 10000.00, 0, 0, 20000.00, 'Support Plan Premium (2 years)'),
(2, 2, 1, 180000.00, 0, 0, 180000.00, 'CRM Professional License'),
(2, 3, 100, 150.00, 0, 0, 15000.00, 'Integration Services (100 hours)'),
(3, 1, 1, 200000.00, 0, 0, 200000.00, 'CRM Enterprise License Renewal');

-- ==================== INVOICES ====================
INSERT INTO invoices (invoice_number, company_id, contact_id, total_amount, status, due_date, paid_date, owner_id, notes, payment_terms, created_at, updated_at) VALUES
('INV-2026-001', 5, 6, 200000.00, 'PAID', '2026-02-19', '2026-01-21', 1, 'Annual renewal - paid on time', 'Net 30', NOW(), NOW()),
('INV-2026-002', 1, 1, 137500.00, 'SENT', '2026-02-20', NULL, 1, 'First installment - 50% upfront', 'Net 30', NOW(), NOW());

-- ==================== INVOICE LINE ITEMS ====================
INSERT INTO invoice_line_items (invoice_id, product_id, quantity, unit_price, discount, tax, line_total, description) VALUES
(1, 1, 1, 200000.00, 0, 0, 200000.00, 'CRM Enterprise License Renewal'),
(2, 1, 1, 125000.00, 0, 0, 125000.00, 'CRM Enterprise License (50% deposit)'),
(2, 4, 1, 2500.00, 0, 0, 2500.00, 'Training Package (50% deposit)'),
(2, 5, 2, 5000.00, 0, 0, 10000.00, 'Support Plan Premium (50% deposit)');

-- ==================== CALENDAR EVENTS ====================
INSERT INTO calendar_events (title, description, start_time, end_time, location, event_type, status, organizer_id, is_all_day, reminder_minutes, created_at, updated_at) VALUES
('TechCorp Proposal Presentation', 'Present enterprise license proposal to TechCorp leadership', '2026-01-27 14:00:00', '2026-01-27 15:30:00', 'TechCorp HQ, Conference Room A', 'MEETING', 'SCHEDULED', 1, false, 30, NOW(), NOW()),
('Global Marketing Demo', 'Product demonstration for marketing team', '2026-01-24 10:00:00', '2026-01-24 11:30:00', 'Virtual - Zoom', 'DEMO', 'SCHEDULED', 1, false, 15, NOW(), NOW()),
('Healthcare Partners Discovery Call', 'Initial discovery call to understand requirements', '2026-01-29 15:00:00', '2026-01-29 16:00:00', 'Virtual - Teams', 'CALL', 'SCHEDULED', 1, false, 15, NOW(), NOW()),
('Team Sales Review', 'Weekly sales pipeline review meeting', '2026-01-23 09:00:00', '2026-01-23 10:00:00', 'Office - Meeting Room 1', 'MEETING', 'SCHEDULED', 1, false, 10, NOW(), NOW());

-- Done! 
-- Summary:
-- - 5 Companies
-- - 6 Contacts
-- - 4 Leads
-- - 5 Deals (4 open, 1 won)
-- - 5 Products
-- - 5 Tasks
-- - 3 Quotes with line items
-- - 2 Invoices with line items
-- - 4 Calendar Events
