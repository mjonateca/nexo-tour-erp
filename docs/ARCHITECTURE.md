# Architecture

Nexo Tour is a multi-tenant travel ERP built as a modular monolith first. Next.js App Router supplies the web UI, route handlers and server actions; domain use cases live outside UI components and depend on repository interfaces. PostgreSQL/Supabase is the system of record. Background work, mail, payments and supplier connectivity are adapter ports.

`app → features → domain/use-cases → repositories → PostgreSQL/adapters`. Cross-cutting concerns are authorization, audit, idempotency and observability. The monolith can split by bounded context without changing domain contracts.

Repository layout: `/app`, `/components`, `/features`, `/domain`, `/services`, `/repositories`, `/integrations`, `/lib`, `/validators`, `/database`, `/tests`, `/docs`.
