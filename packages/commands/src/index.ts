export interface Command {
  readonly type: string;
}

export interface CommandHandler<T extends Command> {
  readonly commandType: T["type"];
  handle(command: T): Promise<void>;
}

export class CommandBus {
  private readonly handlers = new Map<string, CommandHandler<Command>>();

  register<T extends Command>(handler: CommandHandler<T>): void {
    this.handlers.set(handler.commandType, handler as CommandHandler<Command>);
  }

  async dispatch<T extends Command>(command: T): Promise<void> {
    const handler = this.handlers.get(command.type);

    if (!handler) {
      throw new Error(`No handler registered for command: ${command.type}`);
    }

    await handler.handle(command);
  }
}

export const commandBus = new CommandBus();

export interface ApplyJobCommand extends Command {
  readonly type: "ApplyJob";
  userId: string;
  jobId: string;
}

export interface RegisterUserCommand extends Command {
  readonly type: "RegisterUser";
  email: string;
  password: string;
  name?: string;
}

export class ApplyJobCommandHandler implements CommandHandler<ApplyJobCommand> {
  readonly commandType = "ApplyJob" as const;

  async handle(command: ApplyJobCommand): Promise<void> {
    throw new Error(`Not implemented: ApplyJobCommandHandler (${command.jobId})`);
  }
}

export class RegisterUserCommandHandler implements CommandHandler<RegisterUserCommand> {
  readonly commandType = "RegisterUser" as const;

  async handle(command: RegisterUserCommand): Promise<void> {
    throw new Error(`Not implemented: RegisterUserCommandHandler (${command.email})`);
  }
}
