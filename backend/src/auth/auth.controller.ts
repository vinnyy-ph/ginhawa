/**
 * Authentication endpoints: email/password login and signup.
 *
 * Both routes are `@Public()` because they are the entry points used to obtain
 * a token — requiring a valid JWT here would be a chicken-and-egg problem.
 */
import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Verifies credentials and returns a signed JWT on success.
   * @throws UnauthorizedException when the email/password pair is invalid.
   */
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      // Deliberately generic message — do not reveal whether the email exists.
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  /** Creates a new user account and immediately returns a JWT (auto-login). */
  @Public()
  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signup(createUserDto);
  }
}
