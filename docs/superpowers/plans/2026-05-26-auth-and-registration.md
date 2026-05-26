# Role-Based Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a robust authentication and registration system that handles both PATIENT and DOCTOR roles, using JWT and bcrypt, and aligning with the refined database schema.

**Architecture:** We will use NestJS's Passport-based authentication strategy. We'll implement a registration endpoint in `AuthController` that delegates to `UsersService` for persistence, ensuring passwords are hashed and roles are assigned. Role-based guards will be established for future-proofing access control.

**Tech Stack:** NestJS, Passport, JWT, Bcrypt, Prisma.

---

### Task 1: Update User DTOs and Service

**Files:**
- Modify: `backend/src/users/dto/create-user.dto.ts`
- Modify: `backend/src/users/users.service.ts`
- Test: `backend/src/users/users.service.spec.ts`

- [x] **Step 1: Update CreateUserDto to include Role**

```typescript
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
```

- [x] **Step 2: Fix UsersService.create to use passwordHash**

```typescript
async create(createUserDto: CreateUserDto) {
  const { password, ...userData } = createUserDto;
  const hashedPassword = await bcrypt.hash(password, 10);
  return this.prisma.user.create({
    data: {
      ...userData,
      passwordHash: hashedPassword,
    },
  });
}
```

- [x] **Step 3: Run unit tests for UsersService**

Run: `npm run test backend/src/users/users.service.spec.ts`
Expected: PASS (Ensure mock Prisma handles `passwordHash`)

- [x] **Step 4: Commit**

```bash
git add backend/src/users/dto/create-user.dto.ts backend/src/users/users.service.ts
git commit -m "feat(auth): update user creation logic to use passwordHash and roles"
```

---

### Task 2: Implement Registration in AuthController

**Files:**
- Modify: `backend/src/auth/auth.controller.ts`
- Modify: `backend/src/auth/auth.service.ts`

- [ ] **Step 1: Add register method to AuthService**

```typescript
async register(createUserDto: CreateUserDto) {
  const user = await this.usersService.create(createUserDto);
  return this.login(user);
}
```

- [ ] **Step 2: Update validateUser to use passwordHash**

```typescript
async validateUser(email: string, pass: string): Promise<any> {
  const user = await this.usersService.findByEmail(email);
  if (user && (await bcrypt.compare(pass, user.passwordHash))) {
    const { passwordHash, ...result } = user;
    return result;
  }
  return null;
}
```

- [ ] **Step 3: Add register endpoint to AuthController**

```typescript
@Public() // Ensure you have a Public decorator if using Global Guards
@Post('register')
async register(@Body() createUserDto: CreateUserDto) {
  return this.authService.register(createUserDto);
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/auth/auth.controller.ts backend/src/auth/auth.service.ts
git commit -m "feat(auth): add registration endpoint"
```

---

### Task 3: Implement Role-Based Access Control (RBAC)

**Files:**
- Create: `backend/src/auth/decorators/roles.decorator.ts`
- Create: `backend/src/auth/guards/roles.guard.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create Roles Decorator**

```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 2: Create Roles Guard**

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

- [ ] **Step 3: Register RolesGuard globally or in specific modules**

- [ ] **Step 4: Commit**

```bash
git add backend/src/auth/decorators/roles.decorator.ts backend/src/auth/guards/roles.guard.ts
git commit -m "feat(auth): implement role-based access control guards"
```

---

### Task 4: End-to-End Verification

- [ ] **Step 1: Start the backend server**

Run: `npm run start:dev` in `backend/`

- [ ] **Step 2: Test Registration via CURL**

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "doctor@ginhawa.com", "password": "password123", "role": "DOCTOR"}'
```
Expected: 201 Created with access_token.

- [ ] **Step 3: Test Login via CURL**

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "doctor@ginhawa.com", "password": "password123"}'
```
Expected: 200 OK with access_token.

- [ ] **Step 4: Commit all remaining changes**
