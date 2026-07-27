-- CRM Database Schema - PostgreSQL 16

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================
-- 1. ORGANIZATIONS (Tenants)
-- ============================================================
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    domain          VARCHAR(255),
    logo_url        TEXT,
    industry        VARCHAR(100),
    size            VARCHAR(50) CHECK (size IN ('1-10','11-50','51-200','201-500','501-1000','1000+')),
    timezone        VARCHAR(50) NOT NULL DEFAULT 'UTC',
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    website         TEXT,
    phone           VARCHAR(50),
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    postal_code     VARCHAR(20),
    country         VARCHAR(100),
    plan            VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (plan IN ('free','starter','professional','enterprise')),
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_domain ON organizations(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at);

-- ============================================================
-- 2. ROLES
-- ============================================================
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_system       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_roles_org_name UNIQUE (organization_id, name)
);
CREATE INDEX idx_roles_organization_id ON roles(organization_id);

-- ============================================================
-- 3. PERMISSIONS
-- ============================================================
CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource    VARCHAR(50) NOT NULL,
    action      VARCHAR(50) NOT NULL,
    description TEXT,
    CONSTRAINT uq_permissions_resource_action UNIQUE (resource, action)
);

-- ============================================================
-- 4. ROLE_PERMISSIONS
-- ============================================================
CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    scope         VARCHAR(20) NOT NULL DEFAULT 'own' CHECK (scope IN ('own','team','org','all')),
    PRIMARY KEY (role_id, permission_id)
);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ============================================================
-- 5. USERS
-- ============================================================
CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email                   VARCHAR(255) NOT NULL,
    password_hash           VARCHAR(255),
    first_name              VARCHAR(100) NOT NULL,
    last_name               VARCHAR(100) NOT NULL,
    avatar_url              TEXT,
    phone                   VARCHAR(50),
    job_title               VARCHAR(100),
    department              VARCHAR(100),
    is_active               BOOLEAN NOT NULL DEFAULT true,
    is_owner                BOOLEAN NOT NULL DEFAULT false,
    email_verified          BOOLEAN NOT NULL DEFAULT false,
    last_login_at           TIMESTAMPTZ,
    timezone                VARCHAR(50),
    locale                  VARCHAR(10) DEFAULT 'en',
    preferences             JSONB NOT NULL DEFAULT '{}',
    failed_login_attempts   INT NOT NULL DEFAULT 0,
    locked_until            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ,
    CONSTRAINT uq_users_org_email UNIQUE (organization_id, email)
);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(organization_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- ============================================================
-- 6. USER_ROLES
-- ============================================================
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- ============================================================
-- 7. SESSIONS
-- ============================================================
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token   VARCHAR(500) NOT NULL UNIQUE,
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);

-- ============================================================
-- 8. PASSWORD_RESET_TOKENS
-- ============================================================
CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(500) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);

-- ============================================================
-- 9. EMAIL_VERIFICATION_TOKENS
-- ============================================================
CREATE TABLE email_verification_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(500) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);

-- ============================================================
-- 10. LEAD_SOURCES
-- ============================================================
CREATE TABLE lead_sources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    icon            VARCHAR(50),
    color           VARCHAR(7),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_lead_sources_org_name UNIQUE (organization_id, name)
);
CREATE INDEX idx_lead_sources_organization_id ON lead_sources(organization_id);

