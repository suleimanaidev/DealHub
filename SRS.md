# Software Requirement Specification (SRS)
# Enterprise CRM System

| Field | Detail |
|---|---|
| **Document Version** | 1.0.0 |
| **Date** | July 27, 2026 |
| **Status** | Draft |
| **Classification** | Confidential |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [User Roles](#4-user-roles)
5. [Features](#5-features)
6. [Modules](#6-modules)
7. [Business Flow](#7-business-flow)
8. [Use Cases](#8-use-cases)
9. [Database Design](#9-database-design)
10. [API Design](#10-api-design)
11. [Folder Structure](#11-folder-structure)
12. [UI Pages](#12-ui-pages)
13. [User Journey](#13-user-journey)
14. [Dashboard Layout](#14-dashboard-layout)
15. [Security Plan](#15-security-plan)
16. [Deployment Plan](#16-deployment-plan)

---

## 1. Introduction

### 1.1 Purpose

This document defines the complete software requirements for a production-ready, enterprise-grade Customer Relationship Management (CRM) system delivered as a SaaS platform. It serves as the single source of truth for all engineering, design, and deployment decisions.

### 1.2 Scope

The CRM system enables businesses to manage leads, contacts, companies, deals, activities, communications, and analytics through a centralized platform. It supports multi-tenancy, role-based access control, and integrates with third-party services.

### 1.3 Tech Stack Decision

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router) | SSR/SSG, React Server Components, file-based routing, optimized performance |
| **UI Library** | Tailwind CSS + shadcn/ui | Utility-first CSS, accessible components, full customization |
| **State Management** | Zustand + React Query (TanStack Query) | Lightweight client state + server state cache management |
| **Backend** | Next.js API Routes + tRPC | Type-safe APIs, end-to-end type inference, co-located with frontend |
| **ORM** | Prisma | Type-safe database access, migrations, schema management |
| **Database** | PostgreSQL 16 | ACID compliance, JSON support, full-text search, proven reliability |
| **Cache** | Redis 7 | Session storage, rate limiting, query caching, real-time pub/sub |
| **Auth** | NextAuth.js (Auth.js) v5 | OAuth, credentials, session management, RBAC |
| **Search** | PostgreSQL FTS + pg_trgm | Full-text search, fuzzy matching, no external dependency |
| **Email** | Resend | Transactional email delivery |
| **File Storage** | S3-compatible (AWS S3 / MinIO) | Attachments, exports, documents |
| **Monitoring** | OpenTelemetry + Prometheus + Grafana | Distributed tracing, metrics, dashboards |
| **CI/CD** | GitHub Actions | Automated testing, building, deployment |
| **Containerization** | Docker + Docker Compose | Consistent environments, easy deployment |
| **Orchestration** | Kubernetes (production) | Horizontal scaling, self-healing, rolling updates |

### 1.4 Architecture Pattern

**Clean Architecture + Feature-Based Organization**

```
Presentation Layer (UI Components, Pages)
        |
Application Layer (Use Cases, Server Actions, tRPC Routers)
        |
Domain Layer (Entities, Value Objects, Business Rules)
        |
Infrastructure Layer (Database, External Services, Repositories)
```

Key principles:
- **Dependency Inversion**: Domain layer has zero external dependencies
- **Feature Modularity**: Each feature is self-contained (components, API, types, tests)
- **Shared Kernel**: Common utilities, types, and UI primitives in shared modules

---

## 2. Functional Requirements

### 2.1 Authentication & Authorization

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-001 | Users can register with email/password | P0 |
| FR-AUTH-002 | Users can log in with email/password | P0 |
| FR-AUTH-003 | Users can log in via Google OAuth | P1 |
| FR-AUTH-004 | Users can log in via Microsoft OAuth | P1 |
| FR-AUTH-005 | Password reset via email token (15min expiry) | P0 |
| FR-AUTH-006 | Email verification on registration | P0 |
| FR-AUTH-007 | JWT access tokens (15min expiry) + refresh tokens (7d expiry) | P0 |
| FR-AUTH-008 | Session management (view/revoke active sessions) | P1 |
| FR-AUTH-009 | Two-factor authentication (TOTP) | P2 |
| FR-AUTH-010 | RBAC enforcement on every API endpoint | P0 |
| FR-AUTH-011 | Account lockout after 5 failed attempts (15min cooldown) | P0 |

### 2.2 Lead Management

| ID | Requirement | Priority |
|---|---|---|
| FR-LEAD-001 | Create leads with: name, email, phone, company, source, status, assigned user | P0 |
| FR-LEAD-002 | Edit lead information | P0 |
| FR-LEAD-003 | Delete leads (soft delete, admin can hard delete) | P0 |
| FR-LEAD-004 | List leads with pagination, sorting, filtering, search | P0 |
| FR-LEAD-005 | Bulk import leads via CSV | P1 |
| FR-LEAD-006 | Export leads to CSV/Excel | P1 |
| FR-LEAD-007 | Lead status pipeline (New -> Contacted -> Qualified -> Unqualified) | P0 |
| FR-LEAD-008 | Lead scoring (manual + rule-based) | P2 |
| FR-LEAD-009 | Assign/reassign leads to users | P0 |
| FR-LEAD-010 | Lead source tracking (Referral, Website, Cold Call, Advertisement, etc.) | P0 |
| FR-LEAD-011 | Convert lead to contact + company + deal (atomic operation) | P0 |
| FR-LEAD-012 | Activity timeline per lead (calls, emails, notes, status changes) | P0 |
| FR-LEAD-013 | Duplicate detection on email/phone | P1 |

### 2.3 Contact Management

| ID | Requirement | Priority |
|---|---|---|
| FR-CON-001 | Create contacts with: name, email, phone, job title, company (FK), address | P0 |
| FR-CON-002 | Edit contact information | P0 |
| FR-CON-003 | Delete contacts (soft delete) | P0 |
| FR-CON-004 | List contacts with pagination, sorting, filtering, search | P0 |
| FR-CON-005 | View contact detail page with activity timeline | P0 |
| FR-CON-006 | Link/unlink contacts to companies | P0 |
| FR-CON-007 | Link contacts to deals | P0 |
| FR-CON-008 | Bulk import contacts via CSV | P1 |
| FR-CON-009 | Export contacts to CSV/Excel | P1 |
| FR-CON-010 | Contact avatar/photo upload | P2 |
| FR-CON-011 | Custom fields on contacts | P2 |
| FR-CON-012 | Contact merge (deduplication) | P2 |

### 2.4 Company Management

| ID | Requirement | Priority |
|---|---|---|
| FR-COMP-001 | Create companies with: name, domain, industry, size, address, phone, website | P0 |
| FR-COMP-002 | Edit company information | P0 |
| FR-COMP-003 | Delete companies (soft delete) | P0 |
| FR-COMP-004 | List companies with pagination, sorting, filtering, search | P0 |
| FR-COMP-005 | View company detail page with associated contacts and deals | P0 |
| FR-COMP-006 | Company hierarchy (parent company) | P2 |
| FR-COMP-007 | Logo upload | P2 |
| FR-COMP-008 | Auto enrichment from domain (future integration) | P3 |

### 2.5 Deal / Opportunity Management

| ID | Requirement | Priority |
|---|---|---|
| FR-DEAL-001 | Create deals with: title, value, stage, close date, associated contact/company | P0 |
| FR-DEAL-002 | Edit deal information | P0 |
| FR-DEAL-003 | Delete deals (soft delete) | P0 |
| FR-DEAL-004 | List deals with pagination, sorting, filtering, search | P0 |
| FR-DEAL-005 | Kanban board view (drag-and-drop between stages) | P0 |
| FR-DEAL-006 | Deal pipeline stages (configurable): Prospecting -> Qualification -> Proposal -> Negotiation -> Closed Won / Closed Lost | P0 |
| FR-DEAL-007 | Deal value tracking and forecasting | P1 |
| FR-DEAL-008 | Probability percentage per stage | P1 |
| FR-DEAL-009 | Expected revenue calculation (value x probability) | P1 |
| FR-DEAL-010 | Deal activity timeline | P0 |
| FR-DEAL-011 | Win/loss reason tracking | P1 |
| FR-DEAL-012 | Deal cloning | P2 |
| FR-DEAL-013 | Multi-currency support | P2 |

### 2.6 Activity Management

| ID | Requirement | Priority |
|---|---|---|
| FR-ACT-001 | Create activities: Call, Email, Meeting, Task, Note | P0 |
| FR-ACT-002 | Activities linked to leads, contacts, companies, deals | P0 |
| FR-ACT-003 | Activity scheduling with date/time | P0 |
| FR-ACT-004 | Activity completion status | P0 |
| FR-ACT-005 | Activity reminders/notifications | P1 |
| FR-ACT-006 | Recurring activities | P2 |
| FR-ACT-007 | Activity assignment to users | P0 |
| FR-ACT-008 | Global activity feed (all activities across entities) | P1 |

### 2.7 Email Integration

| ID | Requirement | Priority |
|---|---|---|
| FR-EMAIL-001 | Send emails from within CRM | P1 |
| FR-EMAIL-002 | Email templates with variables ({{contact.name}}) | P1 |
| FR-EMAIL-003 | Email tracking (opens, clicks) | P2 |
| FR-EMAIL-004 | Email sync (receive/store incoming emails) | P2 |
| FR-EMAIL-005 | Bulk email campaigns | P3 |

### 2.8 Notes & Attachments

| ID | Requirement | Priority |
|---|---|---|
| FR-NOTE-001 | Create rich-text notes on any entity | P0 |
| FR-NOTE-002 | Attach files (max 10MB per file, max 50MB total per entity) | P0 |
| FR-NOTE-003 | File type restrictions (pdf, doc, docx, png, jpg, csv, xlsx) | P0 |
| FR-NOTE-004 | Note versioning | P2 |

### 2.9 Reporting & Analytics

| ID | Requirement | Priority |
|---|---|---|
| FR-RPT-001 | Dashboard with KPIs: total leads, deals in pipeline, revenue, conversion rate | P0 |
| FR-RPT-002 | Revenue chart (monthly/quarterly/yearly) | P0 |
| FR-RPT-003 | Lead source breakdown (pie chart) | P0 |
| FR-RPT-004 | Pipeline value by stage (bar chart) | P0 |
| FR-RPT-005 | Activity summary (calls, emails, meetings per user) | P1 |
| FR-RPT-006 | Sales leaderboard | P1 |
| FR-RPT-007 | Conversion funnel (lead -> contact -> deal -> won) | P1 |
| FR-RPT-008 | Custom report builder | P3 |
| FR-RPT-009 | Report export (PDF, CSV) | P2 |
| FR-RPT-010 | Date range filtering on all reports | P0 |

### 2.10 Search

| ID | Requirement | Priority |
|---|---|---|
| FR-SRC-001 | Global search across leads, contacts, companies, deals | P0 |
| FR-SRC-002 | Fuzzy search (typo tolerance) | P1 |
| FR-SRC-003 | Search results grouped by entity type | P0 |
| FR-SRC-004 | Recent searches | P2 |

### 2.11 Notifications

| ID | Requirement | Priority |
|---|---|---|
| FR-NOT-001 | In-app notification center | P1 |
| FR-NOT-002 | Email notifications for assigned tasks | P1 |
| FR-NOT-003 | Real-time notifications via WebSocket | P2 |
| FR-NOT-004 | Notification preferences (per user) | P1 |

### 2.12 Organization & User Management

| ID | Requirement | Priority |
|---|---|---|
| FR-ORG-001 | Organization creation (tenant) on registration | P0 |
| FR-ORG-002 | Invite users to organization via email | P0 |
| FR-ORG-003 | Role management (create/edit/delete custom roles) | P1 |
| FR-ORG-004 | User profile management | P0 |
| FR-ORG-005 | Organization settings (name, logo, timezone, currency) | P0 |
| FR-ORG-006 | Pipeline stage configuration | P1 |
| FR-ORG-007 | Custom fields configuration | P2 |
| FR-ORG-008 | Audit log (who did what and when) | P1 |
| FR-ORG-009 | Data import/export at organization level | P1 |

---

## 3. Non-Functional Requirements

### 3.1 Performance

| ID | Requirement | Target |
|---|---|---|
| NFR-PERF-001 | API response time (p95) | < 200ms |
| NFR-PERF-002 | API response time (p99) | < 500ms |
| NFR-PERF-003 | Page load time (initial) | < 2s on 3G |
| NFR-PERF-004 | Time to Interactive (TTI) | < 3s |
| NFR-PERF-005 | Database query time (p95) | < 50ms |
| NFR-PERF-006 | Concurrent users per instance | 500+ |
| NFR-PERF-007 | Search response time | < 300ms |
| NFR-PERF-008 | File upload (10MB) | < 5s |

### 3.2 Scalability

| ID | Requirement |
|---|---|
| NFR-SCALE-001 | Horizontal scaling via container replicas |
| NFR-SCALE-002 | Database connection pooling (PgBouncer, max 100 connections) |
| NFR-SCALE-003 | Redis for session store and query caching |
| NFR-SCALE-004 | CDN for static assets |
| NFR-SCALE-005 | Lazy loading and code splitting on frontend |
| NFR-SCALE-006 | Database indexing on all filter/sort/search columns |
| NFR-SCALE-007 | Pagination on all list endpoints (max 100 per page) |

### 3.3 Availability

| ID | Requirement | Target |
|---|---|---|
| NFR-AVAIL-001 | System uptime | 99.9% (8.76h downtime/year) |
| NFR-AVAIL-002 | Recovery Time Objective (RTO) | < 1 hour |
| NFR-AVAIL-003 | Recovery Point Objective (RPO) | < 5 minutes |
| NFR-AVAIL-004 | Database automated backups | Every 5 minutes (WAL) + daily full |
| NFR-AVAIL-005 | Multi-AZ database deployment | Yes (production) |

### 3.4 Security

| ID | Requirement |
|---|---|
| NFR-SEC-001 | All data in transit encrypted (TLS 1.3) |
| NFR-SEC-002 | All data at rest encrypted (AES-256) |
| NFR-SEC-003 | OWASP Top 10 mitigation |
| NFR-SEC-004 | Input validation on all endpoints |
| NFR-SEC-005 | SQL injection prevention (Prisma parameterized queries) |
| NFR-SEC-006 | XSS prevention (React escaping + CSP headers) |
| NFR-SEC-007 | CSRF protection (SameSite cookies + CSRF tokens) |
| NFR-SEC-008 | Rate limiting (100 req/min per user, 1000 req/min per IP) |
| NFR-SEC-009 | Secrets management (env vars, never in code) |
| NFR-SEC-010 | Security headers (HSTS, X-Frame-Options, X-Content-Type-Options) |
| NFR-SEC-011 | Dependency vulnerability scanning (Dependabot/Snyk) |
| NFR-SEC-012 | RBAC enforcement on all operations |
| NFR-SEC-013 | Audit logging for all write operations |

### 3.5 Maintainability

| ID | Requirement |
|---|---|
| NFR-MAINT-001 | TypeScript strict mode (zero `any`) |
| NFR-MAINT-002 | ESLint + Prettier enforced in CI |
| NFR-MAINT-003 | Minimum 80% code coverage |
| NFR-MAINT-004 | Unit tests for domain logic |
| NFR-MAINT-005 | Integration tests for API endpoints |
| NFR-MAINT-006 | E2E tests for critical user flows |
| NFR-MAINT-007 | Storybook for UI component documentation |
| NFR-MAINT-008 | API documentation (OpenAPI/Swagger) |
| NFR-MAINT-009 | Conventional commits + automated changelog |

### 3.6 Usability

| ID | Requirement |
|---|---|
| NFR-USAB-001 | WCAG 2.1 AA compliance |
| NFR-USAB-002 | Keyboard navigation on all interactive elements |
| NFR-USAB-003 | Responsive design (desktop, tablet, mobile) |
| NFR-USAB-004 | Dark mode support |
| NFR-USAB-005 | Loading states on all async operations |
| NFR-USAB-006 | Optimistic UI updates where applicable |
| NFR-USAB-007 | Toast notifications for user actions |
| NFR-USAB-008 | Empty states with actionable CTAs |

---

## 4. User Roles

### 4.1 Role Hierarchy

```
Super Admin (Platform Level)
    └── System Admin (Organization Level)
            ├── Sales Manager
            │       └── Sales Representative
            ├── Marketing Manager
            │       └── Marketing Representative
            └── Support Agent
```

### 4.2 Role Definitions

| Role | Description | Scope |
|---|---|---|
| **Super Admin** | Platform operator. Manages all organizations, billing, platform settings. | Global |
| **System Admin** | Organization owner/admin. Manages users, roles, settings, data. | Own Organization |
| **Sales Manager** | Manages sales team. Views all team data, manages pipeline, reports. | Own Team + Reports |
| **Sales Representative** | Individual contributor. Manages assigned leads, contacts, deals. | Own Data |
| **Marketing Manager** | Manages campaigns, lead sources, marketing analytics. | Marketing Data |
| **Marketing Representative** | Executes campaigns, creates content. | Own Campaigns |
| **Support Agent** | Handles customer support tickets. | Support Data |

### 4.3 Permission Matrix

| Resource | Action | Super Admin | System Admin | Sales Mgr | Sales Rep | Marketing Mgr | Marketing Rep |
|---|---|---|---|---|---|---|---|
| **Users** | Create | Yes | Yes | No | No | No | No |
| | Read | All | Org | Team | Self | Org | Self |
| | Update | All | Org | Team | Self | Org | Self |
| | Delete | All | Org | No | No | No | No |
| | Invite | Yes | Yes | No | No | No | No |
| **Roles** | Manage | Yes | Yes | No | No | No | No |
| **Leads** | Create | Yes | Yes | Yes | Yes | Yes | Yes |
| | Read | All | Org | Team | Own | Org | Own |
| | Update | All | Org | Team | Own | Org | Own |
| | Delete | All | Org | Team | Own | No | No |
| | Assign | Yes | Yes | Yes | No | Yes | No |
| | Convert | Yes | Yes | Yes | Yes | No | No |
| **Contacts** | Create | Yes | Yes | Yes | Yes | Yes | Yes |
| | Read | All | Org | Team | Own | Org | Own |
| | Update | All | Org | Team | Own | Org | Own |
| | Delete | All | Org | Team | Own | No | No |
| **Companies** | Create | Yes | Yes | Yes | Yes | Yes | Yes |
| | Read | All | Org | All | All | All | All |
| | Update | All | Org | Team | Own | Org | Own |
| | Delete | All | Org | No | No | No | No |
| **Deals** | Create | Yes | Yes | Yes | Yes | No | No |
| | Read | All | Org | Team | Own | Org | No |
| | Update | All | Org | Team | Own | No | No |
| | Delete | All | Org | Team | Own | No | No |
| | Move Stage | Yes | Yes | Yes | Yes | No | No |
| **Activities** | Create | Yes | Yes | Yes | Yes | Yes | Yes |
| | Read | All | Org | Team | Own | Org | Own |
| | Update | All | Org | Team | Own | Org | Own |
| | Delete | All | Org | Team | Own | Own | Own |
| **Reports** | View | All | Org | Team | Self | Org | Self |
| | Export | All | Org | Team | No | Org | No |
| **Settings** | Org | No | Yes | No | No | No | No |
| | Pipeline | No | Yes | Yes | No | No | No |
| | Billing | No | Owner | No | No | No | No |
| **Audit Log** | View | All | Org | No | No | No | No |

### 4.4 Data Access Patterns

| Pattern | Description | Applied To |
|---|---|---|
| **Own Data** | User can only see records they created or are assigned to | Sales Rep activities, deals |
| **Team Data** | User can see records for users they manage | Sales Manager sees team leads/deals |
| **Org Data** | User can see all records within their organization | System Admin, Marketing Manager |
| **Global Data** | User can see data across all organizations | Super Admin only |

---

## 5. Features

### 5.1 Core Features (MVP - Phase 1)

| # | Feature | Module | Priority |
|---|---|---|---|
| F01 | Authentication (Login, Register, Password Reset) | Auth | P0 |
| F02 | Organization Setup (Create org, invite users) | Organization | P0 |
| F03 | User Profile Management | Organization | P0 |
| F04 | Role-Based Access Control | Auth | P0 |
| F05 | Lead Management CRUD | Leads | P0 |
| F06 | Lead Pipeline View | Leads | P0 |
| F07 | Lead Assignment | Leads | P0 |
| F08 | Lead Conversion (to Contact + Deal) | Leads | P0 |
| F09 | Contact Management CRUD | Contacts | P0 |
| F10 | Company Management CRUD | Companies | P0 |
| F11 | Deal Management CRUD | Deals | P0 |
| F12 | Deal Pipeline / Kanban Board | Deals | P0 |
| F13 | Activity Management (Calls, Emails, Meetings, Tasks, Notes) | Activities | P0 |
| F14 | Entity Activity Timelines | Activities | P0 |
| F15 | File Attachments | Notes | P0 |
| F16 | Global Search | Search | P0 |
| F17 | Dashboard with KPIs | Reports | P0 |
| F18 | Revenue & Pipeline Charts | Reports | P0 |
| F19 | Pagination, Sorting, Filtering, Search on all lists | Core | P0 |
| F20 | Soft Delete with Trash/Restore | Core | P0 |

### 5.2 Enhanced Features (Phase 2)

| # | Feature | Module | Priority |
|---|---|---|---|
| F21 | Email Integration (Send, Templates) | Email | P1 |
| F22 | Email Open/Click Tracking | Email | P2 |
| F23 | CSV/Excel Import (Leads, Contacts, Companies) | Import/Export | P1 |
| F24 | CSV/Excel Export | Import/Export | P1 |
| F25 | In-App Notification Center | Notifications | P1 |
| F26 | Email Notifications | Notifications | P1 |
| F27 | Sales Leaderboard | Reports | P1 |
| F28 | Activity Reports | Reports | P1 |
| F29 | Audit Log | Organization | P1 |
| F30 | Custom Pipeline Stages | Settings | P1 |
| F31 | Google OAuth Login | Auth | P1 |
| F32 | Microsoft OAuth Login | Auth | P1 |
| F33 | User Session Management | Auth | P1 |

### 5.3 Advanced Features (Phase 3)

| # | Feature | Module | Priority |
|---|---|---|---|
| F34 | Custom Fields | Settings | P2 |
| F35 | Lead Scoring | Leads | P2 |
| F36 | Real-time Notifications (WebSocket) | Notifications | P2 |
| F37 | Contact Merge (Deduplication) | Contacts | P2 |
| F38 | Two-Factor Authentication (TOTP) | Auth | P2 |
| F39 | Dark Mode | UI | P2 |
| F40 | Report Export (PDF) | Reports | P2 |
| F41 | Custom Report Builder | Reports | P3 |
| F42 | Bulk Email Campaigns | Email | P3 |
| F43 | Company Auto-Enrichment | Companies | P3 |

---

## 6. Modules

### 6.1 Module Dependency Graph

```
┌─────────────────────────────────────────────────────────┐
│                     CORE MODULES                         │
│                                                          │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │   Auth    │──▶│ Organization │──▶│  User Mgmt     │  │
│  └────┬─────┘   └──────────────┘   └────────────────┘  │
│       │                                                  │
│       ▼                                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │              BUSINESS MODULES                     │   │
│  │                                                   │   │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────────┐   │   │
│  │  │  Leads   │─▶│ Contacts │─▶│  Companies   │   │   │
│  │  └────┬────┘  └──────────┘  └──────────────┘   │   │
│  │       │                                          │   │
│  │       ▼                                          │   │
│  │  ┌──────────┐  ┌──────────────┐                 │   │
│  │  │  Deals   │  │  Activities  │                 │   │
│  │  └──────────┘  └──────────────┘                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              SUPPORTING MODULES                   │   │
│  │                                                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │   │
│  │  │ Reports  │  │  Search  │  │Notifications │  │   │
│  │  └──────────┘  └──────────┘  └──────────────┘  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │   │
│  │  │  Email   │  │  Import  │  │ Audit Log    │  │   │
│  │  │Integrat. │  │ /Export  │  │              │  │   │
│  │  └──────────┘  └──────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Module Descriptions

| Module | Responsibility | Key Entities |
|---|---|---|
| **Auth** | Authentication, authorization, sessions, RBAC | User, Role, Permission, Session, Token |
| **Organization** | Tenant management, settings, team | Organization, Invitation, Settings |
| **Leads** | Lead capture, tracking, pipeline, conversion | Lead, LeadStatus, LeadSource |
| **Contacts** | Contact database, relationship management | Contact, ContactField |
| **Companies** | Company/Account management | Company, CompanyHierarchy |
| **Deals** | Deal/opportunity pipeline, forecasting | Deal, DealStage, DealActivity |
| **Activities** | Tasks, calls, emails, meetings, notes | Activity, ActivityType, Attachment |
| **Reports** | Analytics, dashboards, charts | Report, Dashboard, KPI |
| **Search** | Global search, fuzzy matching | SearchIndex, SearchQuery |
| **Notifications** | In-app, email notifications | Notification, NotificationPreference |
| **Email** | Email sending, templates, tracking | EmailTemplate, EmailLog |
| **Import/Export** | CSV/Excel data operations | ImportJob, ExportJob |
| **Audit Log** | Change tracking, compliance | AuditEntry |

---

## 7. Business Flow

### 7.1 Lead-to-Cash Flow

```
                    ┌──────────────┐
                    │  Lead Source  │
                    │  (Web Form,  │
                    │  Import,     │
                    │  Manual)     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   New Lead   │
                    │   Created    │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │   Assigned   │
                    │   to User    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Contacted   │◀──── Activities logged
                    │  (Call/Email)│      (calls, emails)
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │ Qualified?   │
                    └──┬────────┬──┘
                  Yes  │        │  No
                       ▼        ▼
            ┌──────────┐   ┌──────────┐
            │ Convert  │   │Mark as   │
            │ to Contact│  │Unquali-  │
            │ + Deal   │   │fied      │
            └────┬─────┘   └──────────┘
                 │
                 ▼
        ┌────────────────┐
        │  Deal Created  │
        │  in Pipeline   │
        └───────┬────────┘
                │
    ┌───────────┼───────────────────────┐
    │           │                       │
    ▼           ▼                       ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
│Prospec-│ │Qualifi-│ │Propo-  │ │Negotia-  │
│ting    │▶│cation  │▶│sal     │▶│tion      │
└────────┘ └────────┘ └────────┘ └────┬─────┘
                                      │
                              ┌───────┴───────┐
                              │               │
                              ▼               ▼
                       ┌────────────┐  ┌────────────┐
                       │  CLOSED    │  │  CLOSED    │
                       │  WON       │  │  LOST      │
                       └────────────┘  └────────────┘
```

### 7.2 User Onboarding Flow

```
New User Registers
       │
       ▼
Email Verification ──(Resend if expired)──▶ Re-register
       │
       ▼
Create Organization ──── OR ──── Join via Invitation
       │                              │
       ▼                              ▼
Set Org Name,              Accept Invitation
Currency, Timezone                  │
       │                           ▼
       ▼                    Assigned Role + Team
Invite Team Members                  │
       │                             ▼
       ▼                      Start Using CRM
Configure Pipeline Stages
       │
       ▼
Dashboard Overview
```

### 7.3 Lead Conversion Flow (Detailed)

```
Lead Detail Page
       │
       ▼
[Convert Lead] Button
       │
       ▼
┌──────────────────────────────────┐
│   Conversion Modal               │
│                                  │
│  ☑ Create Contact                │
│    - First Name: [auto-fill]     │
│    - Last Name:  [auto-fill]     │
│    - Email:      [auto-fill]     │
│    - Phone:      [auto-fill]     │
│                                  │
│  ☑ Create Company                │
│    - Name: [auto-fill]           │
│    - OR link to existing         │
│                                  │
│  ☑ Create Deal                   │
│    - Title: [auto-fill]          │
│    - Value: [input]              │
│    - Stage: [Prospecting]        │
│                                  │
│  [Cancel]  [Convert Lead]        │
└──────────────────────────────────┘
       │
       ▼ (Atomic Transaction)
┌──────────────────────────────────┐
│ 1. Lead status -> Converted      │
│ 2. Contact created               │
│ 3. Company created/linked        │
│ 4. Deal created                  │
│ 5. Activities transferred        │
│ 6. Redirect to Deal page         │
└──────────────────────────────────┘
```

### 7.4 Deal Pipeline Drag-and-Drop Flow

```
Kanban Board View
       │
       ▼
User drags Deal Card from Stage A to Stage B
       │
       ▼
Optimistic UI Update (card moves immediately)
       │
       ▼
API Call: PATCH /api/deals/:id { stage: "new_stage" }
       │
       ├──> Success: Toast "Deal moved to [Stage B]"
       │
       └──> Failure: Revert card position, Toast "Failed to move deal"
```

---

## 8. Use Cases

### UC-01: Register and Set Up Organization

| Field | Detail |
|---|---|
| **Actor** | New User (Organization Admin) |
| **Precondition** | User does not have an account |
| **Flow** | 1. Navigate to /register |
| | 2. Enter name, email, password |
| | 3. Submit form |
| | 4. Receive verification email |
| | 5. Click verification link |
| | 6. Redirected to /onboarding |
| | 7. Enter organization name, industry, size, timezone, currency |
| | 8. Submit organization details |
| | 9. Redirected to /dashboard |
| **Postcondition** | Organization created, user is System Admin |
| **Alternate Flow** | 5a. Token expired -> Resend verification email |
| **Exception Flow** | 2a. Email already exists -> Show error |

### UC-02: Create and Manage Leads

| Field | Detail |
|---|---|
| **Actor** | Sales Representative |
| **Precondition** | User is authenticated, has lead creation permission |
| **Flow** | 1. Navigate to /leads |
| | 2. Click [New Lead] |
| | 3. Fill in lead form (name, email, phone, company, source) |
| | 4. Submit form |
| | 5. Lead created, appears in list |
| | 6. User adds activities (call notes, follow-up tasks) |
| | 7. Changes status through pipeline |
| **Postcondition** | Lead exists in system with activity history |

### UC-03: Convert Lead to Deal

| Field | Detail |
|---|---|
| **Actor** | Sales Representative |
| **Precondition** | Lead exists, status is Qualified |
| **Flow** | 1. Open lead detail page |
| | 2. Click [Convert Lead] |
| | 3. Verify pre-filled contact info |
| | 4. Select/create company |
| | 5. Enter deal value and title |
| | 6. Confirm conversion |
| | 7. Redirected to new deal page |
| **Postcondition** | Contact + Company + Deal created, Lead marked Converted |

### UC-04: Manage Deal Pipeline

| Field | Detail |
|---|---|
| **Actor** | Sales Manager / Sales Representative |
| **Precondition** | Deals exist in pipeline |
| **Flow** | 1. Navigate to /deals (Kanban view) |
| | 2. View deals organized by stage |
| | 3. Drag deal from one stage to another |
| | 4. System updates deal stage |
| | 5. Pipeline metrics update in real-time |
| **Postcondition** | Deal stage updated, reports reflect change |

### UC-05: View Reports and Analytics

| Field | Detail |
|---|---|
| **Actor** | Sales Manager / System Admin |
| **Precondition** | Sufficient data exists |
| **Flow** | 1. Navigate to /dashboard or /reports |
| | 2. View KPI cards (total leads, pipeline value, conversion rate) |
| | 3. Select date range filter |
| | 4. Charts update with filtered data |
| | 5. Export report if needed |
| **Postcondition** | User has visibility into sales performance |

### UC-06: Send Team Invitation

| Field | Detail |
|---|---|
| **Actor** | System Admin |
| **Precondition** | User is authenticated as System Admin |
| **Flow** | 1. Navigate to /settings/team |
| | 2. Click [Invite Member] |
| | 3. Enter email address and select role |
| | 4. Send invitation |
| | 5. Invitee receives email with invite link |
| | 6. Invitee clicks link, creates account (or logs in) |
| | 7. Invitee is added to organization with assigned role |
| **Postcondition** | New team member added to organization |

### UC-07: Global Search

| Field | Detail |
|---|---|
| **Actor** | Any authenticated user |
| **Precondition** | User is authenticated |
| **Flow** | 1. Press Ctrl+K or click search bar |
| | 2. Type search query |
| | 3. Results appear grouped by entity type (Leads, Contacts, Companies, Deals) |
| | 4. Click result to navigate to entity detail page |
| **Postcondition** | User navigated to desired record |

### UC-08: Import Leads from CSV

| Field | Detail |
|---|---|
| **Actor** | Sales Manager / System Admin |
| **Precondition** | User has import permission |
| **Flow** | 1. Navigate to /leads |
| | 2. Click [Import] |
| | 3. Download CSV template |
| | 4. Fill template with lead data |
| | 5. Upload filled CSV |
| | 6. System validates data, shows preview with errors |
| | 7. User confirms import |
| | 8. System processes import in background |
| | 9. User notified when import completes |
| **Postcondition** | Leads created from CSV data |

---

## 9. Database Design

### 9.1 Entity Relationship Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Organization │────<│    User       │────<│   Session    │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                            ├──< Role >──< Permission >
                            │
                            ├──< Lead >
                            ├──< Contact >
                            ├──< Deal >
                            ├──< Activity >
                            └──< AuditLog >
```

### 9.2 Table Definitions

#### 9.2.1 Organizations (Tenants)

```sql
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    domain          VARCHAR(255),
    logo_url        TEXT,
    industry        VARCHAR(100),
    size            VARCHAR(50),
    timezone        VARCHAR(50) DEFAULT 'UTC',
    currency        VARCHAR(3) DEFAULT 'USD',
    website         TEXT,
    phone           VARCHAR(50),
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    postal_code     VARCHAR(20),
    country         VARCHAR(100),
    plan            VARCHAR(50) DEFAULT 'free',
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at);
```

#### 9.2.2 Users

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    avatar_url      TEXT,
    phone           VARCHAR(50),
    job_title       VARCHAR(100),
    is_active       BOOLEAN DEFAULT true,
    is_owner        BOOLEAN DEFAULT false,
    email_verified  BOOLEAN DEFAULT false,
    last_login_at   TIMESTAMP,
    timezone        VARCHAR(50),
    preferences     JSONB DEFAULT '{}',
    failed_login_attempts INT DEFAULT 0,
    locked_until    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP,

    CONSTRAINT uq_users_org_email UNIQUE (organization_id, email)
);

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
```

#### 9.2.3 Roles and Permissions

```sql
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_system       BOOLEAN DEFAULT false,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_roles_org_name UNIQUE (organization_id, name)
);

CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource        VARCHAR(50) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    description     TEXT,

    CONSTRAINT uq_permissions_resource_action UNIQUE (resource, action)
);

CREATE TABLE role_permissions (
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    scope           VARCHAR(20) DEFAULT 'own',

    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

    PRIMARY KEY (user_id, role_id)
);
```

**Seed Permissions:**
```sql
('lead', 'create'), ('lead', 'read'), ('lead', 'update'), ('lead', 'delete'),
('lead', 'assign'), ('lead', 'convert'), ('lead', 'export'), ('lead', 'import'),
('contact', 'create'), ('contact', 'read'), ('contact', 'update'), ('contact', 'delete'),
('contact', 'export'), ('contact', 'import'),
('company', 'create'), ('company', 'read'), ('company', 'update'), ('company', 'delete'),
('company', 'export'), ('company', 'import'),
('deal', 'create'), ('deal', 'read'), ('deal', 'update'), ('deal', 'delete'),
('deal', 'export'),
('activity', 'create'), ('activity', 'read'), ('activity', 'update'), ('activity', 'delete'),
('report', 'read'), ('report', 'export'),
('user', 'create'), ('user', 'read'), ('user', 'update'), ('user', 'delete'), ('user', 'invite'),
('settings', 'read'), ('settings', 'update'),
('role', 'create'), ('role', 'read'), ('role', 'update'), ('role', 'delete'),
('audit', 'read'),
('notification', 'read'), ('notification', 'update');
```

#### 9.2.4 Leads

```sql
CREATE TABLE leads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    company_name    VARCHAR(255),
    job_title       VARCHAR(100),
    website         TEXT,
    source          VARCHAR(50) NOT NULL DEFAULT 'manual',
    status          VARCHAR(50) NOT NULL DEFAULT 'new',
    score           INT DEFAULT 0,
    assigned_to     UUID REFERENCES users(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    converted_at    TIMESTAMP,
    converted_contact_id UUID,
    converted_deal_id    UUID,
    custom_fields   JSONB DEFAULT '{}',
    tags            TEXT[] DEFAULT '{}',
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_leads_organization_id ON leads(organization_id);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_email ON leads(organization_id, email);
CREATE INDEX idx_leads_created_at ON leads(organization_id, created_at DESC);
CREATE INDEX idx_leads_deleted_at ON leads(deleted_at);
CREATE INDEX idx_leads_search ON leads USING gin(
    to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(company_name, ''))
);
```

#### 9.2.5 Contacts

```sql
CREATE TABLE contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    mobile          VARCHAR(50),
    job_title       VARCHAR(100),
    department      VARCHAR(100),
    company_id      UUID REFERENCES companies(id),
    avatar_url      TEXT,
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    postal_code     VARCHAR(20),
    country         VARCHAR(100),
    birthday        DATE,
    lead_id         UUID REFERENCES leads(id),
    custom_fields   JSONB DEFAULT '{}',
    tags            TEXT[] DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_email ON contacts(organization_id, email);
CREATE INDEX idx_contacts_created_at ON contacts(organization_id, created_at DESC);
CREATE INDEX idx_contacts_deleted_at ON contacts(deleted_at);
CREATE INDEX idx_contacts_search ON contacts USING gin(
    to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(job_title, ''))
);
```

#### 9.2.6 Companies

```sql
CREATE TABLE companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name            VARCHAR(255) NOT NULL,
    domain          VARCHAR(255),
    industry        VARCHAR(100),
    size            VARCHAR(50),
    revenue         NUMERIC(15,2),
    phone           VARCHAR(50),
    website         TEXT,
    logo_url        TEXT,
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    postal_code     VARCHAR(20),
    country         VARCHAR(100),
    parent_company_id UUID REFERENCES companies(id),
    description     TEXT,
    custom_fields   JSONB DEFAULT '{}',
    tags            TEXT[] DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_companies_organization_id ON companies(organization_id);
CREATE INDEX idx_companies_name ON companies(organization_id, name);
CREATE INDEX idx_companies_domain ON companies(organization_id, domain);
CREATE INDEX idx_companies_deleted_at ON companies(deleted_at);
CREATE INDEX idx_companies_search ON companies USING gin(
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(domain, '') || ' ' || coalesce(industry, ''))
);
```

#### 9.2.7 Deals

```sql
CREATE TABLE deals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    title           VARCHAR(255) NOT NULL,
    value           NUMERIC(15,2) DEFAULT 0,
    currency        VARCHAR(3) DEFAULT 'USD',
    stage           VARCHAR(50) NOT NULL DEFAULT 'prospecting',
    probability     INT DEFAULT 0,
    close_date      DATE,
    actual_close_date DATE,
    contact_id      UUID REFERENCES contacts(id),
    company_id      UUID REFERENCES companies(id),
    lead_id         UUID REFERENCES leads(id),
    assigned_to     UUID REFERENCES users(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    win_reason      TEXT,
    loss_reason     TEXT,
    lost_reason_category VARCHAR(100),
    custom_fields   JSONB DEFAULT '{}',
    tags            TEXT[] DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_deals_organization_id ON deals(organization_id);
CREATE INDEX idx_deals_stage ON deals(organization_id, stage);
CREATE INDEX idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_company_id ON deals(company_id);
CREATE INDEX idx_deals_close_date ON deals(close_date);
CREATE INDEX idx_deals_created_at ON deals(organization_id, created_at DESC);
CREATE INDEX idx_deals_deleted_at ON deals(deleted_at);
CREATE INDEX idx_deals_search ON deals USING gin(
    to_tsvector('english', coalesce(title, ''))
);
```

#### 9.2.8 Activities

```sql
CREATE TABLE activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    type            VARCHAR(50) NOT NULL,
    subject         VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(50) DEFAULT 'pending',
    priority        VARCHAR(20) DEFAULT 'medium',
    due_date        TIMESTAMP,
    completed_at    TIMESTAMP,
    assigned_to     UUID REFERENCES users(id),
    created_by      UUID NOT NULL REFERENCES users(id),

    -- Polymorphic association
    lead_id         UUID REFERENCES leads(id),
    contact_id      UUID REFERENCES contacts(id),
    company_id      UUID REFERENCES companies(id),
    deal_id         UUID REFERENCES deals(id),

    -- Type-specific fields
    call_duration   INT,
    call_outcome    VARCHAR(50),
    email_from      VARCHAR(255),
    email_to        VARCHAR(255),
    email_subject   VARCHAR(255),
    email_body      TEXT,
    meeting_location VARCHAR(255),
    meeting_start    TIMESTAMP,
    meeting_end      TIMESTAMP,

    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_activities_organization_id ON activities(organization_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_assigned_to ON activities(assigned_to);
CREATE INDEX idx_activities_lead_id ON activities(lead_id);
CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_activities_company_id ON activities(company_id);
CREATE INDEX idx_activities_deal_id ON activities(deal_id);
CREATE INDEX idx_activities_due_date ON activities(due_date) WHERE status = 'pending';
CREATE INDEX idx_activities_created_at ON activities(organization_id, created_at DESC);
CREATE INDEX idx_activities_deleted_at ON activities(deleted_at);
```

#### 9.2.9 Attachments

```sql
CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    filename        VARCHAR(255) NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    size            BIGINT NOT NULL,
    storage_key     TEXT NOT NULL,
    uploaded_by     UUID NOT NULL REFERENCES users(id),

    lead_id         UUID REFERENCES leads(id),
    contact_id      UUID REFERENCES contacts(id),
    company_id      UUID REFERENCES companies(id),
    deal_id         UUID REFERENCES deals(id),
    activity_id     UUID REFERENCES activities(id),

    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attachments_lead_id ON attachments(lead_id);
CREATE INDEX idx_attachments_contact_id ON attachments(contact_id);
CREATE INDEX idx_attachments_deal_id ON attachments(deal_id);
CREATE INDEX idx_attachments_activity_id ON attachments(activity_id);
```

#### 9.2.10 Notifications

```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    type            VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    is_read         BOOLEAN DEFAULT false,
    read_at         TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read, created_at DESC);
```

#### 9.2.11 Audit Log

```sql
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    action          VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    entity_name     VARCHAR(255),
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
```

#### 9.2.12 Sessions and Tokens

```sql
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(500) NOT NULL UNIQUE,
    refresh_token   VARCHAR(500) NOT NULL UNIQUE,
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    last_active_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE password_reset_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(500) NOT NULL UNIQUE,
    expires_at      TIMESTAMP NOT NULL,
    used_at         TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE email_verification_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(500) NOT NULL UNIQUE,
    expires_at      TIMESTAMP NOT NULL,
    verified_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### 9.2.13 Invitations

```sql
CREATE TABLE invitations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    email           VARCHAR(255) NOT NULL,
    role_id         UUID NOT NULL REFERENCES roles(id),
    invited_by      UUID NOT NULL REFERENCES users(id),
    token           VARCHAR(500) NOT NULL UNIQUE,
    status          VARCHAR(20) DEFAULT 'pending',
    expires_at      TIMESTAMP NOT NULL,
    accepted_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_organization_id ON invitations(organization_id);
```

#### 9.2.14 Email Templates and Logs

```sql
CREATE TABLE email_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name            VARCHAR(255) NOT NULL,
    subject         VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    variables       TEXT[] DEFAULT '{}',
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

CREATE TABLE email_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    template_id     UUID REFERENCES email_templates(id),
    from_email      VARCHAR(255) NOT NULL,
    to_email        VARCHAR(255) NOT NULL,
    subject         VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',
    sent_at         TIMESTAMP,
    delivered_at    TIMESTAMP,
    opened_at       TIMESTAMP,
    clicked_at      TIMESTAMP,
    error           TEXT,
    metadata        JSONB DEFAULT '{}',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_logs_organization_id ON email_logs(organization_id, created_at DESC);
```

### 9.3 Database Schema Summary

| Table | Purpose | Est. Rows (1yr, Mid-size) |
|---|---|---|
| organizations | Tenants | 100-1,000 |
| users | All users | 1,000-10,000 |
| roles | System + custom roles | 500-5,000 |
| permissions | RBAC permissions | ~40 (fixed) |
| role_permissions | Role-permission mapping | 200-2,000 |
| user_roles | User-role mapping | 1,000-10,000 |
| leads | All leads | 50,000-500,000 |
| contacts | All contacts | 50,000-500,000 |
| companies | All companies | 10,000-100,000 |
| deals | All deals | 10,000-100,000 |
| activities | All activities | 100,000-1,000,000 |
| attachments | File attachments | 50,000-500,000 |
| notifications | User notifications | 200,000-2,000,000 |
| audit_logs | Change tracking | 500,000-5,000,000 |
| sessions | Active sessions | 1,000-10,000 |

---

## 10. API Design

### 10.1 API Architecture

- **Protocol**: tRPC (type-safe) over HTTP
- **Fallback**: REST API routes for external integrations
- **Authentication**: Bearer JWT (Access Token) in Authorization header
- **Content-Type**: application/json
- **Versioning**: URL path (`/api/v1/...`) for REST; tRPC router versioning

### 10.2 Conventions

| Convention | Standard |
|---|---|
| List endpoints return | `{ data: T[], meta: { total, page, pageSize, totalPages } }` |
| Single resource returns | `{ data: T }` |
| Errors return | `{ error: { code: string, message: string, details?: any } }` |
| HTTP Status 200 | Successful read/update |
| HTTP Status 201 | Successful create |
| HTTP Status 204 | Successful delete |
| HTTP Status 400 | Validation error |
| HTTP Status 401 | Unauthenticated |
| HTTP Status 403 | Unauthorized (RBAC) |
| HTTP Status 404 | Not found |
| HTTP Status 409 | Conflict (duplicate) |
| HTTP Status 422 | Unprocessable entity |
| HTTP Status 429 | Rate limited |
| HTTP Status 500 | Internal server error |
| Pagination params | `?page=1&pageSize=20` |
| Sorting params | `?sort=created_at&order=desc` |
| Filtering params | `?status=new&source=website&assignedTo=user-id` |
| Search params | `?q=search+term` |

### 10.3 Authentication Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login with credentials | No |
| POST | `/api/v1/auth/logout` | Revoke session | Yes |
| POST | `/api/v1/auth/refresh` | Refresh access token | Yes (refresh) |
| POST | `/api/v1/auth/forgot-password` | Request password reset | No |
| POST | `/api/v1/auth/reset-password` | Reset password with token | No |
| GET | `/api/v1/auth/verify-email/:token` | Verify email address | No |
| POST | `/api/v1/auth/resend-verification` | Resend verification email | No |
| GET | `/api/v1/auth/sessions` | List active sessions | Yes |
| DELETE | `/api/v1/auth/sessions/:id` | Revoke a session | Yes |

### 10.4 User Endpoints

| Method | Endpoint | Description | Auth | RBAC |
|---|---|---|---|---|
| GET | `/api/v1/users` | List organization users | Yes | user:read |
| GET | `/api/v1/users/:id` | Get user by ID | Yes | user:read |
| PATCH | `/api/v1/users/:id` | Update user | Yes | user:update |
| DELETE | `/api/v1/users/:id` | Deactivate user | Yes | user:delete |
| POST | `/api/v1/users/:id/invite` | Send invitation | Yes | user:invite |
| PATCH | `/api/v1/users/:id/role` | Update user role | Yes | user:update |
| GET | `/api/v1/users/me` | Get current user profile | Yes | - |
| PATCH | `/api/v1/users/me` | Update own profile | Yes | - |
| POST | `/api/v1/users/me/avatar` | Upload avatar | Yes | - |

### 10.5 Organization Endpoints

| Method | Endpoint | Description | Auth | RBAC |
|---|---|---|---|---|
| GET | `/api/v1/organizations/current` | Get current org | Yes | - |
| PATCH | `/api/v1/organizations/current` | Update org settings | Yes | settings:update |
| POST | `/api/v1/organizations` | Create organization | Yes | - |

### 10.6 Lead Endpoints

| Method | Endpoint | Description | Auth | RBAC |
|---|---|---|---|---|
| GET | `/api/v1/leads` | List leads | Yes | lead:read |
| POST | `/api/v1/leads` | Create lead | Yes | lead:create |
| GET | `/api/v1/leads/:id` | Get lead by ID | Yes | lead:read |
| PATCH | `/api/v1/leads/:id` | Update lead | Yes | lead:update |
| DELETE | `/api/v1/leads/:id` | Delete lead | Yes | lead:delete |
| POST | `/api/v1/leads/:id/assign` | Assign lead | Yes | lead:assign |
| POST | `/api/v1/leads/:id/convert` | Convert lead | Yes | lead:convert |
| GET | `/api/v1/leads/:id/activities` | Get lead activities | Yes | lead:read |
| POST | `/api/v1/leads/import` | Import leads from CSV | Yes | lead:import |
| GET | `/api/v1/leads/export` | Export leads to CSV | Yes | lead:export |
| GET | `/api/v1/leads/stats` | Get lead statistics | Yes | lead:read |

**Query Parameters for List:**
```
?search=john
&status=new,contacted
&source=website,referral
&assignedTo=user-id-1
&createdAfter=2026-01-01
&createdBefore=2026-12-31
&sort=created_at
&order=desc
&page=1
&pageSize=20
```

### 10.7 Contact Endpoints

| Method | Endpoint | Description | Auth | RBAC |
|---|---|---|---|---|
| GET | `/api/v1/contacts` | List contacts | Yes | contact:read |
| POST | `/api/v1/contacts` | Create contact | Yes | contact:create |
| GET | `/api/v1/contacts/:id` | Get contact by ID | Yes | contact:read |
| PATCH | `/api/v1/contacts/:id` | Update contact | Yes | contact:update |
| DELETE | `/api/v1/contacts/:id` | Delete contact | Yes | contact:delete |
| GET | `/api/v1/contacts/:id/deals` | Get contact deals | Yes | contact:read |
| GET | `/api/v1/contacts/:id/activities` | Get contact activities | Yes | contact:read |
| POST | `/api/v1/contacts/import` | Import contacts from CSV | Yes | contact:import |
| GET | `/api/v1/contacts/export` | Export contacts to CSV | Yes | contact:export |

### 10.8 Company Endpoints

| Method | Endpoint | Description | Auth | RBAC |
|---|---|---|---|---|
| GET | `/api/v1/companies` | List companies | Yes | company:read |
| POST | `/api/v1/companies` | Create company | Yes | company:create |
| GET | `/api/v1/companies/:id` | Get company by ID | Yes | company:read |
| PATCH | `/api/v1/companies/:id` | Update company | Yes | company:update |
| DELETE | `/api/v1/companies/:id` | Delete company | Yes | company:delete |
| GET | `/api/v1/companies/:id/contacts` | Get company contacts | Yes | company:read |
| GET | `/api/v1/companies/:id/deals` | Get company deals | Yes | company:read |
| POST | `/api/v1/companies/import` | Import companies from CSV | Yes | company:import |
| GET | `/api/v1/companies/export` | Export companies to CSV | Yes | company:export |

### 10.9 Deal Endpoints

| Method | Endpoint | Description | Auth | RBAC |
|---|---|---|---|---|
| GET | `/api/v1/deals` | List deals | Yes | deal:read |
| POST | `/api/v1/deals` | Create deal | Yes | deal:create |
| GET | `/api/v1/deals/:id` | Get deal by ID | Yes | deal:read |
| PATCH | `/api/v1/deals/:id` | Update deal (incl. stage) | Yes | deal:update |
| DELETE | `/api/v1/deals/:id` | Delete deal | Yes | deal:delete |
| POST | `/api/v1/deals/:id/assign` | Assign deal | Yes | deal:update |
| GET | `/api/v1/deals/:id/activities` | Get deal activities | Yes | deal:read |
| GET | `/api/v1/deals/pipeline` | Get pipeline summary | Yes | deal:read |
| GET | `/api/v1/deals/stats` | Get deal statistics | Yes | deal:read |
| GET | `/api/v1/deals/export` | Export deals to CSV | Yes | deal:export |

**Kanban Pipeline Query:**
```
GET /api/v1/deals/pipeline?group_by=stage
Response:
{
  "stages": [
    {
      "stage": "prospecting",
      "label": "Prospecting",
      "deal_count": 12,
      "total_value": 150000,
      "deals": [...]
    }
  ]
}
```

### 10.10 Activity Endpoints

| Method | Endpoint | Description | Auth | RBAC |
|---|---|---|---|---|
| GET | `/api/v1/activities` | List activities (global) | Yes | activity:read |
| POST | `/api/v1/activities` | Create activity | Yes | activity:create |
| GET | `/api/v1/activities/:id` | Get activity by ID | Yes | activity:read |
| PATCH | `/api/v1/activities/:id` | Update activity | Yes | activity:update |
| DELETE | `/api/v1/activities/:id` | Delete activity | Yes | activity:delete |
| PATCH | `/api/v1/activities/:id/complete` | Mark complete | Yes | activity:update |
| GET | `/api/v1/activities/my` | Get user activities | Yes | activity:read |

### 10.11 Search Endpoint

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/search?q=term` | Global search across all entities | Yes |

**Response:**
```json
{
  "data": {
    "leads": [{ "id": "...", "name": "...", "email": "..." }],
    "contacts": [...],
    "companies": [...],
    "deals": [...]
  },
  "meta": { "total": 42, "query": "search term", "took_ms": 12 }
}
```

### 10.12 Report Endpoints

| Method | Endpoint | Description | Auth | RBAC |
|---|---|---|---|---|
| GET | `/api/v1/reports/dashboard` | Dashboard KPI data | Yes | report:read |
| GET | `/api/v1/reports/pipeline` | Pipeline analytics | Yes | report:read |
| GET | `/api/v1/reports/revenue` | Revenue report | Yes | report:read |
| GET | `/api/v1/reports/leads` | Lead analytics | Yes | report:read |
| GET | `/api/v1/reports/activities` | Activity summary | Yes | report:read |
| GET | `/api/v1/reports/team` | Team performance | Yes | report:read |
| GET | `/api/v1/reports/export` | Export report | Yes | report:export |

### 10.13 Notification Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/notifications` | List notifications | Yes |
| PATCH | `/api/v1/notifications/:id/read` | Mark as read | Yes |
| PATCH | `/api/v1/notifications/read-all` | Mark all as read | Yes |
| GET | `/api/v1/notifications/unread-count` | Get unread count | Yes |

### 10.14 Settings Endpoints

| Method | Endpoint | Description | Auth | RBAC |
|---|---|---|---|---|
| GET | `/api/v1/settings/pipeline` | Get pipeline stages | Yes | settings:read |
| PUT | `/api/v1/settings/pipeline` | Update pipeline stages | Yes | settings:update |
| GET | `/api/v1/settings/roles` | List roles | Yes | role:read |
| POST | `/api/v1/settings/roles` | Create role | Yes | role:create |
| PATCH | `/api/v1/settings/roles/:id` | Update role | Yes | role:update |
| DELETE | `/api/v1/settings/roles/:id` | Delete role | Yes | role:delete |
| GET | `/api/v1/settings/custom-fields` | Get custom fields | Yes | settings:read |
| POST | `/api/v1/settings/custom-fields` | Create custom field | Yes | settings:update |

### 10.15 File Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/files/upload` | Upload file | Yes |
| GET | `/api/v1/files/:id` | Get file metadata | Yes |
| GET | `/api/v1/files/:id/download` | Download file | Yes |
| DELETE | `/api/v1/files/:id` | Delete file | Yes |

### 10.16 Audit Log Endpoints

| Method | Endpoint | Description | Auth | RBAC |
|---|---|---|---|---|
| GET | `/api/v1/audit-logs` | List audit logs | Yes | audit:read |

**Filters:** `?userId=user-id&action=update&entityType=deal&startDate=2026-07-01&endDate=2026-07-31`

---

## 11. Folder Structure

```
crm/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── cd-staging.yml
│   │   └── cd-production.yml
│   ├── pull_request_template.md
│   └── CODEOWNERS
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── placeholders/
│
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (auth)/                    # Auth route group
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   ├── verify-email/page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/               # Authenticated route group
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── leads/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── contacts/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── companies/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── deals/
│   │   │   │   ├── page.tsx           # Kanban
│   │   │   │   ├── list/page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── activities/
│   │   │   │   ├── page.tsx
│   │   │   │   └── my/page.tsx
│   │   │   ├── reports/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [type]/page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── team/page.tsx
│   │   │   │   ├── roles/page.tsx
│   │   │   │   ├── pipeline/page.tsx
│   │   │   │   ├── custom-fields/page.tsx
│   │   │   │   ├── billing/page.tsx
│   │   │   │   └── audit-log/page.tsx
│   │   │   └── notifications/page.tsx
│   │   │
│   │   ├── (onboarding)/
│   │   │   ├── layout.tsx
│   │   │   └── onboarding/page.tsx
│   │   │
│   │   ├── api/[...trpc]/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   └── globals.css
│   │
│   ├── server/                        # Server-side code
│   │   ├── trpc/
│   │   │   ├── index.ts
│   │   │   ├── context.ts
│   │   │   ├── router.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── rbac.ts
│   │   │   │   ├── rateLimit.ts
│   │   │   │   └── audit.ts
│   │   │   └── routers/
│   │   │       ├── auth.router.ts
│   │   │       ├── user.router.ts
│   │   │       ├── organization.router.ts
│   │   │       ├── lead.router.ts
│   │   │       ├── contact.router.ts
│   │   │       ├── company.router.ts
│   │   │       ├── deal.router.ts
│   │   │       ├── activity.router.ts
│   │   │       ├── search.router.ts
│   │   │       ├── notification.router.ts
│   │   │       ├── report.router.ts
│   │   │       ├── settings.router.ts
│   │   │       ├── audit.router.ts
│   │   │       └── file.router.ts
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── organization.service.ts
│   │   │   ├── lead.service.ts
│   │   │   ├── contact.service.ts
│   │   │   ├── company.service.ts
│   │   │   ├── deal.service.ts
│   │   │   ├── activity.service.ts
│   │   │   ├── search.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── report.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── file.service.ts
│   │   │   ├── import.service.ts
│   │   │   └── audit.service.ts
│   │   │
│   │   ├── repositories/
│   │   │   ├── auth.repository.ts
│   │   │   ├── user.repository.ts
│   │   │   ├── organization.repository.ts
│   │   │   ├── lead.repository.ts
│   │   │   ├── contact.repository.ts
│   │   │   ├── company.repository.ts
│   │   │   ├── deal.repository.ts
│   │   │   ├── activity.repository.ts
│   │   │   ├── notification.repository.ts
│   │   │   └── audit.repository.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── prisma.ts
│   │   │   ├── redis.ts
│   │   │   ├── jwt.ts
│   │   │   ├── email.ts
│   │   │   ├── storage.ts
│   │   │   ├── queue.ts
│   │   │   └── errors.ts
│   │   │
│   │   └── validators/
│   │       ├── auth.schema.ts
│   │       ├── lead.schema.ts
│   │       ├── contact.schema.ts
│   │       ├── company.schema.ts
│   │       ├── deal.schema.ts
│   │       ├── activity.schema.ts
│   │       ├── user.schema.ts
│   │       ├── organization.schema.ts
│   │       ├── settings.schema.ts
│   │       └── common.schema.ts
│   │
│   ├── client/                        # Client-side code
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui primitives
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── form.tsx
│   │   │   │   ├── popover.tsx
│   │   │   │   ├── command.tsx
│   │   │   │   ├── sheet.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── tooltip.tsx
│   │   │   │   ├── calendar.tsx
│   │   │   │   ├── scroll-area.tsx
│   │   │   │   └── alert-dialog.tsx
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── header.tsx
│   │   │   │   ├── breadcrumb.tsx
│   │   │   │   ├── command-menu.tsx
│   │   │   │   ├── notification-bell.tsx
│   │   │   │   ├── user-nav.tsx
│   │   │   │   └── mobile-nav.tsx
│   │   │   │
│   │   │   ├── data-table/
│   │   │   │   ├── data-table.tsx
│   │   │   │   ├── data-table-toolbar.tsx
│   │   │   │   ├── data-table-pagination.tsx
│   │   │   │   ├── data-table-column-header.tsx
│   │   │   │   ├── data-table-row-actions.tsx
│   │   │   │   └── data-table-empty.tsx
│   │   │   │
│   │   │   ├── forms/
│   │   │   │   ├── entity-form-layout.tsx
│   │   │   │   ├── search-input.tsx
│   │   │   │   ├── date-range-picker.tsx
│   │   │   │   ├── multi-select.tsx
│   │   │   │   └── file-upload.tsx
│   │   │   │
│   │   │   ├── charts/
│   │   │   │   ├── bar-chart.tsx
│   │   │   │   ├── line-chart.tsx
│   │   │   │   ├── pie-chart.tsx
│   │   │   │   └── area-chart.tsx
│   │   │   │
│   │   │   └── shared/
│   │   │       ├── error-boundary.tsx
│   │   │       ├── loading-spinner.tsx
│   │   │       ├── empty-state.tsx
│   │   │       ├── confirm-dialog.tsx
│   │   │       ├── toast-provider.tsx
│   │   │       ├── relative-time.tsx
│   │   │       └── entity-avatar.tsx
│   │   │
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── login-form.tsx
│   │   │   │   ├── register-form.tsx
│   │   │   │   ├── forgot-password-form.tsx
│   │   │   │   └── reset-password-form.tsx
│   │   │   ├── leads/
│   │   │   │   ├── lead-list.tsx
│   │   │   │   ├── lead-table-columns.tsx
│   │   │   │   ├── lead-form.tsx
│   │   │   │   ├── lead-detail.tsx
│   │   │   │   ├── lead-sidebar.tsx
│   │   │   │   ├── lead-convert-modal.tsx
│   │   │   │   ├── lead-status-badge.tsx
│   │   │   │   └── lead-filters.tsx
│   │   │   ├── contacts/
│   │   │   │   ├── contact-list.tsx
│   │   │   │   ├── contact-table-columns.tsx
│   │   │   │   ├── contact-form.tsx
│   │   │   │   ├── contact-detail.tsx
│   │   │   │   └── contact-filters.tsx
│   │   │   ├── companies/
│   │   │   │   ├── company-list.tsx
│   │   │   │   ├── company-table-columns.tsx
│   │   │   │   ├── company-form.tsx
│   │   │   │   ├── company-detail.tsx
│   │   │   │   └── company-filters.tsx
│   │   │   ├── deals/
│   │   │   │   ├── deal-kanban.tsx
│   │   │   │   ├── deal-kanban-column.tsx
│   │   │   │   ├── deal-kanban-card.tsx
│   │   │   │   ├── deal-list.tsx
│   │   │   │   ├── deal-table-columns.tsx
│   │   │   │   ├── deal-form.tsx
│   │   │   │   ├── deal-detail.tsx
│   │   │   │   ├── deal-sidebar.tsx
│   │   │   │   ├── deal-stage-badge.tsx
│   │   │   │   └── deal-filters.tsx
│   │   │   ├── activities/
│   │   │   │   ├── activity-list.tsx
│   │   │   │   ├── activity-form.tsx
│   │   │   │   ├── activity-timeline.tsx
│   │   │   │   ├── activity-item.tsx
│   │   │   │   ├── activity-type-icon.tsx
│   │   │   │   └── activity-filters.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── kpi-cards.tsx
│   │   │   │   ├── revenue-chart.tsx
│   │   │   │   ├── pipeline-chart.tsx
│   │   │   │   ├── lead-source-chart.tsx
│   │   │   │   ├── recent-activity.tsx
│   │   │   │   ├── upcoming-tasks.tsx
│   │   │   │   └── team-performance.tsx
│   │   │   ├── reports/
│   │   │   │   ├── report-filters.tsx
│   │   │   │   ├── report-header.tsx
│   │   │   │   └── report-empty.tsx
│   │   │   ├── settings/
│   │   │   │   ├── general-settings.tsx
│   │   │   │   ├── team-management.tsx
│   │   │   │   ├── role-management.tsx
│   │   │   │   ├── pipeline-settings.tsx
│   │   │   │   ├── custom-fields-settings.tsx
│   │   │   │   └── audit-log-view.tsx
│   │   │   ├── notifications/
│   │   │   │   ├── notification-list.tsx
│   │   │   │   └── notification-item.tsx
│   │   │   ├── search/
│   │   │   │   ├── global-search-modal.tsx
│   │   │   │   └── search-results.tsx
│   │   │   └── import-export/
│   │   │       ├── csv-import-modal.tsx
│   │   │       ├── import-preview.tsx
│   │   │       └── export-button.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── use-debounce.ts
│   │   │   ├── use-local-storage.ts
│   │   │   ├── use-media-query.ts
│   │   │   ├── use-confirm.ts
│   │   │   └── use-search-params.ts
│   │   │
│   │   ├── stores/
│   │   │   ├── auth.store.ts
│   │   │   ├── ui.store.ts
│   │   │   └── search.store.ts
│   │   │
│   │   └── lib/
│   │       ├── trpc.ts
│   │       ├── utils.ts
│   │       ├── constants.ts
│   │       ├── validators.ts
│   │       └── export.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── enums.ts
│   │
│   └── env.mjs
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
│
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── docker-compose.yml
│
├── scripts/
│   ├── seed.ts
│   ├── migrate.ts
│   └── generate-types.ts
│
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── playwright.config.ts
├── vitest.config.ts
├── package.json
└── README.md
```

### 11.1 Folder Structure Principles

| Principle | Application |
|---|---|
| **Feature-Based Organization** | Each domain entity has its own feature folder |
| **Co-location** | Related code lives together |
| **Separation of Concerns** | `server/` = server-side; `client/` = client-side |
| **Layered Architecture** | Routers -> Services -> Repositories -> Database |
| **Shared UI Primitives** | `components/ui/` = reusable generic components |
| **Shared Layout Components** | `components/layout/` = app shell components |
| **Type Safety** | `types/` = shared types; Zod generates types from schemas |
| **No Circular Dependencies** | `types/` and `components/ui/` never import from `features/` |

---

## 12. UI Pages

### 12.1 Page Map

| Route | Page | Auth Required | Layout |
|---|---|---|---|
| `/` | Landing / Marketing page | No | Public |
| `/login` | Login | No | Auth layout |
| `/register` | Register | No | Auth layout |
| `/forgot-password` | Forgot Password | No | Auth layout |
| `/reset-password/:token` | Reset Password | No | Auth layout |
| `/verify-email/:token` | Email Verification | No | Auth layout |
| `/onboarding` | Organization Setup | Yes | Onboarding layout |
| `/dashboard` | Main Dashboard | Yes | Dashboard layout |
| `/leads` | Lead List | Yes | Dashboard layout |
| `/leads/new` | Create Lead | Yes | Dashboard layout |
| `/leads/:id` | Lead Detail | Yes | Dashboard layout |
| `/contacts` | Contact List | Yes | Dashboard layout |
| `/contacts/new` | Create Contact | Yes | Dashboard layout |
| `/contacts/:id` | Contact Detail | Yes | Dashboard layout |
| `/companies` | Company List | Yes | Dashboard layout |
| `/companies/new` | Create Company | Yes | Dashboard layout |
| `/companies/:id` | Company Detail | Yes | Dashboard layout |
| `/deals` | Deal Pipeline (Kanban) | Yes | Dashboard layout |
| `/deals/list` | Deal List (Table) | Yes | Dashboard layout |
| `/deals/new` | Create Deal | Yes | Dashboard layout |
| `/deals/:id` | Deal Detail | Yes | Dashboard layout |
| `/activities` | Global Activity Feed | Yes | Dashboard layout |
| `/activities/my` | My Activities | Yes | Dashboard layout |
| `/reports` | Reports Overview | Yes | Dashboard layout |
| `/reports/:type` | Specific Report | Yes | Dashboard layout |
| `/settings` | General Settings | Yes | Dashboard layout |
| `/settings/team` | Team Management | Yes | Dashboard layout |
| `/settings/roles` | Role Management | Yes | Dashboard layout |
| `/settings/pipeline` | Pipeline Configuration | Yes | Dashboard layout |
| `/settings/custom-fields` | Custom Fields | Yes | Dashboard layout |
| `/settings/billing` | Billing | Yes | Dashboard layout |
| `/settings/audit-log` | Audit Log | Yes | Dashboard layout |
| `/notifications` | Notifications | Yes | Dashboard layout |

### 12.2 Page Descriptions

#### Login Page (`/login`)
- Email + password form with "Remember me" checkbox
- "Forgot password?" link and "Sign up" link
- Google/Microsoft OAuth buttons
- Split layout: form on left, branding/illustration on right

#### Register Page (`/register`)
- First name, last name, email, password, confirm password
- Password strength indicator
- Terms of service checkbox
- Split layout matching login

#### Dashboard (`/dashboard`)
- KPI cards row: Total Leads, Active Deals, Revenue (MTD), Conversion Rate
- Revenue trend chart (line, monthly)
- Deal pipeline chart (bar chart by stage)
- Lead source breakdown (donut chart)
- Recent activity feed (timeline)
- Upcoming tasks (list)
- Team performance leaderboard (top 5)

#### Lead List (`/leads`)
- Data table: Name, Email, Company, Source, Status, Assigned To, Created Date
- Toolbar: Search, Status filter, Source filter, Assigned To filter, Date range
- Bulk actions: Assign, Delete, Export
- "New Lead" button and CSV Import button
- Row click navigates to detail

#### Lead Detail (`/leads/:id`)
- Header: Lead name, status badge, score, action buttons (Edit, Convert, Delete)
- Left panel: Contact information card
- Right panel: Activity timeline
- Tabs: Activities, Notes, Attachments
- Convert Lead modal

#### Deal Pipeline (`/deals`)
- Kanban board with draggable columns per pipeline stage
- Cards show: Deal title, value, assigned user avatar, close date
- Column headers: Stage name, deal count, total value
- Drag between columns updates stage
- Quick filters: Assigned to, Date range, Value range

#### Deal Detail (`/deals/:id`)
- Header: Deal title, stage badge, value, probability
- Left panel: Deal info (value, stage, contact, company, dates)
- Right panel: Activity timeline
- Stage progression indicator
- Win/Loss actions (negotiation stage)

#### Settings Pages
- **General**: Organization name, logo, timezone, currency, website
- **Team**: User table, invite button, role assignment, deactivate
- **Roles**: Role list, create/edit role, permission matrix toggle
- **Pipeline**: Drag-and-drop stage reordering, add/remove/rename stages
- **Custom Fields**: Entity selector, field type picker, field configuration
- **Billing**: Current plan, usage, upgrade/downgrade
- **Audit Log**: Filterable log of all organization actions

---

## 13. User Journey

### 13.1 New User: First-Time Experience

```
1. VISIT LANDING PAGE
   -> Read features, pricing, testimonials
   -> Click "Get Started Free"

2. REGISTER
   -> Fill name, email, password
   -> Accept terms -> Submit
   -> Check email for verification

3. VERIFY EMAIL
   -> Click link in email
   -> Account verified -> Auto-login

4. ONBOARDING
   -> Enter organization name
   -> Select industry and size
   -> Set timezone and currency
   -> Optional: Import CSV / Invite team members

5. EMPTY DASHBOARD (with onboarding checklist)
   -> Checklist: Create first lead, Add a contact,
     Create a deal, Invite a team member

6. FIRST ACTIONS
   -> User creates first lead manually
   -> Adds activities to lead
   -> Qualifies lead, converts to deal
   -> Sees deal in pipeline
   -> Dashboard starts showing data

7. RECURRING USAGE
   -> Daily: Check dashboard, review activities
   -> Weekly: Review pipeline, reports
   -> As needed: Create leads, manage deals
   -> Monthly: Review team performance
```

### 13.2 Sales Rep: Daily Workflow

```
LOGIN
  -> CHECK DASHBOARD (quick scan of KPIs)
  -> REVIEW UPCOMING TASKS
  -> WORK LEADS (filter "Assigned to me", call, log activity, update status)
  -> MANAGE DEALS (open pipeline, move deals, update values)
  -> LOG ACTIVITIES (create task, log meeting, upload attachment)
  -> END OF DAY (review completed activities, check tomorrow)
```

### 13.3 Sales Manager: Weekly Workflow

```
MONDAY MORNING
  -> CHECK TEAM DASHBOARD (revenue vs target, pipeline value, conversion rates)
  -> REVIEW TEAM ACTIVITIES (activity leaderboard, identify low activity)
  -> PIPELINE REVIEW (Kanban board, review deals, reassign if needed)
  -> REPORTS (run weekly pipeline report, export for leadership)
  -> TEAM MANAGEMENT (review new leads, assign to reps, check metrics)
```

---

## 14. Dashboard Layout

### 14.1 App Shell Layout

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER                                                      │
│  [Logo]  [Search (Cmd+K)]           [Bell] [Avatar] [Settings]│
├──────────┬───────────────────────────────────────────────────┤
│          │                                                   │
│ SIDEBAR  │              MAIN CONTENT AREA                    │
│          │                                                   │
│ Dashboard│  Breadcrumb: Dashboard > Leads > Lead Name        │
│ Leads    │                                                   │
│ Contacts │         [Page Content Here]                       │
│ Companies│                                                   │
│ Deals    │                                                   │
│ Activities                                                   │
│ Reports  │                                                   │
│ Settings │                                                   │
│          │  Footer / Status Bar                              │
└──────────┴───────────────────────────────────────────────────┘
```

### 14.2 Sidebar Navigation

```
┌─────────────────┐
│  [Logo] CRM     │
│                  │
│  --- MAIN ---   │
│  Dashboard      │
│  --- SALES ---  │
│  Leads          │
│  Contacts       │
│  Companies      │
│  Deals          │
│  --- ACTIVITY --│
│  Activities     │
│  --- ANALYTICS -│
│  Reports        │
│  --- SYSTEM --- │
│  Settings       │
│                  │
│  [User Avatar]  │
│  Name / Role    │
└─────────────────┘
```

**Sidebar Behavior:**
- Collapsible to icon-only mode
- Active item highlighted with accent color
- Badge counters on Leads, Activities, Notifications
- Mobile: Sheet (slide-over) component

### 14.3 Dashboard Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                              [Date Range Picker] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Total Leads]  [Active Deals]  [Revenue MTD]  [Conv. Rate] │
│   1,234          56              $125,400       24.5%        │
│   +12%           +8%             +23%           +2.1%        │
│                                                              │
│  [Revenue Trend - Line Chart]  [Pipeline by Stage - Bar]     │
│                                                              │
│  [Lead Sources - Donut]        [Recent Activity - Timeline]  │
│                                                              │
│  [Upcoming Tasks - List]       [Team Leaderboard - Table]    │
└─────────────────────────────────────────────────────────────┘
```

### 14.4 Kanban Board Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Deal Pipeline              [+ New Deal] [Filter] [List View]   │
│  Total: $425,000  |  33 Deals  |  Avg Deal: $12,878            │
├──────────────┬──────────────┬──────────────┬──────────────┬──────┤
│ PROSPECTING  │ QUALIFICATION│ PROPOSAL     │ NEGOTIATION  │ WON  │
│ 12 | $150K   │ 8 | $120K    │ 6 | $95K     │ 4 | $40K     │3|$20K│
├──────────────┼──────────────┼──────────────┼──────────────┼──────┤
│ [Card]       │ [Card]       │ [Card]       │ [Card]       │[Card]│
│ [Card]       │ [Card]       │ [Card]       │ [Card]       │[Card]│
│ [Card]       │ [Card]       │ [Card]       │              │[Card]│
│ (scroll)     │ (scroll)     │ (scroll)     │              │      │
└──────────────┴──────────────┴──────────────┴──────────────┴──────┘
```

---

## 15. Security Plan

### 15.1 Authentication Security

| Measure | Implementation |
|---|---|
| **Password Hashing** | bcrypt with 12 salt rounds |
| **Password Policy** | Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char |
| **JWT Access Token** | 15-minute expiry, signed with RS256 |
| **JWT Refresh Token** | 7-day expiry, stored in httpOnly secure cookie |
| **Token Rotation** | Refresh token rotated on each use |
| **Session Management** | Max 5 active sessions per user; revoke on password change |
| **Brute Force Protection** | 5 failed attempts -> 15min lockout; progressive delays |
| **Account Enumeration** | Generic error messages ("Invalid email or password") |
| **Email Verification** | Required before any access; token expires in 24h |
| **Password Reset** | Token expires in 15min; single-use; invalidates on change |
| **Secure Cookies** | httpOnly, secure, sameSite: strict, path: / |

### 15.2 Authorization Security

| Measure | Implementation |
|---|---|
| **RBAC Enforcement** | Middleware on every API endpoint; not optional |
| **Tenant Isolation** | Every query includes organization_id filter; enforced at repository level |
| **Resource-Level Access** | Users access only own data or team data based on role |
| **Least Privilege** | Default role has minimal permissions; explicitly grant more |
| **Permission Check Order** | 1. Authenticated? -> 2. Has permission? -> 3. Has resource access? |
| **Admin Protection** | Only org owner can delete org; only super admin for billing |
| **Role Immutability** | System roles cannot be deleted |

### 15.3 API Security

| Measure | Implementation |
|---|---|
| **Rate Limiting** | 100 req/min per user; 1000 req/min per IP; 10 req/min for auth |
| **Input Validation** | Zod schemas on every endpoint; reject unknown fields |
| **SQL Injection** | Prisma ORM (parameterized queries); no raw SQL |
| **XSS Prevention** | React auto-escaping; CSP headers; sanitize user HTML |
| **CSRF Protection** | SameSite cookies; CSRF token for state-changing operations |
| **File Upload Security** | Max 10MB; allowlist of MIME types |
| **Request Size Limits** | Max 1MB JSON body; max 50MB multipart |
| **CORS Configuration** | Allowlist of trusted origins only |
| **Security Headers** | HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff |
| **Error Handling** | Never expose stack traces; log internally |

### 15.4 Data Security

| Measure | Implementation |
|---|---|
| **Encryption at Rest** | AES-256 for database; S3 encryption |
| **Encryption in Transit** | TLS 1.3 for all connections; enforce HTTPS |
| **Secrets Management** | Environment variables; never in code |
| **Database Access** | Connection pool via PgBouncer; no direct internet access |
| **Soft Delete** | All major entities soft-deleted; hard delete by admin only |
| **Data Retention** | Audit logs: 2 years; Notifications: 90 days; Sessions: 30 days |

### 15.5 Infrastructure Security

| Measure | Implementation |
|---|---|
| **Container Security** | Non-root user; minimal base image (Alpine); scan with Trivy |
| **Dependency Scanning** | Dependabot + Snyk; block PRs with critical/high vulnerabilities |
| **Network Security** | VPC; private subnets for database/Redis |
| **DDoS Protection** | CDN with DDoS mitigation (Cloudflare/AWS Shield) |
| **WAF** | Web Application Firewall for OWASP Top 10 |
| **Database Firewall** | Allow connections only from application subnet |

### 15.6 Monitoring and Incident Response

| Measure | Implementation |
|---|---|
| **Application Logging** | Structured JSON logs; correlation IDs; no PII in logs |
| **Error Tracking** | Sentry; real-time alerts for 5xx errors |
| **Audit Logging** | All write operations logged; immutable; queryable |
| **Login Monitoring** | Log all auth events; alert on suspicious patterns |
| **Performance Monitoring** | APM with request tracing; slow query alerts |
| **Uptime Monitoring** | Health checks every 60s; alert on downtime |

---

## 16. Deployment Plan

### 16.1 Environment Strategy

| Environment | Purpose | Infrastructure | Database |
|---|---|---|---|
| **Local Development** | Individual development | Docker Compose | Local PostgreSQL 16 |
| **Feature Branch** | PR review and testing | Preview Deployments | Shared dev DB (isolated schema) |
| **Staging** | Pre-production validation | Mirrors production (scaled down) | Separate PostgreSQL |
| **Production** | Live system | Full HA setup | Managed PostgreSQL (RDS/Neon) |

### 16.2 Infrastructure Architecture

```
                    ┌──────────────┐
                    │   Cloudflare  │
                    │   (CDN + WAF) │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Load Balancer│
                    │  (ALB / NLB)  │
                    └──────┬───────┘
                           │
                   ┌───────┼───────┐
                   │       │       │
             ┌─────▼──┐ ┌──▼──┐ ┌──▼─────┐
             │  App 1  │ │App 2│ │ App 3  │
             └─────┬──┘ └──┬──┘ └──┬─────┘
                   │       │       │
             ┌─────▼───────▼───────▼─────┐
             │     Internal Network       │
             │  [Redis] [PostgreSQL]      │
             │  [S3]    [Workers]         │
             └────────────────────────────┘
```

### 16.3 CI/CD Pipeline

```
Push / PR Created
    |
    v
[CI: Lint + Type Check + Tests + Build]
    |
    v (Pass)
PR Approved & Merged to main
    |
    v
[Deploy to STAGING]
  1. Run DB migrations
  2. Build production
  3. Deploy containers
  4. Run smoke tests
    |
    v (Manual approval gate)
[Deploy to PRODUCTION]
  1. Tag release
  2. Run DB migrations
  3. Rolling deploy (zero downtime)
  4. Health checks pass? -> Done / Auto rollback
```

### 16.4 Deployment Strategy

| Aspect | Strategy |
|---|---|
| **Zero-Downtime Deploy** | Rolling update with health check gate |
| **Database Migrations** | Forward-only; backward-compatible; expand-contract pattern |
| **Rollback** | Auto-rollback if health checks fail; manual via CI |
| **Feature Flags** | LaunchDarkly / Unleash for gradual rollouts |
| **Canary Deploy** | 10% -> 50% -> 100% (Phase 2) |

### 16.5 Scaling Strategy

| Component | Scaling Method | Trigger |
|---|---|---|
| Application | Horizontal (add replicas) | CPU > 70% or requests > 500/min |
| PostgreSQL | Vertical -> Read replicas | Connections > 80%; latency > 100ms |
| Redis | Cluster mode (sharding) | Memory > 70% |
| Workers | Horizontal (add replicas) | Queue depth > 1000 |

### 16.6 Monitoring and Alerting

| Metric | Alert Threshold | Action |
|---|---|---|
| API error rate (5xx) | > 1% in 5 minutes | Page on-call engineer |
| API latency (p99) | > 1s for 5 minutes | Investigate; scale |
| Database CPU | > 80% for 10 minutes | Scale up / add replica |
| Memory usage | > 85% for 5 minutes | Scale up / investigate |
| Failed login attempts | > 50 from single IP in 10min | Block IP; investigate |

### 16.7 Backup and Recovery

| Component | Backup Method | Frequency | Retention |
|---|---|---|---|
| PostgreSQL | WAL archiving + pg_dump | Continuous + Daily | 30 days |
| Redis | RDB snapshots | Hourly | 7 days |
| S3/MinIO | Versioning + cross-region replication | Continuous | 90 days |
| Application Config | Git | On every change | Indefinite |
| Audit Logs | Separate table | Continuous | 2 years |

### 16.8 Cost Estimation (AWS - Mid-size, 100 users)

| Service | Estimated Monthly Cost |
|---|---|
| ECS Fargate (3 tasks) | $150-300 |
| RDS PostgreSQL (db.t3.medium) | $100-200 |
| ElastiCache Redis (cache.t3.micro) | $30-50 |
| S3 Storage | $5-10 |
| CloudFront CDN | $10-30 |
| ALB | $20-40 |
| Route53 | $1-5 |
| Secrets Manager | $5-10 |
| CloudWatch / Monitoring | $20-50 |
| **Total** | **~$340-695/mo** |

---

## Appendix A: Environment Variables

```env
# Application
NODE_ENV=production
APP_URL=https://app.yourcrm.com
API_URL=https://api.yourcrm.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/crm?schema=public
DATABASE_SSL=true

# Redis
REDIS_URL=redis://:password@host:6379

# Authentication
NEXTAUTH_SECRET=<random-64-char-string>
NEXTAUTH_URL=https://app.yourcrm.com
JWT_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<random-64-char-string>

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Email
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM=noreply@yourcrm.com

# File Storage
STORAGE_PROVIDER=s3
S3_BUCKET=
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_ENDPOINT=

# Monitoring
SENTRY_DSN=

# Rate Limiting
RATE_LIMIT_PER_USER=100
RATE_LIMIT_PER_IP=1000
```

## Appendix B: Default Pipeline Stages

```json
{
  "stages": [
    { "key": "prospecting", "label": "Prospecting", "order": 1, "probability": 10 },
    { "key": "qualification", "label": "Qualification", "order": 2, "probability": 25 },
    { "key": "proposal", "label": "Proposal", "order": 3, "probability": 50 },
    { "key": "negotiation", "label": "Negotiation", "order": 4, "probability": 75 },
    { "key": "closed_won", "label": "Closed Won", "order": 5, "probability": 100 },
    { "key": "closed_lost", "label": "Closed Lost", "order": 6, "probability": 0 }
  ]
}
```

## Appendix C: Default Roles (Seed Data)

```json
{
  "roles": [
    {
      "name": "System Admin",
      "is_system": true,
      "description": "Full access to all organization settings and data",
      "permissions": ["all"]
    },
    {
      "name": "Sales Manager",
      "is_system": true,
      "description": "Manages sales team and pipeline",
      "permissions": {
        "lead": ["create", "read", "update", "delete", "assign", "convert", "export"],
        "contact": ["create", "read", "update", "delete", "export"],
        "company": ["create", "read", "update"],
        "deal": ["create", "read", "update", "delete", "export"],
        "activity": ["create", "read", "update", "delete"],
        "report": ["read", "export"],
        "user": ["read"],
        "settings": ["read"],
        "notification": ["read", "update"]
      },
      "default_scope": "team"
    },
    {
      "name": "Sales Representative",
      "is_system": true,
      "description": "Individual sales contributor",
      "permissions": {
        "lead": ["create", "read", "update", "delete", "convert"],
        "contact": ["create", "read", "update"],
        "company": ["create", "read", "update"],
        "deal": ["create", "read", "update"],
        "activity": ["create", "read", "update", "delete"],
        "notification": ["read", "update"]
      },
      "default_scope": "own"
    },
    {
      "name": "Marketing Manager",
      "is_system": true,
      "description": "Manages marketing campaigns and lead sources",
      "permissions": {
        "lead": ["create", "read", "update", "assign", "export"],
        "contact": ["create", "read", "update", "export"],
        "company": ["create", "read", "update"],
        "activity": ["create", "read", "update"],
        "report": ["read", "export"],
        "notification": ["read", "update"]
      },
      "default_scope": "org"
    }
  ]
}
```

---

*End of Document*
