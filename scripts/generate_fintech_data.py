"""
Fintech Data Generator for CRM Database
Generates realistic financial services data directly into PostgreSQL

Focus: Investment firms, portfolios, compliance, financial products
Database: Direct PostgreSQL insert (bypasses REST API)
User: john@example.com (tenant_id: 2779be28-889e-45eb-816b-98e9407dca9c)
"""

import psycopg2
import uuid
from datetime import datetime, timedelta, date
from decimal import Decimal
import random

# Database Configuration - Using 127.0.0.1 to connect via Docker port mapping
DB_CONFIG = {
    'host': '127.0.0.1',  # Use 127.0.0.1 instead of localhost
    'port': 5432,
    'database': 'crm_db',
    'user': 'crm_user',
    'password': 'crm_pass'
}

# User Configuration
USER_EMAIL = 'john@example.com'
TENANT_ID = '2779be28-889e-45eb-816b-98e9407dca9c'  # Boyd Velazquez Inc
USER_ID = 'ccf4c725-f18b-4621-ace1-cb2a29ba5936'

# Generation Parameters
NUM_COMPANIES = 50
NUM_CONTACTS_PER_COMPANY = 3
NUM_LEADS = 30
NUM_DEALS_PER_COMPANY = 2
NUM_PRODUCTS = 40
NUM_TASKS = 60
NUM_EVENTS = 40
NUM_QUOTES = 20
NUM_INVOICES = 25
NUM_DOCUMENTS = 35

# Fintech Company Names & Industries
FINTECH_COMPANIES = [
    "Apex Capital Management", "Meridian Investment Group", "Pinnacle Wealth Advisors",
    "Sterling Asset Management", "Quantum Hedge Fund", "Vanguard Portfolio Services",
    "BlackRock Financial Group", "Goldman Private Equity", "Morgan Capital Partners",
    "Fidelity Investment Trust", "Wellington Asset Advisors", "Bridgewater Capital",
    "Renaissance Technologies", "Two Sigma Investments", "Citadel Securities",
    "Point72 Asset Management", "Tiger Global Management", "Sequoia Capital Partners",
    "Andreessen Horowitz Fund", "Kleiner Perkins Capital", "Accel Partners Investment",
    "Benchmark Capital Group", "Greylock Partners Fund", "First Round Capital",
    "Union Square Ventures", "NEA Investment Partners", "Insight Partners Capital",
    "Bessemer Venture Partners", "Lightspeed Venture Partners", "Index Ventures Fund",
    "General Catalyst Partners", "Founders Fund Capital", "Thrive Capital Group",
    "Spark Capital Ventures", "Battery Ventures Fund", "Norwest Venture Partners",
    "Summit Partners Capital", "TA Associates Management", "Warburg Pincus Capital",
    "KKR Investment Fund", "Carlyle Group Partners", "Blackstone Capital Management",
    "Apollo Global Management", "TPG Capital Partners", "Bain Capital Ventures",
    "Silver Lake Partners", "Vista Equity Partners", "Insight Partners Fund",
    "Thoma Bravo Capital", "Francisco Partners"
]

FIRST_NAMES = [
    "James", "Michael", "Robert", "John", "David", "William", "Richard", "Joseph",
    "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica",
    "Thomas", "Charles", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald",
    "Sarah", "Karen", "Nancy", "Lisa", "Betty", "Margaret", "Sandra", "Ashley",
    "Paul", "Andrew", "Joshua", "Kenneth", "Kevin", "Brian", "George", "Timothy",
    "Emily", "Donna", "Carol", "Michelle", "Laura", "Rebecca", "Sharon", "Cynthia"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
    "Taylor", "Moore", "Jackson", "Martin", "Lee", "Walker", "Hall", "Allen",
    "Young", "King", "Wright", "Scott", "Green", "Baker", "Adams", "Nelson",
    "Carter", "Mitchell", "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans",
    "Edwards", "Collins", "Stewart", "Sanchez", "Morris", "Rogers", "Reed", "Cook"
]

