import type { AuthUserDto } from "@autoapply/contracts";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name?: string | null;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
}

export interface UserRepository {
  findById(id: string): Promise<AuthUserDto | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<AuthUserDto>;
  emailExists(email: string): Promise<boolean>;
}
