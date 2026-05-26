import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;

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
    usersService = module.get<UsersService>(UsersService);
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
      expect(result.passwordHash).toBeUndefined();
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
    it('should return access token and user info with role and without name', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        role: 'DOCTOR',
      };
      const token = 'jwtToken';
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.login(user);

      expect(result.user).not.toHaveProperty('name');
      expect(result).toEqual({
        access_token: token,
        user: {
          id: user.id,
          email: user.email,
          role: 'DOCTOR',
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
        role: 'PATIENT',
      };
      const user = {
        id: '2',
        email: 'new@example.com',
      };
      const loginResult = {
        access_token: 'token',
        user: { id: '2', email: 'new@example.com', role: 'PATIENT' },
      };

      mockUsersService.create.mockResolvedValue(user);
      jest.spyOn(service, 'login').mockResolvedValue(loginResult);

      const result = await service.register(createUserDto as any);

      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
      expect(service.login).toHaveBeenCalledWith(user);
      expect(result).toEqual(loginResult);
    });
  });
});
