import { Injectable, NotFoundException } from "@nestjs/common";
import { findUserById } from "@autoapply/user";
import type { AuthUserDto } from "@autoapply/contracts";

@Injectable()
export class UsersService {
  async findById(userId: string): Promise<AuthUserDto> {
    const user = await findUserById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }
}
