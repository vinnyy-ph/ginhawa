# Rename Register to Signup Endpoint

## Goal
To rename all instances of the "register" endpoint to "signup" across both the frontend and backend of the telehealth application. This renaming will span from the API URL routes to internal backend controllers and services.

## Scope
- Backend API routes and controllers
- Backend services and related unit tests
- Frontend API fetch calls

## Architecture / Changes

### 1. API Endpoints & Controllers
- **File:** `backend/src/auth/auth.controller.ts`
- **Changes:** Change the `@Post('register')` decorator to `@Post('signup')`. Rename the controller method from `register` to `signup`. Update the internal service call to `this.authService.signup`.

### 2. Backend Services & Tests
- **Files:** `backend/src/auth/auth.service.ts`, `backend/src/auth/auth.service.spec.ts`
- **Changes:** Rename the `register` method in `auth.service.ts` to `signup`. Update `auth.service.spec.ts` to call and test the newly renamed `signup` method.

### 3. Frontend Routes
- **Files:** `frontend/src/app/signup/page.tsx`, `frontend/src/app/signup/doctor/page.tsx`
- **Changes:** Update the fetch endpoint URLs from `/api/auth/register` to `/api/auth/signup`.
- **Constraint:** Do not modify the `register()` method calls that are part of the `react-hook-form` library.

## Testing & Verification
- Run backend unit tests (`npm run test` in `backend`) to ensure `auth.service.spec.ts` passes.
- Verify frontend files build properly without errors.
