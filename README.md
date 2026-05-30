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
```

Install dependencies for both frontend and backend:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

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
cd ..
```

### 4. Running the Application

From the root directory, run both frontend and backend concurrently:

```bash
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:3001](http://localhost:3001)

## 🚢 Deployment

### Railway.app (Recommended)

1. **Project Setup:** Create a new project in Railway.
2. **Database:** Add a PostgreSQL service.
3. **Services:**
   - Add a Web Service pointing to `/backend`.
   - Add a Web Service pointing to `/frontend`.
4. **Environment Variables:**
   - **Backend:** `DATABASE_URL`, `STORAGE=cloudinary`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `JWT_SECRET`, `GEMINI_API_KEY`, `DAILY_API_KEY`.
   - **Frontend:** `NEXT_PUBLIC_API_URL` (Backend URL), `NEXTAUTH_URL` (Frontend URL), `NEXTAUTH_SECRET`.