TITLES = [
    "Managing Director", "Portfolio Manager", "Senior Analyst", "Investment Director",
    "Chief Investment Officer", "VP of Investments", "Fund Manager", "Wealth Advisor",
    "Financial Analyst", "Research Director", "Head of Trading", "Risk Manager",
    "Compliance Officer", "Operations Manager", "Client Services Director", "Partner"
]

FINANCIAL_PRODUCTS = [
    ("Equity Fund", "Investment fund focusing on publicly traded stocks"),
    ("Fixed Income Fund", "Bond-focused investment portfolio"),
    ("Hedge Fund Strategy", "Alternative investment using advanced strategies"),
    ("Private Equity Fund", "Investment in private companies"),
    ("Real Estate Investment Trust", "REIT focusing on commercial properties"),
    ("Venture Capital Fund", "Early-stage startup investment fund"),
    ("Commodity Trading Strategy", "Managed futures and commodities"),
    ("Multi-Strategy Fund", "Diversified investment approach"),
    ("Growth Equity Fund", "Late-stage growth company investments"),
    ("Credit Opportunities Fund", "Distressed debt and credit investments"),
    ("Infrastructure Fund", "Long-term infrastructure investments"),
    ("Impact Investment Fund", "ESG-focused investment strategy"),
    ("Quantitative Trading Strategy", "Algorithm-driven trading approach"),
    ("Emerging Markets Fund", "Developing markets investment focus"),
    ("Small Cap Value Fund", "Small capitalization value stocks"),
    ("Large Cap Growth Fund", "Large company growth investments"),
    ("Dividend Income Strategy", "High dividend-yielding securities"),
    ("Convertible Bond Fund", "Convertible securities portfolio"),
    ("Merger Arbitrage Strategy", "M&A event-driven investments"),
    ("Long/Short Equity Fund", "Market-neutral equity strategy")
]

def generate_uuid():
    """Generate a random UUID"""
    return str(uuid.uuid4())

def generate_timestamp():
    """Generate a random timestamp in the past 6 months"""
    days_ago = random.randint(1, 180)
    return datetime.now() - timedelta(days=days_ago)

def generate_future_date(days_ahead_min=1, days_ahead_max=90):
    """Generate a future date"""
    days = random.randint(days_ahead_min, days_ahead_max)
    return date.today() + timedelta(days=days)

def generate_past_date(days_ago_min=1, days_ago_max=180):
    """Generate a past date"""
    days = random.randint(days_ago_min, days_ago_max)
    return date.today() - timedelta(days=days)

def generate_companies(cursor, num_companies):
    """Generate fintech companies"""
    print(f"Generating {num_companies} fintech companies...")
    companies = []
    
    for i in range(num_companies):
        company_id = generate_uuid()
        name = FINTECH_COMPANIES[i % len(FINTECH_COMPANIES)]
        if i >= len(FINTECH_COMPANIES):
            name = f"{name} {i // len(FINTECH_COMPANIES) + 1}"
        
        email = f"info@{name.lower().replace(' ', '')}.com"
        website = f"https://www.{name.lower().replace(' ', '')}.com"
        phone = f"+1-{random.randint(200, 999)}-{random.randint(200, 999)}-{random.randint(1000, 9999)}"
        revenue = Decimal(random.randint(1000000, 500000000))
        employee_count = random.randint(10, 5000)
        status = random.choice(['ACTIVE', 'ACTIVE', 'ACTIVE', 'PROSPECT'])
        created_at = generate_timestamp()
        
        cursor.execute("""
            INSERT INTO companies (
                id, tenant_id, name, email, website, phone, industry,
                revenue, employee_count, status, address, city, state,
                postal_code, country, created_at, updated_at, archived,
                owner_id
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s
            )
        """, (
            company_id, TENANT_ID, name, email, website, phone, 'FINANCE',
            revenue, employee_count, status,
            f"{random.randint(100, 9999)} Wall Street",
            random.choice(['New York', 'Boston', 'Chicago', 'San Francisco']),
            random.choice(['NY', 'MA', 'IL', 'CA']),
            f"{random.randint(10000, 99999)}",
            'USA',
            created_at, created_at, False, USER_ID
        ))
        
        companies.append({
            'id': company_id,
            'name': name,
            'created_at': created_at
        })
    
    print(f"✓ Created {len(companies)} companies")
    return companies

