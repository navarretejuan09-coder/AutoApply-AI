import { prisma } from "@autoapply/database";
import type { AuthUserDto } from "@autoapply/contracts";

import type { CreateUserInput, UserRecord, UserRepository } from "./user.repository.js";

type UserDb = Pick<typeof prisma, "user">;

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: UserDb = prisma) {}

  async findById(id: string): Promise<AuthUserDto | null> {
    const user = await this.db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    return user;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
      },
    });

    return user;
  }

  async create(input: CreateUserInput): Promise<AuthUserDto> {
    const user = await this.db.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
      },
      select: { id: true, email: true, name: true },
    });

    return user;
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return user !== null;
  }
}
