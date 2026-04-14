-- V2: Create Performance Indexes

-- Users indexes
CREATE INDEX idx_users_email ON users(tenant_id, email);
CREATE INDEX idx_users_role ON users(tenant_id, role);
CREATE INDEX idx_users_active ON users(tenant_id, is_active) WHERE archived = false;

-- Leads indexes
CREATE INDEX idx_leads_status ON leads(tenant_id, status) WHERE archived = false;
CREATE INDEX idx_leads_score ON leads(tenant_id, score DESC) WHERE archived = false;
CREATE INDEX idx_leads_owner ON leads(tenant_id, owner_id) WHERE archived = false;
CREATE INDEX idx_leads_email ON leads(tenant_id, email);
CREATE INDEX idx_leads_company ON leads(tenant_id, company);
CREATE INDEX idx_leads_last_contact ON leads(tenant_id, last_contact_date DESC);
-- Full-text search on leads
CREATE INDEX idx_leads_fulltext ON leads USING gin(to_tsvector('english', 
    coalesce(first_name, '') || ' ' || 
    coalesce(last_name, '') || ' ' || 
    coalesce(company, '') || ' ' || 
    coalesce(email, '')
));

-- Companies indexes
CREATE INDEX idx_companies_name ON companies(tenant_id, name);
CREATE INDEX idx_companies_industry ON companies(tenant_id, industry) WHERE archived = false;
CREATE INDEX idx_companies_status ON companies(tenant_id, status) WHERE archived = false;
CREATE INDEX idx_companies_owner ON companies(tenant_id, owner_id) WHERE archived = false;
-- Full-text search on companies
CREATE INDEX idx_companies_fulltext ON companies USING gin(to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(industry, '') || ' ' ||
    coalesce(email, '')
));

-- Contacts indexes
CREATE INDEX idx_contacts_company ON contacts(tenant_id, company_id) WHERE archived = false;
CREATE INDEX idx_contacts_status ON contacts(tenant_id, status) WHERE archived = false;
CREATE INDEX idx_contacts_email ON contacts(tenant_id, email);
CREATE INDEX idx_contacts_last_contact ON contacts(tenant_id, last_contact_date DESC);
-- Full-text search on contacts
CREATE INDEX idx_contacts_fulltext ON contacts USING gin(to_tsvector('english',
    coalesce(first_name, '') || ' ' ||
    coalesce(last_name, '') || ' ' ||
    coalesce(email, '') || ' ' ||
    coalesce(title, '')
));

-- Deals indexes
CREATE INDEX idx_deals_company ON deals(tenant_id, company_id) WHERE archived = false;
CREATE INDEX idx_deals_contact ON deals(tenant_id, contact_id) WHERE archived = false;
CREATE INDEX idx_deals_stage ON deals(tenant_id, stage) WHERE archived = false;
CREATE INDEX idx_deals_owner ON deals(tenant_id, owner_id) WHERE archived = false;
CREATE INDEX idx_deals_value ON deals(tenant_id, value DESC) WHERE archived = false;
CREATE INDEX idx_deals_close_date ON deals(tenant_id, expected_close_date) WHERE archived = false;
CREATE INDEX idx_deals_probability ON deals(tenant_id, probability DESC) WHERE archived = false;

-- Products indexes
CREATE INDEX idx_products_sku ON products(tenant_id, sku);
CREATE INDEX idx_products_category ON products(tenant_id, category) WHERE archived = false;
CREATE INDEX idx_products_status ON products(tenant_id, status) WHERE archived = false;
CREATE INDEX idx_products_price ON products(tenant_id, price);

-- Tasks indexes
CREATE INDEX idx_tasks_assigned ON tasks(tenant_id, assigned_to) WHERE archived = false;
CREATE INDEX idx_tasks_status ON tasks(tenant_id, status) WHERE archived = false;
CREATE INDEX idx_tasks_priority ON tasks(tenant_id, priority) WHERE archived = false;
CREATE INDEX idx_tasks_due_date ON tasks(tenant_id, due_date) WHERE archived = false;
CREATE INDEX idx_tasks_related_entity ON tasks(tenant_id, related_entity_type, related_entity_id) WHERE archived = false;

-- Events indexes
CREATE INDEX idx_events_type ON events(tenant_id, event_type) WHERE archived = false;
CREATE INDEX idx_events_start ON events(tenant_id, start_date_time) WHERE archived = false;
CREATE INDEX idx_events_date_range ON events(tenant_id, start_date_time, end_date_time) WHERE archived = false;

-- Quotes indexes
CREATE INDEX idx_quotes_number ON quotes(tenant_id, quote_number);
CREATE INDEX idx_quotes_company ON quotes(tenant_id, company_id) WHERE archived = false;
CREATE INDEX idx_quotes_contact ON quotes(tenant_id, contact_id) WHERE archived = false;
CREATE INDEX idx_quotes_status ON quotes(tenant_id, status) WHERE archived = false;
CREATE INDEX idx_quotes_issue_date ON quotes(tenant_id, issue_date DESC);
CREATE INDEX idx_quotes_owner ON quotes(tenant_id, owner_id) WHERE archived = false;

-- Quote Line Items indexes
CREATE INDEX idx_quote_items_quote ON quote_line_items(quote_id);
CREATE INDEX idx_quote_items_product ON quote_line_items(product_id);

-- Invoices indexes
CREATE INDEX idx_invoices_number ON invoices(tenant_id, invoice_number);
CREATE INDEX idx_invoices_company ON invoices(tenant_id, company_id) WHERE archived = false;
CREATE INDEX idx_invoices_contact ON invoices(tenant_id, contact_id) WHERE archived = false;
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status) WHERE archived = false;
CREATE INDEX idx_invoices_due_date ON invoices(tenant_id, due_date) WHERE archived = false;
CREATE INDEX idx_invoices_payment_date ON invoices(tenant_id, payment_date);

-- Invoice Line Items indexes
CREATE INDEX idx_invoice_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON invoice_line_items(product_id);

-- Documents indexes
CREATE INDEX idx_documents_type ON documents(tenant_id, file_type) WHERE archived = false;
CREATE INDEX idx_documents_category ON documents(tenant_id, category) WHERE archived = false;
CREATE INDEX idx_documents_related_entity ON documents(tenant_id, related_entity_type, related_entity_id) WHERE archived = false;
CREATE INDEX idx_documents_uploaded_by ON documents(tenant_id, uploaded_by);
CREATE INDEX idx_documents_uploaded_at ON documents(tenant_id, uploaded_at DESC);

-- Emails indexes
CREATE INDEX idx_emails_folder ON emails(tenant_id, folder) WHERE archived = false;
CREATE INDEX idx_emails_sent ON emails(tenant_id, is_sent) WHERE archived = false;
CREATE INDEX idx_emails_draft ON emails(tenant_id, is_draft) WHERE archived = false;
CREATE INDEX idx_emails_sent_at ON emails(tenant_id, sent_at DESC);
-- Full-text search on emails
CREATE INDEX idx_emails_fulltext ON emails USING gin(to_tsvector('english',
    coalesce(subject, '') || ' ' ||
    coalesce(body, '')
));

-- Audit Logs indexes
CREATE INDEX idx_audit_logs_entity ON audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(tenant_id, user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(tenant_id, timestamp DESC);

-- Embeddings indexes (will add vector index in V3)
CREATE INDEX idx_embeddings_entity ON embeddings(tenant_id, entity_type, entity_id);
