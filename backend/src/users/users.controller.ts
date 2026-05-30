/**
 * Users controller — internal CRUD over the User identity record.
 *
 * Protected by JwtAuthGuard + RolesGuard. No `@Roles` decorator is applied at
 * the class level, making these routes accessible to any authenticated user;
 * role-level access control should be tightened before production if admin-only
 * operations are intended.
 *
 * Note: user registration is handled by AuthModule (`POST /auth/register`),
 * not here. These endpoints are primarily for internal or admin use.
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * Exposes full CRUD for `User` records under `/users`.
 * All responses omit `passwordHash` (sanitized by the service).
 */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** POST /users — creates a new user account. Throws 409 if the email is already registered. */
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /** GET /users — returns all user accounts (passwordHash stripped). */
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  /** GET /users/:id — returns a single user by id, or null if not found. */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /** PATCH /users/:id — partially updates a user record. */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  /** DELETE /users/:id — permanently removes the user and returns the deleted record. */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