def generate_contacts(cursor, companies, contacts_per_company):
    """Generate contacts for each company"""
    print(f"Generating {len(companies) * contacts_per_company} contacts...")
    contacts = []
    
    for company in companies:
        for _ in range(contacts_per_company):
            contact_id = generate_uuid()
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            email = f"{first_name.lower()}.{last_name.lower()}@{company['name'].lower().replace(' ', '')}.com"
            phone = f"+1-{random.randint(200, 999)}-{random.randint(200, 999)}-{random.randint(1000, 9999)}"
            mobile = f"+1-{random.randint(200, 999)}-{random.randint(200, 999)}-{random.randint(1000, 9999)}"
            title = random.choice(TITLES)
            status = random.choice(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE'])
            created_at = company['created_at'] + timedelta(days=random.randint(1, 30))
            
            cursor.execute("""
                INSERT INTO contacts (
                    id, tenant_id, company_id, first_name, last_name, email,
                    phone, mobile, title, status, created_at, updated_at, archived
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                contact_id, TENANT_ID, company['id'], first_name, last_name,
                email, phone, mobile, title, status, created_at, created_at, False
            ))
            
            contacts.append({
                'id': contact_id,
                'company_id': company['id'],
                'name': f"{first_name} {last_name}"
            })
    
    print(f"✓ Created {len(contacts)} contacts")
    return contacts

def generate_leads(cursor, num_leads):
    """Generate leads"""
    print(f"Generating {num_leads} leads...")
    leads = []
    
    for _ in range(num_leads):
        lead_id = generate_uuid()
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        company = random.choice(FINTECH_COMPANIES)
        email = f"{first_name.lower()}.{last_name.lower()}@{company.lower().replace(' ', '')}.com"
        phone = f"+1-{random.randint(200, 999)}-{random.randint(200, 999)}-{random.randint(1000, 9999)}"
        title = random.choice(TITLES)
        status = random.choice(['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED'])
        score = random.randint(0, 100)
        estimated_value = Decimal(random.randint(50000, 5000000))
        created_at = generate_timestamp()
        
        cursor.execute("""
            INSERT INTO leads (
                id, tenant_id, first_name, last_name, email, phone, company,
                title, status, score, estimated_value, created_at, updated_at,
                archived, owner_id
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            lead_id, TENANT_ID, first_name, last_name, email, phone, company,
            title, status, score, estimated_value, created_at, created_at,
            False, USER_ID
        ))
        
        leads.append({'id': lead_id, 'name': f"{first_name} {last_name}"})
    
    print(f"✓ Created {len(leads)} leads")
    return leads

def generate_deals(cursor, companies, contacts, deals_per_company):
    """Generate deals (investment opportunities)"""
    print(f"Generating {len(companies) * deals_per_company} deals...")
    deals = []
    
    deal_names = [
        "Series A Funding Round", "Growth Investment Opportunity", "Strategic Partnership Deal",
        "Portfolio Acquisition", "Merger & Acquisition", "Convertible Note Financing",
        "Debt Restructuring", "Real Estate Investment", "Infrastructure Project",
        "Technology Platform Investment", "Healthcare Fund Allocation", "Energy Sector Deal"
    ]
    
    for company in companies:
        company_contacts = [c for c in contacts if c['company_id'] == company['id']]
        
        for _ in range(deals_per_company):
            deal_id = generate_uuid()
            name = random.choice(deal_names)
            value = Decimal(random.randint(500000, 50000000))
            stage = random.choice(['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'])
            probability = random.randint(10, 95)
            contact = random.choice(company_contacts) if company_contacts else None
            expected_close = generate_future_date(30, 180)
            created_at = company['created_at'] + timedelta(days=random.randint(5, 60))
            
            cursor.execute("""
                INSERT INTO deals (
                    id, tenant_id, name, company_id, contact_id, value, stage,
                    probability, expected_close_date, created_at, updated_at,
                    archived, owner_id
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                deal_id, TENANT_ID, name, company['id'],
                contact['id'] if contact else None,
                value, stage, probability, expected_close,
                created_at, created_at, False, USER_ID
            ))
            
            deals.append({
                'id': deal_id,
                'name': name,
                'company_id': company['id'],
                'value': value
            })
    
    print(f"✓ Created {len(deals)} deals")
    return deals

def generate_products(cursor, num_products):
    """Generate financial products"""
    print(f"Generating {num_products} financial products...")
    products = []
    
    for i in range(num_products):
        product_id = generate_uuid()
        name, description = FINANCIAL_PRODUCTS[i % len(FINANCIAL_PRODUCTS)]
        if i >= len(FINANCIAL_PRODUCTS):
            name = f"{name} Series {i // len(FINANCIAL_PRODUCTS) + 1}"
        
        sku = f"FP-{random.randint(1000, 9999)}-{random.randint(100, 999)}"
        category = random.choice(['SERVICES', 'SUBSCRIPTIONS', 'SOFTWARE'])
        price = Decimal(random.randint(10000, 500000))
        cost = price * Decimal(random.uniform(0.4, 0.7))
        status = random.choice(['ACTIVE', 'ACTIVE', 'ACTIVE', 'DRAFT'])
        created_at = generate_timestamp()
        
        cursor.execute("""
            INSERT INTO products (
                id, tenant_id, name, sku, category, description, price, cost,
                status, stock_quantity, created_at, updated_at, archived
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            product_id, TENANT_ID, name, sku, category, description, price,
            cost, status, 1, created_at, created_at, False
        ))
        
        products.append({
            'id': product_id,
            'name': name,
            'price': price,
            'sku': sku
        })
    
    print(f"✓ Created {len(products)} products")
    return products

def generate_tasks(cursor, companies, num_tasks):
    """Generate tasks with some overdue"""
    print(f"Generating {num_tasks} tasks...")
    tasks = []
    
    task_titles = [
        "Review compliance documentation",
        "Prepare quarterly investor report",
        "Schedule portfolio review meeting",
        "Complete due diligence checklist",
        "Follow up on investment proposal",
        "Update risk assessment",
        "Review fund performance metrics",
        "Prepare regulatory filing",
        "Client onboarding documentation",
        "Market analysis report",
        "Investment committee presentation",
        "AML/KYC verification",
        "Contract negotiation follow-up",
        "Financial model validation",
        "Prepare term sheet"
    ]
    
    # Create some overdue tasks
    num_overdue = num_tasks // 3
    
    for i in range(num_tasks):
        task_id = generate_uuid()
        title = random.choice(task_titles)
        company = random.choice(companies) if random.random() > 0.3 else None
        priority = random.choice(['LOW', 'MEDIUM', 'HIGH', 'HIGH'])
        
        if i < num_overdue:
            # Overdue tasks
            status = random.choice(['TODO', 'IN_PROGRESS'])
            due_date = generate_past_date(1, 30)
        else:
            status = random.choice(['TODO', 'IN_PROGRESS', 'COMPLETED'])
            if status == 'COMPLETED':
                due_date = generate_past_date(1, 60)
            else:
                due_date = generate_future_date(1, 60)
        
        created_at = generate_timestamp()
        
        cursor.execute("""
            INSERT INTO tasks (
                id, tenant_id, title, due_date, priority, status,
                related_entity_id, related_entity_type, assigned_to,
                created_at, updated_at, archived
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            task_id, TENANT_ID, title, due_date, priority, status,
            company['id'] if company else None,
            'COMPANY' if company else None,
            USER_ID, created_at, created_at, False
        ))
        
        tasks.append({'id': task_id, 'title': title, 'due_date': due_date})
    
    print(f"✓ Created {len(tasks)} tasks ({num_overdue} overdue)")
    return tasks

def generate_events(cursor, companies, contacts, num_events):
    """Generate calendar events"""
    print(f"Generating {num_events} events...")
    events = []
    
    event_titles = [
        "Investment Committee Meeting",
        "Portfolio Review Call",
        "Client Presentation",
        "Due Diligence Session",
        "Quarterly Board Meeting",
        "Strategy Planning Meeting",
        "Investor Relations Call",
        "Risk Committee Meeting",
        "Fund Performance Review",
        "Compliance Training"
    ]
    
    for _ in range(num_events):
        event_id = generate_uuid()
        title = random.choice(event_titles)
        event_type = random.choice(['MEETING', 'CALL', 'PRESENTATION', 'INTERNAL'])
        
        # Mix of past and future events
        if random.random() > 0.3:
            days_offset = random.randint(1, 90)
            start_time = datetime.now() + timedelta(days=days_offset, hours=random.randint(9, 16))
        else:
            days_offset = random.randint(1, 60)
            start_time = datetime.now() - timedelta(days=days_offset, hours=random.randint(9, 16))
        
        end_time = start_time + timedelta(hours=random.choice([1, 2]))
        created_at = start_time - timedelta(days=random.randint(1, 7))
        
        cursor.execute("""
            INSERT INTO events (
                id, tenant_id, title, event_type, start_date_time, end_date_time,
                location, created_at, updated_at, archived
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            event_id, TENANT_ID, title, event_type, start_time, end_time,
            random.choice(['Conference Room A', 'Zoom', 'Office', 'Client Site']),
            created_at, created_at, False
        ))
        
        events.append({'id': event_id, 'title': title})
    
    print(f"✓ Created {len(events)} events")
    return events

def generate_quotes(cursor, companies, contacts, products, num_quotes):
    """Generate quotes with line items"""
    print(f"Generating {num_quotes} quotes...")
    quotes = []
    
    for i in range(num_quotes):
        quote_id = generate_uuid()
        quote_number = f"QT-{date.today().year}-{str(i+1).zfill(4)}"
        company = random.choice(companies)
        company_contacts = [c for c in contacts if c['company_id'] == company['id']]
        contact = random.choice(company_contacts) if company_contacts else None
        
        issue_date = generate_past_date(1, 60)
        valid_until = issue_date + timedelta(days=30)
        status = random.choice(['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED'])
        
        # Calculate subtotal from line items first
        num_items = random.randint(1, 5)
        selected_products = random.sample(products, min(num_items, len(products)))
        
        subtotal = Decimal(0)
        for product in selected_products:
            quantity = random.randint(1, 10)
            unit_price = product['price']
            total = unit_price * quantity
            subtotal += total
        
        tax = subtotal * Decimal('0.08')
        total = subtotal + tax
        created_at = issue_date
        
        # Insert quote first
        cursor.execute("""
            INSERT INTO quotes (
                id, tenant_id, quote_number, company_id, contact_id,
                issue_date, expiry_date, status, subtotal, discount, total,
                created_at, updated_at, archived, owner_id
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            quote_id, TENANT_ID, quote_number, company['id'],
            contact['id'] if contact else None,
            issue_date, valid_until, status, subtotal, Decimal(0), total,
            created_at, created_at, False, USER_ID
        ))
        
        # Then insert line items
        for product in selected_products:
            line_item_id = generate_uuid()
            quantity = random.randint(1, 10)
            unit_price = product['price']
            item_total = unit_price * quantity
            
            cursor.execute("""
                INSERT INTO quote_line_items (
                    id, quote_id, product_id, description, quantity,
                    unit_price, total
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                line_item_id, quote_id, product['id'], product['name'],
                quantity, unit_price, item_total
            ))
        
        quotes.append({'id': quote_id, 'number': quote_number, 'company_id': company['id']})
    
    print(f"✓ Created {len(quotes)} quotes")
    return quotes

def generate_invoices(cursor, companies, contacts, products, num_invoices):
    """Generate invoices with line items (some overdue)"""
    print(f"Generating {num_invoices} invoices...")
    invoices = []
    
    # Create some overdue invoices
    num_overdue = num_invoices // 4
    
    for i in range(num_invoices):
        invoice_id = generate_uuid()
        invoice_number = f"INV-{date.today().year}-{str(i+1).zfill(4)}"
        company = random.choice(companies)
        company_contacts = [c for c in contacts if c['company_id'] == company['id']]
        contact = random.choice(company_contacts) if company_contacts else None
        
        if i < num_overdue:
            # Overdue invoices
            issue_date = generate_past_date(60, 120)
            due_date = issue_date + timedelta(days=30)
            status = random.choice(['SENT', 'PENDING', 'OVERDUE'])
        else:
            issue_date = generate_past_date(1, 60)
            due_date = issue_date + timedelta(days=30)
            status = random.choice(['DRAFT', 'SENT', 'PAID', 'PENDING'])
        
        # Calculate subtotal from line items first
        num_items = random.randint(1, 5)
        selected_products = random.sample(products, min(num_items, len(products)))
        
        subtotal = Decimal(0)
        for product in selected_products:
            quantity = random.randint(1, 10)
            unit_price = product['price']
            item_total = unit_price * quantity
            subtotal += item_total
        
        tax = subtotal * Decimal('0.08')
        total = subtotal + tax
        amount_paid = total if status == 'PAID' else Decimal(0)
        payment_date = due_date + timedelta(days=random.randint(-5, 5)) if status == 'PAID' else None
        created_at = issue_date
        
        # Insert invoice first
        cursor.execute("""
            INSERT INTO invoices (
                id, tenant_id, invoice_number, company_id, contact_id,
                issue_date, due_date, payment_date, status, subtotal, tax,
                total, amount_paid, created_at, updated_at, archived
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            invoice_id, TENANT_ID, invoice_number, company['id'],
            contact['id'] if contact else None,
            issue_date, due_date, payment_date, status, subtotal, tax,
            total, amount_paid, created_at, created_at, False
        ))
        
        # Then insert line items
        for product in selected_products:
            line_item_id = generate_uuid()
            quantity = random.randint(1, 10)
            unit_price = product['price']
            item_total = unit_price * quantity
            
            cursor.execute("""
                INSERT INTO invoice_line_items (
                    id, invoice_id, product_id, description, quantity,
                    unit_price, total
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                line_item_id, invoice_id, product['id'], product['name'],
                quantity, unit_price, item_total
            ))
        
        invoices.append({
            'id': invoice_id,
            'number': invoice_number,
            'company_id': company['id'],
            'status': status
        })
    
    print(f"✓ Created {len(invoices)} invoices ({num_overdue} overdue)")
    return invoices

def generate_documents(cursor, companies, deals, num_documents):
    """Generate compliance and financial documents"""
    print(f"Generating {num_documents} documents...")
    documents = []
    
    doc_templates = [
        ("Investment Proposal", "PROPOSALS"),
        ("Fund Agreement", "CONTRACTS"),
        ("Due Diligence Report", "REPORTS"),
        ("Compliance Checklist", "REPORTS"),
        ("Term Sheet", "CONTRACTS"),
        ("Investor Presentation", "PRESENTATIONS"),
        ("Financial Statements", "REPORTS"),
        ("Risk Assessment", "REPORTS"),
        ("Subscription Agreement", "CONTRACTS"),
        ("Marketing Materials", "MARKETING"),
        ("Regulatory Filing", "REPORTS"),
        ("Portfolio Analysis", "REPORTS")
    ]
    
    for i in range(num_documents):
        document_id = generate_uuid()
        doc_name, category = random.choice(doc_templates)
        
        # Link to company or deal
        if random.random() > 0.5 and companies:
            related = random.choice(companies)
            related_type = 'COMPANY'
            related_id = related['id']
        elif deals:
            related = random.choice(deals)
            related_type = 'DEAL'
            related_id = related['id']
        else:
            related_type = None
            related_id = None
        
        file_name = f"{doc_name.replace(' ', '_')}_{i+1}.pdf"
        file_path = f"/documents/{date.today().year}/{file_name}"
        file_size = random.randint(100000, 5000000)
        uploaded_at = generate_timestamp()
        
        cursor.execute("""
            INSERT INTO documents (
                id, tenant_id, name, file_path, file_type, file_size,
                category, related_entity_id, related_entity_type,
                uploaded_at, created_at, updated_at, archived, uploaded_by
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            document_id, TENANT_ID, doc_name, file_path, 'application/pdf',
            str(file_size), category, related_id, related_type,
            uploaded_at, uploaded_at, uploaded_at, False, USER_ID
        ))
        
        documents.append({'id': document_id, 'name': doc_name})
    
    print(f"✓ Created {len(documents)} documents")
    return documents

def main():
    """Main execution function"""
    print("\n" + "="*60)
    print("🏦 FINTECH CRM DATA GENERATOR")
    print("="*60)
    print(f"Database: {DB_CONFIG['database']}")
    print(f"User: {USER_EMAIL}")
    print(f"Tenant: {TENANT_ID}")
    print("="*60 + "\n")
    
    conn = None
    cursor = None
    
    try:
        # Connect to database
        print("Connecting to PostgreSQL...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✓ Connected to database\n")
        
        # Generate data in correct order (respecting foreign keys)
        companies = generate_companies(cursor, NUM_COMPANIES)
        contacts = generate_contacts(cursor, companies, NUM_CONTACTS_PER_COMPANY)
        leads = generate_leads(cursor, NUM_LEADS)
        deals = generate_deals(cursor, companies, contacts, NUM_DEALS_PER_COMPANY)
        products = generate_products(cursor, NUM_PRODUCTS)
        tasks = generate_tasks(cursor, companies, NUM_TASKS)
        events = generate_events(cursor, companies, contacts, NUM_EVENTS)
        quotes = generate_quotes(cursor, companies, contacts, products, NUM_QUOTES)
        invoices = generate_invoices(cursor, companies, contacts, products, NUM_INVOICES)
        documents = generate_documents(cursor, companies, deals, NUM_DOCUMENTS)
        
        # Commit transaction
        conn.commit()
        
        print("\n" + "="*60)
        print("✅ DATA GENERATION COMPLETE")
        print("="*60)
        print(f"Companies:     {len(companies)}")
        print(f"Contacts:      {len(contacts)}")
        print(f"Leads:         {len(leads)}")
        print(f"Deals:         {len(deals)}")
        print(f"Products:      {len(products)}")
        print(f"Tasks:         {len(tasks)} (includes overdue)")
        print(f"Events:        {len(events)}")
        print(f"Quotes:        {len(quotes)}")
        print(f"Invoices:      {len(invoices)} (includes overdue)")
        print(f"Documents:     {len(documents)}")
        print("="*60)
        print("\n✨ All data successfully inserted into database!")
        print("🎯 Frontend should now show insight badges for overdue items\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
