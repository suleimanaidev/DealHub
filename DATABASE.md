# CRM Database Design

## Overview

| Property | Value |
|---|---|
| **Database** | PostgreSQL 16 |
| **Primary Keys** | UUID (gen_random_uuid) |
| **Multi-Tenancy** | organization_id FK on all tenant tables |
| **Soft Deletes** | deleted_at (TIMESTAMP, NULL = active) |
| **Timestamps** | created_at, updated_at on every table |
| **Naming** | snake_case tables and columns |
| **Normalization** | 3NF (Third Normal Form) |
| **Total Tables** | 30 |

### Design Principles

1. **UUID Primary Keys** - No sequential ID leaks, safe for distributed systems, no conflicts during merges
2. **Multi-Tenant Isolation** - Every business table has `organization_id` FK; all queries filter by it
3. **Soft Deletes** - Major entities use `deleted_at` instead of hard deletes; preserves referential integrity and audit trail
4. **Polymorphic Associations** - Activities, notes, and attachments can link to any entity via nullable FKs
5. **Activity Inheritance** - Tasks, meetings, and calls extend a base `activities` table (1:1) for unified timeline
6. **JSONB for Flexibility** - Custom fields, settings, and metadata use JSONB columns; queryable without schema changes
7. **Array Columns** - Tags use PostgreSQL TEXT[] arrays with GIN indexes for fast tag-based filtering

---

## ER Diagram

```
                              ┌──────────────────┐
                              │   organizations   │
                              └────────┬─────────┘
                                       │
          ┌────────────┬───────────┬────┴────┬────────────┬──────────────┐
          │            │           │         │            │              │
          ▼            ▼           ▼         ▼            ▼              ▼
     ┌─────────┐ ┌──────────┐ ┌───────┐ ┌────────┐ ┌──────────┐ ┌───────────┐
     │  users   │ │  roles   │ │ leads │ │products│ │ settings │ │audit_logs │
     └────┬────┘ └────┬─────┘ └───┬───┘ └───┬────┘ └──────────┘ └───────────┘
          │            │           │         │
          │            ▼           │         │
          │     ┌──────────────┐   │         │
          │     │   role_      │   │         │
          │     │ permissions  │   │         │
          │     └──────┬───────┘   │         │
          │            │           │         │
          │            ▼           │         │
          │     ┌──────────────┐   │         │
          │     │ permissions  │   │         │
          │     └──────────────┘   │         │
          │                        │         │
          ├────── user_roles ──────┤         │
          │                        │         │
          ▼                        ▼         │
   ┌────────────┐          ┌────────────┐    │
   │  sessions  │          │lead_sources│    │
   └────────────┘          └─────┬──────┘    │
                                 │           │
                                 ▼           │
                           ┌──────────┐      │
                           │   leads   │──────┤
                           └─────┬────┘      │
                                 │           │
              ┌──────────────────┤           │
              │                  │           │
              ▼                  ▼           │
       ┌────────────┐    ┌────────────┐     │
       │ customers  │    │ activities │     │
       └─────┬──────┘    └──┬───┬──┬──┘     │
             │              │   │  │         │
             ▼              ▼   ▼  ▼         │
      ┌──────────────┐  ┌─────┐┌─────┐┌─────┐│
      │customer_     │  │tasks││meet-││calls││
      │contacts      │  └─────┘│ings │└─────┘│
      └──────────────┘         └─────┘       │
             │                               │
             ▼                               │
      ┌────────────┐                         │
      │   deals    │◄──── deal_products ─────┘
      └─────┬──────┘          │
            │                 ▼
            │          ┌────────────┐
            │          │  products  │
            │          └────────────┘
            │
   ┌────────┴────────────┐
   │                     │
   ▼                     ▼
┌──────────┐      ┌───────────┐
│pipelines │      │ invoices  │
└────┬─────┘      └─────┬─────┘
     │                  │
     ▼                  ├────────────────┐
┌──────────────┐        ▼                ▼
│pipeline_     │  ┌──────────────┐  ┌──────────┐
│stages        │  │invoice_line_ │  │ payments │
└──────────────┘  │items         │  └──────────┘
                  └──────────────┘

     ┌──────────────────────────────────────────┐
     │           SUPPORTING TABLES               │
     │                                           │
     │  ┌──────────────┐  ┌──────────────────┐  │
     │  │ notifications│  │ email_templates   │  │
     │  └──────────────┘  └──────────────────┘  │
     │  ┌──────────────┐  ┌──────────────────┐  │
     │  │ attachments  │  │ email_logs        │  │
     │  └──────────────┘  └──────────────────┘  │
     │  ┌──────────────┐  ┌──────────────────┐  │
     │  │    notes     │  │   reports         │  │
     │  └──────────────┘  └──────────────────┘  │
     └──────────────────────────────────────────┘
```

