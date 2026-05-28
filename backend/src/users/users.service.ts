import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

type PublicUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private sanitizeUser(user: User): PublicUser {
    const { passwordHash: _passwordHash, ...result } = user;
    void _passwordHash;
    return result;
  }

  async create(createUserDto: CreateUserDto): Promise<PublicUser> {
    const { password, ...userData } = createUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash: hashedPassword,
      },
    });
    return this.sanitizeUser(user);
  }

  async findAll(): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany();
    return users.map((user) => this.sanitizeUser(user));
  }

  async findOne(id: string): Promise<PublicUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.sanitizeUser(user) : null;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<PublicUser> {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
    return this.sanitizeUser(user);
  }

  async remove(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.delete({ where: { id } });
    return this.sanitizeUser(user);
  }
}