-- ============================================================
-- 11. LEADS
-- ============================================================
CREATE TABLE leads (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    first_name              VARCHAR(100) NOT NULL,
    last_name               VARCHAR(100),
    email                   VARCHAR(255),
    phone                   VARCHAR(50),
    company_name            VARCHAR(255),
    job_title               VARCHAR(100),
    website                 TEXT,
    source_id               UUID REFERENCES lead_sources(id) ON DELETE SET NULL,
    status                  VARCHAR(50) NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new','contacted','qualified','unqualified','converted','lost')),
    score                   INT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    assigned_to             UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by              UUID NOT NULL REFERENCES users(id),
    converted_at            TIMESTAMPTZ,
    converted_customer_id   UUID,
    converted_deal_id       UUID,
    custom_fields           JSONB NOT NULL DEFAULT '{}',
    tags                    TEXT[] DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ
);
CREATE INDEX idx_leads_organization_id ON leads(organization_id);
CREATE INDEX idx_leads_source_id ON leads(source_id);
CREATE INDEX idx_leads_status ON leads(organization_id, status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_created_by ON leads(created_by);
CREATE INDEX idx_leads_email ON leads(organization_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_company_name ON leads(organization_id, company_name) WHERE company_name IS NOT NULL;
CREATE INDEX idx_leads_created_at ON leads(organization_id, created_at DESC);
CREATE INDEX idx_leads_score ON leads(organization_id, score DESC);
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);
CREATE INDEX idx_leads_deleted_at ON leads(deleted_at);
CREATE INDEX idx_leads_search ON leads USING GIN(
    to_tsvector('english',
        coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
        coalesce(email, '') || ' ' || coalesce(company_name, '') || ' ' || coalesce(phone, '')
    )
);

-- ============================================================
-- 12. CUSTOMERS
-- ============================================================
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    website         TEXT,
    industry        VARCHAR(100),
    size            VARCHAR(50) CHECK (size IN ('1-10','11-50','51-200','201-500','501-1000','1000+')),
    annual_revenue  NUMERIC(15,2),
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    postal_code     VARCHAR(20),
    country         VARCHAR(100),
    lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
    assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES users(id),
    status          VARCHAR(50) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','churned')),
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    tags            TEXT[] DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_customers_organization_id ON customers(organization_id);
CREATE INDEX idx_customers_status ON customers(organization_id, status);
CREATE INDEX idx_customers_assigned_to ON customers(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_lead_id ON customers(lead_id);
CREATE INDEX idx_customers_email ON customers(organization_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_created_at ON customers(organization_id, created_at DESC);
CREATE INDEX idx_customers_tags ON customers USING GIN(tags);
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX idx_customers_search ON customers USING GIN(
    to_tsvector('english',
        coalesce(name, '') || ' ' || coalesce(email, '') || ' ' ||
        coalesce(phone, '') || ' ' || coalesce(industry, '')
    )
);

-- ============================================================
-- 13. CUSTOMER_CONTACTS
-- ============================================================
CREATE TABLE customer_contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    mobile          VARCHAR(50),
    job_title       VARCHAR(100),
    department      VARCHAR(100),
    is_primary      BOOLEAN NOT NULL DEFAULT false,
    avatar_url      TEXT,
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    postal_code     VARCHAR(20),
    country         VARCHAR(100),
    birthday        DATE,
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_customer_contacts_customer_id ON customer_contacts(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_contacts_organization_id ON customer_contacts(organization_id);
CREATE INDEX idx_customer_contacts_email ON customer_contacts(organization_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_customer_contacts_deleted_at ON customer_contacts(deleted_at);
CREATE INDEX idx_customer_contacts_search ON customer_contacts USING GIN(
    to_tsvector('english',
        coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
        coalesce(email, '') || ' ' || coalesce(job_title, '')
    )
);

-- ============================================================
-- 14. PIPELINES
-- ============================================================
CREATE TABLE pipelines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_default      BOOLEAN NOT NULL DEFAULT false,
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pipelines_org_name UNIQUE (organization_id, name)
);
CREATE INDEX idx_pipelines_organization_id ON pipelines(organization_id);

-- ============================================================
-- 15. PIPELINE_STAGES
-- ============================================================
CREATE TABLE pipeline_stages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    pipeline_id     UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    key             VARCHAR(50) NOT NULL,
    probability     INT NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    sort_order      INT NOT NULL DEFAULT 0,
    color           VARCHAR(7) DEFAULT '#6366f1',
    is_won          BOOLEAN NOT NULL DEFAULT false,
    is_lost         BOOLEAN NOT NULL DEFAULT false,
    is_closed       BOOLEAN GENERATED ALWAYS AS (is_won OR is_lost) STORED,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pipeline_stages_pipeline_key UNIQUE (pipeline_id, key),
    CONSTRAINT uq_pipeline_stages_pipeline_sort UNIQUE (pipeline_id, sort_order),
    CONSTRAINT chk_pipeline_stages_terminal CHECK (NOT (is_won AND is_lost))
);
CREATE INDEX idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);
CREATE INDEX idx_pipeline_stages_organization_id ON pipeline_stages(organization_id);

-- ============================================================
-- 16. DEALS
-- ============================================================
CREATE TABLE deals (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title                   VARCHAR(255) NOT NULL,
    description             TEXT,
    value                   NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
    currency                VARCHAR(3) NOT NULL DEFAULT 'USD',
    stage_id                UUID NOT NULL REFERENCES pipeline_stages(id),
    pipeline_id             UUID NOT NULL REFERENCES pipelines(id),
    probability             INT NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    expected_close_date     DATE,
    actual_close_date       DATE,
    customer_id             UUID REFERENCES customers(id) ON DELETE SET NULL,
    contact_id              UUID REFERENCES customer_contacts(id) ON DELETE SET NULL,
    lead_id                 UUID REFERENCES leads(id) ON DELETE SET NULL,
    assigned_to             UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by              UUID NOT NULL REFERENCES users(id),
    win_reason              TEXT,
    loss_reason             TEXT,
    lost_reason_category    VARCHAR(100) CHECK (lost_reason_category IN (
                                'price','competitor','no_budget','no_decision_maker',
                                'timing','product_fit','other'
                            )),
    custom_fields           JSONB NOT NULL DEFAULT '{}',
    tags                    TEXT[] DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ
);
CREATE INDEX idx_deals_organization_id ON deals(organization_id);
CREATE INDEX idx_deals_stage_id ON deals(stage_id);
CREATE INDEX idx_deals_pipeline_id ON deals(pipeline_id);
CREATE INDEX idx_deals_customer_id ON deals(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_deals_contact_id ON deals(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_deals_lead_id ON deals(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_deals_assigned_to ON deals(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_expected_close_date ON deals(expected_close_date) WHERE expected_close_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_deals_value ON deals(organization_id, value DESC);
CREATE INDEX idx_deals_created_at ON deals(organization_id, created_at DESC);
CREATE INDEX idx_deals_tags ON deals USING GIN(tags);
CREATE INDEX idx_deals_deleted_at ON deals(deleted_at);
CREATE INDEX idx_deals_search ON deals USING GIN(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- ============================================================
-- 17. PRODUCTS
-- ============================================================
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    sku             VARCHAR(100),
    unit_price      NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    unit            VARCHAR(50) NOT NULL DEFAULT 'unit',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    category        VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uq_products_org_sku UNIQUE (organization_id, sku)
);
CREATE INDEX idx_products_organization_id ON products(organization_id);
CREATE INDEX idx_products_is_active ON products(organization_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(organization_id, category) WHERE category IS NOT NULL;
CREATE INDEX idx_products_deleted_at ON products(deleted_at);

-- ============================================================
-- 18. DEAL_PRODUCTS
-- ============================================================
CREATE TABLE deal_products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id         UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity        INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price      NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
    discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
    total           NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_pct / 100)) STORED,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_deal_products UNIQUE (deal_id, product_id)
);
CREATE INDEX idx_deal_products_deal_id ON deal_products(deal_id);
CREATE INDEX idx_deal_products_product_id ON deal_products(product_id);

-- ============================================================
-- 19. ACTIVITIES (Unified Timeline Base)
-- ============================================================
CREATE TABLE activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL
                    CHECK (type IN ('task','meeting','call','note','email','status_change','system')),
    subject         VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','completed','cancelled')),
    priority        VARCHAR(20) NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','urgent')),
    due_date        TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES users(id),
    lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
    customer_id     UUID REFERENCES customers(id) ON DELETE CASCADE,
    deal_id         UUID REFERENCES deals(id) ON DELETE CASCADE,
    contact_id      UUID REFERENCES customer_contacts(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_activities_organization_id ON activities(organization_id);
CREATE INDEX idx_activities_type ON activities(organization_id, type);
CREATE INDEX idx_activities_status ON activities(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_activities_assigned_to ON activities(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_activities_lead_id ON activities(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_activities_customer_id ON activities(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_activities_deal_id ON activities(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX idx_activities_contact_id ON activities(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_activities_due_date ON activities(due_date) WHERE due_date IS NOT NULL AND status = 'pending' AND deleted_at IS NULL;
CREATE INDEX idx_activities_created_at ON activities(organization_id, created_at DESC);
CREATE INDEX idx_activities_deleted_at ON activities(deleted_at);

-- ============================================================
-- 20. TASKS (extends activities)
-- ============================================================
CREATE TABLE tasks (
    id              UUID PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_type       VARCHAR(50) NOT NULL DEFAULT 'general'
                    CHECK (task_type IN ('general','follow_up','preparation','research','outreach','other')),
    reminder_at     TIMESTAMPTZ,
    reminder_sent   BOOLEAN NOT NULL DEFAULT false,
    completed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    recurrence_rule TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX idx_tasks_reminder_at ON tasks(reminder_at) WHERE reminder_sent = false AND reminder_at IS NOT NULL;
CREATE INDEX idx_tasks_task_type ON tasks(organization_id, task_type);

-- ============================================================
-- 21. MEETINGS (extends activities)
-- ============================================================
CREATE TABLE meetings (
    id              UUID PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location        VARCHAR(255),
    meeting_url     TEXT,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    attendees       UUID[] DEFAULT '{}',
    is_recurring    BOOLEAN NOT NULL DEFAULT false,
    recurrence_rule TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_meetings_time_order CHECK (end_time > start_time)
);
CREATE INDEX idx_meetings_organization_id ON meetings(organization_id);
CREATE INDEX idx_meetings_start_time ON meetings(start_time);
CREATE INDEX idx_meetings_attendees ON meetings USING GIN(attendees);

-- ============================================================
-- 22. CALLS (extends activities)
-- ============================================================
CREATE TABLE calls (
    id              UUID PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone_number    VARCHAR(50) NOT NULL,
    duration        INT CHECK (duration >= 0),
    outcome         VARCHAR(50) NOT NULL DEFAULT 'connected'
                    CHECK (outcome IN ('connected','voicemail','no_answer','busy','wrong_number','cancelled')),
    recording_url   TEXT,
    direction       VARCHAR(10) NOT NULL DEFAULT 'outbound'
                    CHECK (direction IN ('inbound','outbound')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_calls_organization_id ON calls(organization_id);
CREATE INDEX idx_calls_outcome ON calls(organization_id, outcome);
CREATE INDEX idx_calls_duration ON calls(duration) WHERE duration IS NOT NULL;

-- ============================================================
-- 23. NOTES
-- ============================================================
CREATE TABLE notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    is_pinned       BOOLEAN NOT NULL DEFAULT false,
    created_by      UUID NOT NULL REFERENCES users(id),
    lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
    customer_id     UUID REFERENCES customers(id) ON DELETE CASCADE,
    deal_id         UUID REFERENCES deals(id) ON DELETE CASCADE,
    contact_id      UUID REFERENCES customer_contacts(id) ON DELETE CASCADE,
    activity_id     UUID REFERENCES activities(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_notes_organization_id ON notes(organization_id);
CREATE INDEX idx_notes_lead_id ON notes(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_notes_customer_id ON notes(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_notes_deal_id ON notes(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX idx_notes_contact_id ON notes(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_notes_is_pinned ON notes(organization_id, is_pinned DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_created_at ON notes(organization_id, created_at DESC);
CREATE INDEX idx_notes_deleted_at ON notes(deleted_at);

-- ============================================================
-- 24. INVOICES
-- ============================================================
CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number  VARCHAR(50) NOT NULL,
    deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
    customer_id     UUID NOT NULL REFERENCES customers(id),
    contact_id      UUID REFERENCES customer_contacts(id) ON DELETE SET NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
    subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
    tax_amount      NUMERIC(15,2) GENERATED ALWAYS AS (subtotal * tax_rate / 100) STORED,
    discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total           NUMERIC(15,2) GENERATED ALWAYS AS (subtotal + (subtotal * tax_rate / 100) - discount_amount) STORED,
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    issued_date     DATE,
    due_date        DATE,
    paid_date       DATE,
    notes           TEXT,
    billing_address TEXT,
    shipping_address TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uq_invoices_org_number UNIQUE (organization_id, invoice_number),
    CONSTRAINT chk_invoices_dates CHECK (due_date IS NULL OR issued_date IS NULL OR due_date >= issued_date)
);
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_deal_id ON invoices(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(organization_id, status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status IN ('sent','overdue');
CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at);

-- ============================================================
-- 25. INVOICE_LINE_ITEMS
-- ============================================================
CREATE TABLE invoice_line_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
    description     VARCHAR(255) NOT NULL,
    quantity        INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price      NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
    discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
    total           NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_pct / 100)) STORED,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_product_id ON invoice_line_items(product_id) WHERE product_id IS NOT NULL;

-- ============================================================
-- 26. PAYMENTS
-- ============================================================
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method  VARCHAR(50) NOT NULL
                    CHECK (payment_method IN ('credit_card','debit_card','bank_transfer','paypal','stripe','cash','check','other')),
    transaction_id  VARCHAR(255),
    status          VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','completed','failed','refunded')),
    paid_at         TIMESTAMPTZ,
    notes           TEXT,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_organization_id ON payments(organization_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_status ON payments(organization_id, status);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX idx_payments_paid_at ON payments(paid_at) WHERE paid_at IS NOT NULL;

-- ============================================================
-- 27. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL
                    CHECK (type IN ('lead_assigned','deal_created','deal_stage_changed','task_assigned',
                                    'task_due','meeting_scheduled','mention','invitation','system')),
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    action_url      TEXT,
    is_read         BOOLEAN NOT NULL DEFAULT false,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_type ON notifications(organization_id, type);

-- ============================================================
-- 28. REPORTS
-- ============================================================
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    type            VARCHAR(50) NOT NULL
                    CHECK (type IN ('pipeline','revenue','lead','activity','team','custom')),
    config          JSONB NOT NULL DEFAULT '{}',
    is_public       BOOLEAN NOT NULL DEFAULT false,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_reports_organization_id ON reports(organization_id);
CREATE INDEX idx_reports_type ON reports(organization_id, type);
CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_deleted_at ON reports(deleted_at);

-- ============================================================
-- 29. AUDIT_LOGS (Immutable)
-- ============================================================
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    action          VARCHAR(50) NOT NULL
                    CHECK (action IN ('create','update','delete','login','logout','failed_login',
                                      'password_change','export','import','convert','assign')),
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    entity_name     VARCHAR(255),
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE RULE audit_logs_no_update AS ON UPDATE DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE DO INSTEAD NOTHING;
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(organization_id, action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- 30. SETTINGS
-- ============================================================
CREATE TABLE settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key             VARCHAR(100) NOT NULL,
    value           JSONB NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_settings_org_key UNIQUE (organization_id, key)
);
CREATE INDEX idx_settings_organization_id ON settings(organization_id);
CREATE INDEX idx_settings_key ON settings(key);

-- ============================================================
-- 31. ATTACHMENTS
-- ============================================================
CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    filename        VARCHAR(255) NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    size            BIGINT NOT NULL CHECK (size > 0 AND size <= 10485760),
    storage_key     TEXT NOT NULL,
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
    customer_id     UUID REFERENCES customers(id) ON DELETE CASCADE,
    deal_id         UUID REFERENCES deals(id) ON DELETE CASCADE,
    activity_id     UUID REFERENCES activities(id) ON DELETE SET NULL,
    invoice_id      UUID REFERENCES invoices(id) ON DELETE CASCADE,
    note_id         UUID REFERENCES notes(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_attachments_organization_id ON attachments(organization_id);
CREATE INDEX idx_attachments_lead_id ON attachments(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_attachments_customer_id ON attachments(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_attachments_deal_id ON attachments(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX idx_attachments_activity_id ON attachments(activity_id) WHERE activity_id IS NOT NULL;
CREATE INDEX idx_attachments_invoice_id ON attachments(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_attachments_storage_key ON attachments(storage_key);

-- ============================================================
-- 32. EMAIL_TEMPLATES
-- ============================================================
CREATE TABLE email_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    subject         VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    variables       TEXT[] DEFAULT '{}',
    category        VARCHAR(50) DEFAULT 'general'
                    CHECK (category IN ('general','sales','marketing','support','transactional')),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_email_templates_organization_id ON email_templates(organization_id);
CREATE INDEX idx_email_templates_category ON email_templates(organization_id, category);
CREATE INDEX idx_email_templates_deleted_at ON email_templates(deleted_at);

-- ============================================================
-- 33. EMAIL_LOGS
-- ============================================================
CREATE TABLE email_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    template_id     UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    from_email      VARCHAR(255) NOT NULL,
    to_email        VARCHAR(255) NOT NULL,
    subject         VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sent','delivered','bounced','failed')),
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    opened_at       TIMESTAMPTZ,
    clicked_at      TIMESTAMPTZ,
    error           TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_email_logs_organization_id ON email_logs(organization_id, created_at DESC);
CREATE INDEX idx_email_logs_template_id ON email_logs(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);

-- ============================================================
-- VIEWS
-- ============================================================

-- Unified Activity Timeline View
CREATE OR REPLACE VIEW activity_timeline AS
SELECT
    a.id,
    a.organization_id,
    a.type,
    a.subject,
    a.description,
    a.status,
    a.priority,
    a.due_date,
    a.completed_at,
    a.assigned_to,
    a.created_by,
    a.lead_id,
    a.customer_id,
    a.deal_id,
    a.contact_id,
    a.created_at,
    a.updated_at,
    -- Task-specific fields
    t.task_type,
    t.reminder_at,
    t.recurrence_rule,
    -- Meeting-specific fields
    m.location,
    m.meeting_url,
    m.start_time AS meeting_start,
    m.end_time AS meeting_end,
    m.attendees AS meeting_attendees,
    -- Call-specific fields
    c.phone_number,
    c.duration AS call_duration,
    c.outcome AS call_outcome,
    c.direction AS call_direction,
    -- Joined user names
    u.first_name || ' ' || u.last_name AS created_by_name,
    au.first_name || ' ' || au.last_name AS assigned_to_name
FROM activities a
LEFT JOIN tasks t ON t.id = a.id
LEFT JOIN meetings m ON m.id = a.id
LEFT JOIN calls c ON c.id = a.id
LEFT JOIN users u ON u.id = a.created_by
LEFT JOIN users au ON au.id = a.assigned_to
WHERE a.deleted_at IS NULL;

-- Pipeline Summary View
CREATE OR REPLACE VIEW pipeline_summary AS
SELECT
    p.organization_id,
    p.id AS pipeline_id,
    p.name AS pipeline_name,
    ps.id AS stage_id,
    ps.name AS stage_name,
    ps.key AS stage_key,
    ps.sort_order,
    ps.color,
    ps.probability AS stage_probability,
    ps.is_won,
    ps.is_lost,
    COUNT(d.id) AS deal_count,
    COALESCE(SUM(d.value), 0) AS total_value,
    COALESCE(SUM(d.value * d.probability / 100.0), 0) AS weighted_value
FROM pipelines p
JOIN pipeline_stages ps ON ps.pipeline_id = p.id
LEFT JOIN deals d ON d.stage_id = ps.id AND d.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, ps.id, ps.name, ps.key, ps.sort_order, ps.color, ps.probability, ps.is_won, ps.is_lost
ORDER BY ps.sort_order;
