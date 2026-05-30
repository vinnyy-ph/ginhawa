import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

/** A user's display name comes from whichever profile they have (patient or doctor). */
type ProfileName = { fullName: string } | null;

/** A user safe to return to clients — the bcrypt hash is always stripped. */
type PublicUser = Omit<User, 'passwordHash'> & {
  patientProfile?: ProfileName;
  doctorProfile?: ProfileName;
};

/**
 * Core authentication logic: credential verification and JWT issuance.
 *
 * Passwords are compared with bcrypt (constant-time) and the hash is never
 * included in any returned object.
 */
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Checks an email/password pair against the stored bcrypt hash.
   * @returns the user without its password hash, or `null` if validation fails.
   */
  async validateUser(email: string, pass: string): Promise<PublicUser | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      // Strip the hash before the user object leaves this layer.
      const { passwordHash: _passwordHash, ...result } = user;
      void _passwordHash;
      return result;
    }
    return null;
  }

  /** Registers a new account, then issues a token so the client is logged in. */
  async signup(createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return this.login(user);
  }

  /**
   * Signs a JWT for an already-validated user and returns it alongside a
   * lightweight user summary for the client to cache.
   *
   * The token `sub` is the user id; `role` is embedded so guards can authorize
   * without an extra DB lookup on every request.
   */
  login(user: PublicUser) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const name =
      user.doctorProfile?.fullName ?? user.patientProfile?.fullName ?? null;
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name,
      },
    };
  }
}
