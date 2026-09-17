# Architecture & Technology Decisions (ADR)

**Project:** Hemo Match  
**Challenge:** SC-12 — District Blood Donor Matching  
**Phase:** Foundation Milestone  

This document records the core architectural and technology choices locked for **Hemo Match**, along with the technical rationale for each decision.

---

## 1. Core Framework: Next.js (App Router)

* **Decision:** Use Next.js (latest App Router) with React 19.
* **Rationale:**
  * Unified full-stack framework offering Server Components for fast data rendering and Server Actions / Route Handlers for backend operations.
  * Eliminates separate frontend/backend repo overhead for hackathon delivery.
  * Standardized routing, built-in SEO metadata management, and optimal caching controls.

---

## 2. Programming Language: Strict TypeScript

* **Decision:** Enforce TypeScript with `"strict": true` across the entire codebase.
* **Rationale:**
  * Blood matching domains deal with strict categorical data (blood groups, urgency tiers, donation intervals, contact reveal statuses).
  * Compile-time type verification prevents silent runtime errors in critical matching queries and eligibility calculations.

---

## 3. Styling: Tailwind CSS (v4)

* **Decision:** Utilize Tailwind CSS for styling with a disciplined design token approach.
* **Rationale:**
  * Enables rapid component iteration with zero context switching.
  * Facilitates an Apple Health / modern fintech design aesthetic: soft rounded cards, spacious layouts, high contrast typography, and restrained crimson/red accents.
  * Out-of-the-box responsive utilities simplify mobile-first development.

---

## 4. Primary Database & Backend: Supabase (PostgreSQL)

* **Decision:** Use Supabase on PostgreSQL as the primary persistence layer.
* **Rationale:**
  * Relational data integrity is essential for donor profiles, blood requests, matches, and contact reveal audits.
  * Row Level Security (RLS) provides granular, privacy-first data controls out-of-the-box.
  * Fast provisioning and native integration with Next.js workflows.

---

## 5. Backend Logic: Next.js Route Handlers & Server Actions

* **Decision:** Implement API logic via Next.js Route Handlers (`app/api/`) and Server Actions.
* **Rationale:**
  * Keeps API endpoints colocated with data access logic.
  * Type-safe boundary between UI and data mutations.
  * No external microservice deployment or boilerplate setup required.

---

## 6. Authentication: Mock Authentication Initially

* **Decision:** Begin with mock authentication before integrating full third-party OAuth / OTP providers.
* **Rationale:**
  * Focuses initial engineering bandwidth on the core challenge: **district donor matching and privacy workflows**.
  * Prevents auth provider configuration/SMS gateway blockers during early prototype validation.
  * Allows switching cleanly to Supabase Auth or SMS OTP in later phases using defined session abstractions.

---

## 7. Notifications: In-App Alerts Initially

* **Decision:** Implement notifications through in-app alerts and status banners rather than external SMS/WhatsApp/Push gateways initially.
* **Rationale:**
  * External messaging gateways (SMS/WhatsApp) require carrier approvals, paid API credentials, and template verifications that introduce friction.
  * In-app notifications provide immediate, testable feedback loops within the browser.
  * Notification contracts are abstracted behind `sendInAppNotification` so external providers can be plugged in seamlessly later.

---

## 8. Proximity & Matching: District / Locality Tiers (No Real Maps Initially)

* **Decision:** Implement matching using structured district, block, and locality tier categorization instead of live GPS map SDKs (Google Maps/Mapbox).
* **Rationale:**
  * Eliminates heavyweight map SDK overhead, API token costs, and high GPS battery drain on donor devices.
  * Emergency blood donation in administrative districts is typically organized by district, taluk, or hospital clusters.
  * Keeps the matching algorithm deterministic, explainable, and fast.

---

## 9. Deployment Target: Vercel + Supabase

* **Decision:** Deploy frontend and serverless API handlers to Vercel, paired with Supabase cloud PostgreSQL.
* **Rationale:**
  * Zero-config continuous deployment for Next.js with automatic preview branches.
  * High-availability edge network with minimal cold-start times.