### Relationship Summary

| Relationship | Type | Description |
|---|---|---|
| organizations -> users | 1:N | Each org has many users |
| organizations -> roles | 1:N | Each org has custom roles (system roles have NULL org) |
| roles -> permissions | N:N | via role_permissions |
| users -> roles | N:N | via user_roles |
| organizations -> leads | 1:N | Each org has many leads |
| lead_sources -> leads | 1:N | Each source has many leads |
| leads -> customers | 1:0..1 | Leads convert to customers |
| leads -> deals | 1:0..1 | Leads can generate deals |
| organizations -> customers | 1:N | Each org has many customers |
| customers -> customer_contacts | 1:N | Each customer has many contacts |
| organizations -> pipelines | 1:N | Each org has many pipelines |
| pipelines -> pipeline_stages | 1:N | Each pipeline has ordered stages |
| pipeline_stages -> deals | 1:N | Each stage has many deals |
| customers -> deals | 1:N | Each customer can have many deals |
| deals -> products | N:N | via deal_products |
| deals -> invoices | 1:N | Each deal can have many invoices |
| invoices -> invoice_line_items | 1:N | Each invoice has many line items |
| invoices -> payments | 1:N | Each invoice has many payments |
| activities -> tasks | 1:0..1 | Tasks extend activities |
| activities -> meetings | 1:0..1 | Meetings extend activities |
| activities -> calls | 1:0..1 | Calls extend activities |
| organizations -> notes | 1:N | Notes on any entity |
| organizations -> attachments | 1:N | Files on any entity |
| organizations -> audit_logs | 1:N | Change tracking |

---

## Table Definitions

### 1. organizations

The **tenant** table. Every row represents a single company using the CRM. All other business data is scoped to an organization via `organization_id` foreign key. This is the foundation of multi-tenancy.

```sql
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
```

| Column | Type | Description |
|---|---|---|
| id | UUID | Unique tenant identifier |
| name | VARCHAR(255) | Company/organization display name |
| slug | VARCHAR(255) | URL-safe identifier (e.g., "acme-corp") |
| domain | VARCHAR(255) | Primary company domain |
| industry | VARCHAR(100) | Industry classification |
| size | VARCHAR(50) | Employee count range |
| currency | VARCHAR(3) | ISO 4217 currency code (USD, EUR, GBP) |
| plan | VARCHAR(50) | Subscription tier |
| settings | JSONB | Flexible key-value settings (locale, features, etc.) |

---

### 2. users

All user accounts within an organization. A user is authenticated via email/password or OAuth. Each user has at least one role. The `is_owner` flag identifies the organization creator who has irrevocable admin access.

```sql
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
```

| Column | Type | Description |
|---|---|---|
| id | UUID | Unique user identifier |
| organization_id | UUID | Tenant this user belongs to |
| email | VARCHAR(255) | Login email (unique per org) |
| password_hash | VARCHAR(255) | bcrypt hash; NULL for OAuth-only users |
| is_owner | BOOLEAN | Org creator; cannot be deactivated |
| failed_login_attempts | INT | Counter for brute-force protection |
| locked_until | TIMESTAMPTZ | Account lock expires at this time |
| preferences | JSONB | UI preferences (theme, sidebar, etc.) |

---

### 3. roles

Defines permission groups. System roles (Sales Admin, Sales Manager, Sales Rep, etc.) are seeded on org creation and cannot be deleted. Custom roles can be created by admins. System roles have `organization_id = NULL`.

```sql
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
```

| Column | Type | Description |
|---|---|---|
| organization_id | UUID | NULL for system roles, org ID for custom roles |
| is_system | BOOLEAN | System roles cannot be deleted or renamed |
| name | VARCHAR(100) | Role display name (e.g., "Sales Manager") |

---

### 4. permissions

Global permission definitions. Each permission is a `(resource, action)` pair. These are seeded once and never modified at runtime. The `scope` column on `role_permissions` determines the data access level.

```sql
CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource    VARCHAR(50) NOT NULL,
    action      VARCHAR(50) NOT NULL,
    description TEXT,

    CONSTRAINT uq_permissions_resource_action UNIQUE (resource, action)
);
```

| Column | Type | Description |
|---|---|---|
| resource | VARCHAR(50) | Entity type: lead, contact, deal, etc. |
| action | VARCHAR(50) | Operation: create, read, update, delete, assign, export, import |

