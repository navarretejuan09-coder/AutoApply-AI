import { randomUUID } from "node:crypto";

export interface DomainEventMetadata {
  correlationId: string;
  causationId: string;
  actorId?: string;
}

export interface DomainEvent<T> {
  readonly id: string;
  readonly type: string;
  readonly timestamp: string;
  readonly version: number;
  readonly payload: T;
  readonly metadata: DomainEventMetadata;
}

export interface CreateDomainEventOptions<T> {
  type: string;
  payload: T;
  metadata: DomainEventMetadata;
  version?: number;
}

export function createDomainEvent<T>(options: CreateDomainEventOptions<T>): DomainEvent<T> {
  return Object.freeze({
    id: randomUUID(),
    type: options.type,
    timestamp: new Date().toISOString(),
    version: options.version ?? 1,
    payload: Object.freeze({ ...options.payload }),
    metadata: Object.freeze({ ...options.metadata }),
  });
}
