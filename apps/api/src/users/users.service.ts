import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@autoapply/database";
import type { AuthUserDto } from "@autoapply/types";

@Injectable()
export class UsersService {
  async findById(userId: string): Promise<AuthUserDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }
}
