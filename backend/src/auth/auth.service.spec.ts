import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user object without passwordHash if password is valid', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        role: 'PATIENT',
      };
      const pass = 'password123';

      mockUsersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(user.email, pass);

      expect(bcrypt.compare).toHaveBeenCalledWith(pass, user.passwordHash);
      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
        role: 'PATIENT',
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null if password is invalid', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        role: 'PATIENT',
      };
      const pass = 'wrongPassword';

      mockUsersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(user.email, pass);

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user info with role and without name', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        role: Role.DOCTOR,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const token = 'jwtToken';
      mockJwtService.sign.mockReturnValue(token);

      const result = service.login(user);

      expect(result.user).not.toHaveProperty('name');
      expect(result).toEqual({
        access_token: token,
        user: {
          id: user.id,
          email: user.email,
          role: Role.DOCTOR,
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        sub: user.id,
        role: user.role,
      });
    });
  });

  describe('register', () => {
    it('should create a user and return login result', async () => {
      const createUserDto = {
        email: 'new@example.com',
        password: 'password123',
        role: Role.PATIENT,
      };

      const user = {
        id: '2',
        email: 'new@example.com',
        role: Role.PATIENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = 'token';
      mockUsersService.create.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.register(createUserDto);

      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual({
        access_token: token,
        user: { id: '2', email: 'new@example.com', role: Role.PATIENT },
      });
    });
  });
});
