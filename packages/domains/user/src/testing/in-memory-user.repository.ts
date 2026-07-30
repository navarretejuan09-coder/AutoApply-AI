import type { CreateUserInput, UserRecord, UserRepository } from "../repository/user.repository.js";

export class InMemoryUserRepository implements UserRepository {
  private records = new Map<string, UserRecord>();
  private idCounter = 0;

  async findById(id: string) {
    const record = this.records.get(id);
    if (!record) {
      return null;
    }
    return { id: record.id, email: record.email, name: record.name };
  }

  async findByEmail(email: string) {
    return [...this.records.values()].find((record) => record.email === email) ?? null;
  }

  async create(input: CreateUserInput) {
    const id = `user-${++this.idCounter}`;
    const record: UserRecord = {
      id,
      email: input.email,
      name: input.name ?? null,
      passwordHash: input.passwordHash,
    };
    this.records.set(id, record);
    return { id: record.id, email: record.email, name: record.name };
  }

  async emailExists(email: string) {
    return [...this.records.values()].some((record) => record.email === email);
  }

  /** Test helper: seed a user with a known password hash. */
  seed(record: UserRecord): void {
    this.records.set(record.id, record);
  }
}
