# Root README Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a comprehensive and accurate root README for the Ginhawa telehealth application, covering the stack, architecture, local setup, and linking to key documentation.

**Architecture:** The project is a monorepo with a NestJS backend and a Next.js frontend, using Prisma for database management and a shared `docker-compose` for the database.

**Tech Stack:** Next.js, NestJS, TypeScript, Prisma, PostgreSQL, Docker, Tailwind CSS, Radix UI.

---

### Task 1: Research and Draft Content

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Draft the Project Overview and Stack section**
- [ ] **Step 2: Draft the Architecture Summary section**
- [ ] **Step 3: Draft the Local Setup instructions (Prerequisites, Installation, Env Vars, Database, Running)**
- [ ] **Step 4: Draft the Deployment and Documentation links section**

### Task 2: Implement the New README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace existing README content with the new draft**

```markdown
# Ginhawa Telehealth App

A modern, full-stack telehealth platform built for the builder round, enabling seamless patient-doctor interactions, AI-driven recommendations, and consultation management.

## 🚀 Tech Stack

- **Frontend:** Next.js (React 19), Tailwind CSS, Radix UI, Framer Motion
- **Backend:** NestJS (Node.js), TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js (Frontend) / Passport.js (Backend)
- **Infrastructure:** Docker Compose (Local Database), Cloudinary (Uploads)
- **AI:** Google Gemini / Groq (Symptom Recommendation)
- **Video:** Daily.co integration

## 🏗️ Architecture Summary

Ginhawa is structured as a monorepo for rapid development and type safety:

- **`frontend/`**: Next.js application handling the patient and doctor dashboards, discovery, and consultation rooms.
- **`backend/`**: NestJS REST API providing business logic, authentication, and integration with Prisma.
- **`docs/`**: Project documentation, including the [Core Specifications](./docs/SPECS.md).

## 🛠️ Local Setup

### Prerequisites

- Node.js (v20+)
- Docker and Docker Compose
- npm

### 1. Clone and Install

```bash
git clone <repository-url>
cd telehealth-app
npm install
npm run install:all # If you add a script for this, or just cd into each and npm install
```

*(Note: Root package.json currently has `concurrently` but not a full install script. For now, instructions will be manual install in each dir.)*

### 2. Environment Variables

Copy `.env.example` to `.env` in both `backend` and `frontend` directories and fill in the required values.

- **Backend:** `backend/.env` (DB URL, JWT Secret, Gemini API Key, etc.)
- **Frontend:** `frontend/.env.local` (Backend URL, NextAuth Secret, etc.)

### 3. Database Setup

Start the PostgreSQL database via Docker:

```bash
npm run db:up
```

Run Prisma migrations and seed the database:

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

### 4. Running the Application

From the root directory, run both frontend and backend concurrently:

```bash
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:3001](http://localhost:3001)

## 📄 Documentation

- [Core Specifications](./docs/SPECS.md) - Detailed product requirements and features.
- [Design Document](./docs/DESIGN.md) - Architectural decisions and UI/UX design.
- [Storage Specs](./docs/STORAGE-SPECS.md) - File upload and storage strategy.

## 🚢 Deployment

The application is designed to be deployed with:
- Frontend: Vercel / Railway
- Backend: Railway / Render / Fly.io
- Database: Managed PostgreSQL (e.g., Railway, Supabase, Neon)

---
```

- [ ] **Step 2: Verify all links and commands in the new README**

- [ ] **Step 3: Commit the changes**

```bash
git add README.md
git commit -m "docs: update root README with stack, architecture, and setup instructions"
```
