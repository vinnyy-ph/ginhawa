/**
 * Users service — account lifecycle and credential management for the User identity record.
 *
 * All public methods return `PublicUser` (User minus passwordHash) to ensure the
 * credential hash is never accidentally serialised to an HTTP response.
 * `findByEmail` is the exception — it intentionally returns the raw record including
 * the hash so AuthService can perform bcrypt verification during login.
 */
import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/** User shape returned by all public methods — excludes the stored password hash. */
type PublicUser = Omit<User, 'passwordHash'>;

/**
 * Handles user account creation, retrieval, update, and deletion.
 * Also exposes `findByEmail` (consumed by AuthService) which returns the full
 * record including `passwordHash` for credential verification.
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** Strips `passwordHash` before returning a user object to callers. */
  private sanitizeUser(user: User): PublicUser {
    const { passwordHash: _passwordHash, ...result } = user;
    void _passwordHash;
    return result;
  }

  /**
   * Creates a new user account.
   * Hashes the plaintext password with bcrypt (cost factor 10) before persisting.
   * Throws 409 on duplicate email (Prisma P2002 unique constraint violation).
   */
  async create(createUserDto: CreateUserDto): Promise<PublicUser> {
    const { password, ...userData } = createUserDto;
    // Never store plaintext passwords — bcrypt with cost 10 is the project standard.
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const user = await this.prisma.user.create({
        data: { ...userData, passwordHash: hashedPassword },
      });
      return this.sanitizeUser(user);
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email already in use');
      }
      throw e;
    }
  }

  /** Returns all users with `passwordHash` stripped. */
  async findAll(): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany();
    return users.map((user) => this.sanitizeUser(user));
  }

  /** Returns a single user by id with `passwordHash` stripped, or null if not found. */
  async findOne(id: string): Promise<PublicUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Looks up a user by email for authentication purposes.
   * Returns the raw User record including `passwordHash` so AuthService can
   * compare it against the submitted password. Also includes the profile name
   * from whichever role-specific profile exists (patient or doctor).
   *
   * @returns Full User with nested profile names, or null if no account found.
   */
  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        patientProfile: { select: { fullName: true } },
        doctorProfile: { select: { fullName: true } },
      },
    });
  }

  /** Partially updates a user record and returns the sanitized result. */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<PublicUser> {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
    return this.sanitizeUser(user);
  }

  /** Permanently deletes a user and returns the sanitized deleted record. */
  async remove(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.delete({ where: { id } });
    return this.sanitizeUser(user);
  }
}
