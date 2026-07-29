import { hashPassword, verifyPassword } from "@autoapply/auth";
import type { AuthUserDto } from "@autoapply/contracts";
import { createLogger } from "@autoapply/logger";

import { PrismaUserRepository } from "./repository/prisma-user.repository.js";
import type { UserRepository } from "./repository/user.repository.js";

const logger = createLogger("user.domain");

let repository: UserRepository = new PrismaUserRepository();

/** Override repository (testing). */
export function setUserRepository(repo: UserRepository): void {
  repository = repo;
}

export async function findUserById(userId: string): Promise<AuthUserDto | null> {
  return repository.findById(userId);
}

export async function findUserByEmail(email: string) {
  return repository.findByEmail(email);
}

export async function createUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthUserDto> {
  const exists = await repository.emailExists(input.email);

  if (exists) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await repository.create({
    email: input.email,
    passwordHash,
    name: input.name,
  });

  logger.info("User created", { userId: user.id, email: user.email });

  return user;
}

export async function verifyUserCredentials(
  email: string,
  password: string,
): Promise<AuthUserDto | null> {
  const user = await repository.findByEmail(email);

  if (!user) {
    return null;
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