**Seeded Permissions (40 total):**
- lead: create, read, update, delete, assign, convert, export, import
- contact: create, read, update, delete, export, import
- customer: create, read, update, delete, export, import
- company: create, read, update, delete, export, import
- deal: create, read, update, delete, export
- activity: create, read, update, delete
- report: read, export
- user: create, read, update, delete, invite
- settings: read, update
- role: create, read, update, delete
- audit: read
- notification: read, update
- email_template: create, read, update, delete
- product: create, read, update, delete
- invoice: create, read, update, delete

---

### 5. role_permissions

Many-to-many junction between roles and permissions. The `scope` column determines **data visibility**: `own` (user's own records), `team` (records of managed users), `org` (all org records), `all` (all tenants - super admin only).

```sql
CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    scope         VARCHAR(20) NOT NULL DEFAULT 'own' CHECK (scope IN ('own','team','org','all')),

    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
```

| Column | Type | Description |
|---|---|---|
| role_id | UUID | The role being configured |
| permission_id | UUID | The permission being granted |
| scope | VARCHAR(20) | Data access level for this permission |

---

### 6. user_roles

Many-to-many junction between users and roles. A user can have multiple roles; their effective permissions are the **union** of all role permissions.

```sql
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
```

---

### 7. sessions

Active user sessions for JWT refresh token management. Each session represents a logged-in device. Users can have a maximum of 5 active sessions; exceeding this revokes the oldest.

```sql
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
```

| Column | Type | Description |
|---|---|---|
| refresh_token | VARCHAR(500) | Hashed refresh token |
| ip_address | INET | Client IP for security auditing |
| user_agent | TEXT | Browser/device identifier |
| last_active_at | TIMESTAMPTZ | Updated on each API call for session tracking |

---

### 8. password_reset_tokens

Single-use tokens for password reset flow. Expire after 15 minutes. Invalidated immediately after use or on password change.

```sql
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
```

---

### 9. email_verification_tokens

Tokens sent via email to verify user registration. Expire after 24 hours.

```sql
CREATE TABLE email_verification_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(500) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
```

---

### 10. lead_sources

Lookup table defining where leads originate. Seeded with common sources; organizations can add custom sources. Used for lead source analytics and reporting.

```sql
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
```

**Default Sources:** Website, Referral, Cold Call, Advertisement, Email Campaign, Social Media, Event, Partner, Manual, Import

---

### 11. leads

Prospective customers captured from various sources. Leads go through a qualification pipeline before being converted to customers/deals. The conversion is an atomic operation that creates a customer, optionally a deal, and marks the lead as converted.

```sql
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
        coalesce(first_name, '') || ' ' ||
        coalesce(last_name, '') || ' ' ||
        coalesce(email, '') || ' ' ||
        coalesce(company_name, '') || ' ' ||
        coalesce(phone, '')
    )
);
```

| Column | Type | Description |
|---|---|---|
| source_id | UUID | FK to lead_sources; SET NULL on source deletion |
| status | VARCHAR(50) | Pipeline status with CHECK constraint |
| score | INT | Lead quality score 0-100 |
| assigned_to | UUID | User responsible for this lead |
| converted_customer_id | UUID | Set after conversion (not FK to avoid circular ref) |
| converted_deal_id | UUID | Set after conversion (not FK to avoid circular ref) |
| tags | TEXT[] | PostgreSQL array for flexible tagging |

**Note:** `converted_customer_id` and `converted_deal_id` are intentionally **not** declared as FOREIGN KEYs. They are set after the conversion transaction completes, and adding FK constraints would create circular dependencies (leads -> customers -> leads). The application layer enforces referential integrity.

---

### 12. customers

Confirmed customers/accounts. Created from lead conversion or manually. A customer represents a company or individual with whom the business has an active relationship. Customer contacts are stored in a separate table.

```sql
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
        coalesce(name, '') || ' ' ||
        coalesce(email, '') || ' ' ||
        coalesce(phone, '') || ' ' ||
        coalesce(industry, '')
    )
);
```

| Column | Type | Description |
|---|---|---|
| lead_id | UUID | Original lead (SET NULL if lead deleted) |
| status | VARCHAR(50) | active, inactive, churned |
| annual_revenue | NUMERIC(15,2) | Customer's annual revenue for segmentation |

---

### 13. customer_contacts

Individual people at a customer company. A customer can have many contacts; one contact is marked as primary. This normalizes the relationship between companies and people.

```sql
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
        coalesce(first_name, '') || ' ' ||
        coalesce(last_name, '') || ' ' ||
        coalesce(email, '') || ' ' ||
        coalesce(job_title, '')
    )
);
```

---

### 14. pipelines

Sales pipelines define the stages a deal progresses through. Each organization has at least one default pipeline; multiple pipelines support different sales processes (e.g., "Enterprise Sales" vs "SMB Sales").

```sql
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
```

---

### 15. pipeline_stages

Ordered stages within a pipeline. Each stage has a probability percentage used for weighted pipeline calculations. The `is_won` and `is_lost` flags mark terminal stages. Deals in terminal stages cannot be edited.

```sql
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
```

| Column | Type | Description |
|---|---|---|
| key | VARCHAR(50) | Machine-readable key (e.g., "prospecting", "closed_won") |
| probability | INT | Win probability 0-100; used for weighted revenue |
| is_won | BOOLEAN | Terminal stage: deal won |
| is_lost | BOOLEAN | Terminal stage: deal lost |
| is_closed | BOOLEAN | **Generated column**: true if won OR lost |

**Default Stages (seeded):**
| Key | Name | Probability | Sort | Terminal |
|---|---|---|---|---|
| prospecting | Prospecting | 10 | 1 | No |
| qualification | Qualification | 25 | 2 | No |
| proposal | Proposal Sent | 50 | 3 | No |
| negotiation | Negotiation | 75 | 4 | No |
| closed_won | Closed Won | 100 | 5 | Won |
| closed_lost | Closed Lost | 0 | 6 | Lost |

---

### 16. deals

Sales opportunities tracked through the pipeline. Each deal has a monetary value, probability (inherited from stage but overridable), expected close date, and links to the originating customer, contact, and lead.

```sql
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
CREATE INDEX idx_deals_status ON deals(organization_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_deals_expected_close_date ON deals(expected_close_date) WHERE expected_close_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_deals_value ON deals(organization_id, value DESC);
CREATE INDEX idx_deals_created_at ON deals(organization_id, created_at DESC);
CREATE INDEX idx_deals_tags ON deals USING GIN(tags);
CREATE INDEX idx_deals_deleted_at ON deals(deleted_at);
CREATE INDEX idx_deals_search ON deals USING GIN(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);
```

| Column | Type | Description |
|---|---|---|
| stage_id | UUID | Current pipeline stage |
| pipeline_id | UUID | Denormalized for query performance (always matches stage's pipeline) |
| probability | INT | Can override stage probability for deal-specific forecasting |
| expected_close_date | DATE | When the deal is expected to close |
| actual_close_date | DATE | Set when deal moves to won/lost stage |
| lost_reason_category | VARCHAR(100) | Structured loss reason for analytics |

---

### 17. products

Products and services offered by the organization. Linked to deals via `deal_products` junction table. Product pricing is captured at deal time to preserve historical accuracy.

```sql
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

    CONSTRAINT uq_products_org_sku UNIQUE (organization_id, sku) WHERE sku IS NOT NULL
);

CREATE INDEX idx_products_organization_id ON products(organization_id);
CREATE INDEX idx_products_is_active ON products(organization_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(organization_id, category) WHERE category IS NOT NULL;
CREATE INDEX idx_products_deleted_at ON products(deleted_at);
```

| Column | Type | Description |
|---|---|---|
| sku | VARCHAR(100) | Stock Keeping Unit (unique per org) |
| unit_price | NUMERIC(15,2) | Base price; overridden per deal |
| unit | VARCHAR(50) | unit, hour, month, license, etc. |
| category | VARCHAR(100) | Product categorization |

---

### 18. deal_products

Junction table linking deals to products with deal-specific pricing. The `unit_price` here captures the **negotiated price** at the time of the deal, which may differ from the product's base price.

```sql
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
```

| Column | Type | Description |
|---|---|---|
| unit_price | NUMERIC(15,2) | Negotiated price (may differ from product.base_price) |
| discount_pct | NUMERIC(5,2) | Percentage discount 0-100 |
| total | NUMERIC(15,2) | **Generated column**: quantity * unit_price * (1 - discount/100) |

---

### 19. activities

The **unified activity timeline** table. Every user action (calls, meetings, tasks, status changes, emails) creates a record here. Type-specific data is stored in extension tables (tasks, meetings, calls) linked 1:1 by shared PK.

```sql
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

    -- Polymorphic entity links (exactly one should be set)
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
```

| Column | Type | Description |
|---|---|---|
| type | VARCHAR(50) | Discriminator: task, meeting, call, note, email, status_change, system |
| status | VARCHAR(50) | Task/activity lifecycle status |
| priority | VARCHAR(20) | Urgency level |
| due_date | TIMESTAMPTZ | When this activity is due |
| lead_id | UUID | Polymorphic FK: activity related to a lead |
| customer_id | UUID | Polymorphic FK: activity related to a customer |
| deal_id | UUID | Polymorphic FK: activity related to a deal |
| contact_id | UUID | Polymorphic FK: activity related to a contact |

**Partial Indexes:** Many indexes use `WHERE deleted_at IS NULL` and `WHERE xxx_id IS NOT NULL` to keep index size small and queries fast.

---

### 20. tasks

Extends the `activities` table for task-specific data. Shares the same PK as the parent activity record. Tasks have completion tracking, reminders, and recurrence support.

```sql
CREATE TABLE tasks (
    id              UUID PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_type       VARCHAR(50) NOT NULL DEFAULT 'general'
                    CHECK (task_type IN ('general','follow_up','preparation','research','outreach','other')),
    reminder_at     TIMESTAMPTZ,
    reminder_sent   BOOLEAN NOT NULL DEFAULT false,
    completed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    recurrence_rule TEXT,  -- iCalendar RRULE format (e.g., "FREQ=WEEKLY;BYDAY=MO")
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX idx_tasks_reminder_at ON tasks(reminder_at) WHERE reminder_sent = false AND reminder_at IS NOT NULL;
CREATE INDEX idx_tasks_task_type ON tasks(organization_id, task_type);
```

| Column | Type | Description |
|---|---|---|
| id | UUID | **Same PK as activities.id** (1:1 inheritance) |
| task_type | VARCHAR(50) | Classification of the task |
| reminder_at | TIMESTAMPTZ | When to send a reminder notification |
| recurrence_rule | TEXT | iCalendar RRULE for recurring tasks |

---

### 21. meetings

Extends the `activities` table for meeting-specific data. Stores location, virtual meeting links, timing, and attendee list.

```sql
CREATE TABLE meetings (
    id              UUID PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location        VARCHAR(255),
    meeting_url     TEXT,           -- Zoom/Teams/Google Meet link
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    attendees       UUID[] DEFAULT '{}',  -- Array of user IDs
    is_recurring    BOOLEAN NOT NULL DEFAULT false,
    recurrence_rule TEXT,           -- iCalendar RRULE
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_meetings_time_order CHECK (end_time > start_time)
);

CREATE INDEX idx_meetings_organization_id ON meetings(organization_id);
CREATE INDEX idx_meetings_start_time ON meetings(start_time);
CREATE INDEX idx_meetings_attendees ON meetings USING GIN(attendees);
```

| Column | Type | Description |
|---|---|---|
| start_time | TIMESTAMPTZ | Meeting start (CHECK: must be before end_time) |
| end_time | TIMESTAMPTZ | Meeting end |
| attendees | UUID[] | PostgreSQL array of user IDs attending |
| meeting_url | TEXT | Video conferencing link |

---

### 22. calls

Extends the `activities` table for call-specific data. Logs phone call details including duration, outcome, and optional recording.

```sql
CREATE TABLE calls (
    id              UUID PRIMARY KEY REFERENCES activities(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone_number    VARCHAR(50) NOT NULL,
    duration        INT CHECK (duration >= 0),   -- Duration in seconds
    outcome         VARCHAR(50) NOT NULL DEFAULT 'connected'
                    CHECK (outcome IN ('connected','voicemail','no_answer','busy','wrong_number','cancelled')),
    recording_url   TEXT,           -- Optional call recording
    direction       VARCHAR(10) NOT NULL DEFAULT 'outbound'
                    CHECK (direction IN ('inbound','outbound')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calls_organization_id ON calls(organization_id);
CREATE INDEX idx_calls_outcome ON calls(organization_id, outcome);
CREATE INDEX idx_calls_duration ON calls(duration) WHERE duration IS NOT NULL;
```

| Column | Type | Description |
|---|---|---|
| phone_number | VARCHAR(50) | Number called/received from |
| duration | INT | Call length in seconds |
| outcome | VARCHAR(50) | Call result |
| direction | VARCHAR(10) | inbound or outbound |

---

### 23. notes

Free-form notes attached to any entity. Unlike activities, notes are purely informational and do not have status, priority, or assignment. They appear in entity timelines alongside activities.

```sql
CREATE TABLE notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    is_pinned       BOOLEAN NOT NULL DEFAULT false,
    created_by      UUID NOT NULL REFERENCES users(id),

    -- Polymorphic entity links
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
```

---

### 24. invoices

Financial documents sent to customers. Generated from deals. An invoice goes through: draft -> sent -> paid/overdue/cancelled. Each invoice has line items and can have multiple partial payments.

```sql
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
```

| Column | Type | Description |
|---|---|---|
| invoice_number | VARCHAR(50) | Org-unique invoice ID (e.g., "INV-2026-0001") |
| tax_amount | NUMERIC(15,2) | **Generated**: subtotal * tax_rate / 100 |
| total | NUMERIC(15,2) | **Generated**: subtotal + tax - discount |
| status | VARCHAR(50) | Lifecycle: draft -> sent -> paid/overdue/cancelled |

---

### 25. invoice_line_items

Individual line items on an invoice. Each item references a product and captures the quantity, price, and discount at the time of invoicing.

```sql
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
```

---

### 26. payments

Payment records against invoices. Supports partial payments. A payment goes through: pending -> completed/failed/refunded. Multiple payments can be made against a single invoice until the total is covered.

```sql
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method  VARCHAR(50) NOT NULL
                    CHECK (payment_method IN ('credit_card','debit_card','bank_transfer','paypal','stripe','cash','check','other')),
    transaction_id  VARCHAR(255),   -- External payment processor ID
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
```

| Column | Type | Description |
|---|---|---|
| amount | NUMERIC(15,2) | Payment amount (positive) |
| payment_method | VARCHAR(50) | How the payment was made |
| transaction_id | VARCHAR(255) | Stripe/PayPal/PayMongo transaction ID |
| status | VARCHAR(50) | pending -> completed/failed/refunded |

---

### 27. notifications

In-app notifications for users. Created by system events (lead assigned, task due, deal stage changed, etc.). Users can mark notifications as read.

```sql
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
    action_url      TEXT,           -- Deep link to the relevant entity
    is_read         BOOLEAN NOT NULL DEFAULT false,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_type ON notifications(organization_id, type);
```

---

### 28. reports

Saved report configurations. Users can save filter/view configurations and reuse them. Report data is computed at query time, not stored.

```sql
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    type            VARCHAR(50) NOT NULL
                    CHECK (type IN ('pipeline','revenue','lead','activity','team','custom')),
    config          JSONB NOT NULL DEFAULT '{}',  -- Filters, groupings, date range, chart type
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
```

| Column | Type | Description |
|---|---|---|
| config | JSONB | Report definition: `{ filters: {...}, groupBy: "...", chartType: "bar", dateRange: {...} }` |
| is_public | BOOLEAN | Visible to all org users if true; private if false |

---

### 29. audit_logs

Immutable audit trail of all write operations. Every create, update, delete, and auth event is logged with old/new values for compliance and debugging. **No UPDATE or DELETE is allowed on this table.**

```sql
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    action          VARCHAR(50) NOT NULL
                    CHECK (action IN ('create','update','delete','login','logout','failed_login',
                                      'password_change','export','import','convert','assign')),
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    entity_name     VARCHAR(255),       -- Human-readable name for quick display
    old_values      JSONB,              -- Previous state (for updates/deletes)
    new_values      JSONB,              -- New state (for creates/updates)
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent updates and deletes on audit logs
CREATE RULE audit_logs_no_update AS ON UPDATE DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE DO INSTEAD NOTHING;

CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(organization_id, action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

| Column | Type | Description |
|---|---|---|
| action | VARCHAR(50) | What was done |
| old_values | JSONB | Previous state for updates (null for creates) |
| new_values | JSONB | New state for creates/updates (null for deletes) |
| ip_address | INET | Client IP for security auditing |

**Immutability:** The `audit_logs_no_update` and `audit_logs_no_delete` rules prevent any modification or deletion of audit records.

---

### 30. settings

Key-value configuration store per organization. Values are stored as JSONB for flexibility. Common settings include pipeline config, notification preferences, email settings, etc.

```sql
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
```

**Common Settings Keys:**
| Key | Example Value | Description |
|---|---|---|
| `pipeline.default_id` | `"uuid"` | Default pipeline for new deals |
| `notification.email_enabled` | `true` | Email notifications on/off |
| `notification.task_reminders` | `true` | Task reminder notifications |
| `deal.default_currency` | `"USD"` | Default deal currency |
| `lead.auto_assign` | `false` | Auto-assign new leads round-robin |
| `invoice.prefix` | `"INV"` | Invoice number prefix |
| `invoice.next_number` | `1001` | Next invoice sequence number |

---

### 31. attachments

File attachments linked to any entity. Files are stored in S3/MinIO; the database stores metadata and the storage key.

```sql
CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    filename        VARCHAR(255) NOT NULL,      -- Stored filename (UUID-based)
    original_name   VARCHAR(255) NOT NULL,      -- Original upload filename
    mime_type       VARCHAR(100) NOT NULL,
    size            BIGINT NOT NULL CHECK (size > 0 AND size <= 10485760),  -- Max 10MB
    storage_key     TEXT NOT NULL,               -- S3/MinIO object key
    uploaded_by     UUID NOT NULL REFERENCES users(id),

    -- Polymorphic entity links
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
```

| Column | Type | Description |
|---|---|---|
| filename | VARCHAR(255) | Server-side filename (e.g., "a1b2c3d4.pdf") |
| original_name | VARCHAR(255) | User's original filename |
| mime_type | VARCHAR(100) | MIME type for content-type headers |
| size | BIGINT | File size in bytes (max 10MB enforced by CHECK) |
| storage_key | TEXT | S3 object path (e.g., "org-id/attachments/a1b2c3d4.pdf") |

---

### 32. email_templates

Reusable email templates with variable placeholders. Variables use `{{variable_name}}` syntax and are replaced at send time.

```sql
CREATE TABLE email_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    subject         VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    variables       TEXT[] DEFAULT '{}',         -- Available template variables
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
```

---

### 33. email_logs

Immutable log of every email sent through the CRM. Tracks delivery status for debugging and compliance.

```sql
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
```

---

## Index Strategy

### Index Types Used

| Index Type | Use Case | Tables |
|---|---|---|
| **B-Tree** | Default; equality and range queries | All FK columns, status, type |
| **GIN (tsvector)** | Full-text search | leads, customers, contacts, deals |
| **GIN (array)** | Array contains | leads.tags, meetings.attendees |
| **GIN (JSONB)** | JSONB key existence | (available for custom_fields queries) |
| **Partial** | Conditional index (WHERE clause) | All deleted_at, nullable FKs |

### Partial Indexes (Key Optimization)

Every table with `deleted_at` uses a partial index:
```sql
-- Instead of indexing all rows including deleted:
CREATE INDEX idx_leads_deleted ON leads(deleted_at);

-- We use partial indexes on active rows for query performance:
CREATE INDEX idx_leads_assigned ON leads(assigned_to) WHERE deleted_at IS NULL;
```

This keeps indexes small and queries fast because:
1. Deleted records are rarely queried
2. Index size is proportional to active data, not total data
3. PostgreSQL skips scanning deleted rows entirely

### Full-Text Search Indexes

```sql
-- Leads: searchable by name, email, company, phone
CREATE INDEX idx_leads_search ON leads USING GIN(
    to_tsvector('english',
        coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
        coalesce(email, '') || ' ' || coalesce(company_name, '') || ' ' || coalesce(phone, '')
    )
);

-- Query usage:
SELECT * FROM leads
WHERE to_tsvector('english',
    coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
    coalesce(email, '') || ' ' || coalesce(company_name, '')
) @@ plainto_tsquery('english', 'search term');
```

### Composite Indexes for Common Queries

```sql
-- Pipeline view: deals by pipeline + stage + assigned_to
CREATE INDEX idx_deals_pipeline_view ON deals(pipeline_id, stage_id, assigned_to)
    WHERE deleted_at IS NULL;

-- Dashboard: active deals per org
CREATE INDEX idx_deals_active ON deals(organization_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- Lead list: filter by status + sort by date
CREATE INDEX idx_leads_list ON leads(organization_id, status, created_at DESC)
    WHERE deleted_at IS NULL;
```

### Index Count Summary

| Table | Indexes | Reason |
|---|---|---|
| leads | 12 | Most queried table; full-text search; multiple filter combinations |
| deals | 13 | Pipeline queries; value sorting; multiple FK lookups |
| activities | 10 | Timeline queries; polymorphic FK lookups; due date queries |
| customers | 9 | Full-text search; status filtering; assignment queries |
| audit_logs | 5 | High-volume write table; entity lookups; date-range queries |
| Other tables | 3-6 each | Standard FK + filtered indexes |

---

## Normalization Analysis

### Current Normal Form: 3NF (Third Normal Form)

**First Normal Form (1NF):** All columns contain atomic values. No repeating groups.
- `tags` uses PostgreSQL arrays, which are atomic within the array type
- `attendees` in meetings uses UUID arrays (acceptable for PostgreSQL)
- `settings` uses JSONB, which is a structured column type (not a violation)

**Second Normal Form (2NF):** All non-key columns depend on the entire primary key.
- All tables use UUID single-column PKs, so no partial dependencies exist

**Third Normal Form (3NF):** No transitive dependencies (non-key -> non-key).

### Denormalization Decisions (Intentional)

| Table | Denormalized Column | Reason |
|---|---|---|
| deals | `pipeline_id` | Redundant with stage_id -> pipeline_stages -> pipeline_id, but avoids a JOIN for every deal query |
| deals | `probability` | Redundant with stage.probability, but allows per-deal overrides |
| invoices | `tax_amount` (generated) | Computed from subtotal * tax_rate; stored as generated column for performance |
| invoices | `total` (generated) | Computed from subtotal + tax - discount; stored for indexability |
| deal_products | `total` (generated) | Computed from quantity * unit_price * (1 - discount); stored for aggregation |
| invoice_line_items | `total` (generated) | Same as deal_products |
| pipeline_stages | `is_closed` (generated) | Computed from is_won OR is_lost; enables filtered indexes |

### Why Not 4NF/5NF?

The schema is practical for a CRM:
- Polymorphic FKs (activities, notes, attachments) intentionally break 4NF for application simplicity
- JSONB columns (custom_fields, settings) accept schema flexibility at the cost of normalization
- These are industry-standard trade-offs for CRUD applications

---

## Constraint Summary

### Primary Keys (33 tables)

Every table has a UUID primary key with `DEFAULT gen_random_uuid()`.

### Foreign Keys (85+)

| Category | Count | Behavior |
|---|---|---|
| CASCADE delete | 35 | Child record deleted when parent is deleted (e.g., user_roles when user deleted) |
| SET NULL | 12 | FK set to NULL when parent is deleted (e.g., lead.source_id when source deleted) |
| RESTRICT (default) | 38 | Prevents parent deletion if children exist (e.g., cannot delete org with users) |

### CHECK Constraints

| Constraint | Tables | Purpose |
|---|---|---|
| Status enums | leads, deals, activities, invoices, payments | Ensures valid status values |
| Numeric ranges | deals.value, pipeline_stages.probability, discounts | Prevents negative values and out-of-range percentages |
| Size options | organizations, customers | Standardized size categories |
| Time ordering | meetings | start_time must be before end_time |
| Date ordering | invoices | due_date must be after issued_date |
| Terminal stages | pipeline_stages | A stage cannot be both won AND lost |

### UNIQUE Constraints

| Constraint | Purpose |
|---|---|
| organizations.slug | URL-safe identifier must be unique |
| users(organization_id, email) | Email unique per organization (same email in different orgs is OK) |
| roles(organization_id, name) | Role names unique per organization |
| permissions(resource, action) | Each permission pair is global and unique |
| lead_sources(organization_id, name) | Source names unique per organization |
| pipelines(organization_id, name) | Pipeline names unique per organization |
| pipeline_stages(pipeline_id, key) | Stage keys unique per pipeline |
| pipeline_stages(pipeline_id, sort_order) | Sort order unique per pipeline |
| invoices(organization_id, invoice_number) | Invoice numbers unique per organization |
| settings(organization_id, key) | Setting keys unique per organization |

### Generated Columns

| Table | Column | Formula |
|---|---|---|
| pipeline_stages | is_closed | is_won OR is_lost |
| deal_products | total | quantity * unit_price * (1 - discount_pct / 100) |
| invoice_line_items | total | quantity * unit_price * (1 - discount_pct / 100) |
| invoices | tax_amount | subtotal * tax_rate / 100 |
| invoices | total | subtotal + tax_amount - discount_amount |

---

## Full PostgreSQL Schema

```sql
-- ============================================================
-- CRM Database Schema - PostgreSQL 16
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- Trigram for fuzzy search
CREATE EXTENSION IF NOT EXISTS "btree_gin";  -- GIN index support

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
```

---

## Table Count Summary

| Category | Tables | Description |
|---|---|---|
| **Identity & Access** | 9 | organizations, users, roles, permissions, role_permissions, user_roles, sessions, password_reset_tokens, email_verification_tokens |
| **Lead Management** | 2 | lead_sources, leads |
| **Customer Management** | 2 | customers, customer_contacts |
| **Deal Management** | 4 | pipelines, pipeline_stages, deals, deal_products |
| **Product & Financial** | 4 | products, invoices, invoice_line_items, payments |
| **Activity System** | 5 | activities, tasks, meetings, calls, notes |
| **Communication** | 3 | email_templates, email_logs, notifications |
| **System** | 4 | settings, audit_logs, attachments, reports |
| **Total** | **33** | + 2 views (activity_timeline, pipeline_summary) |
