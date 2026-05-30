/**
 * DTO for PATCH /users/:id — all fields from CreateUserDto become optional,
 * allowing partial updates to email, password, or role.
 */
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
