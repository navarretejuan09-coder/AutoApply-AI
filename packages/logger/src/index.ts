export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggerContext {
  service?: string;
  correlationId?: string;
  causationId?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(context: LoggerContext): Logger;
}

function write(
  level: LogLevel,
  namespace: string,
  context: LoggerContext,
  message: string,
  meta?: Record<string, unknown>,
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    namespace,
    message,
    ...context,
    ...(meta ?? {}),
  };

  const line = JSON.stringify(entry);

  switch (level) {
    case "debug":
    case "info":
      console.log(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
    default: {
      const _exhaustive: never = level;
      throw new Error(`Unhandled log level: ${_exhaustive}`);
    }
  }
}

function createLoggerWithContext(namespace: string, context: LoggerContext): Logger {
  return {
    debug: (message, meta) => write("debug", namespace, context, message, meta),
    info: (message, meta) => write("info", namespace, context, message, meta),
    warn: (message, meta) => write("warn", namespace, context, message, meta),
    error: (message, meta) => write("error", namespace, context, message, meta),
    child: (childContext) =>
      createLoggerWithContext(namespace, { ...context, ...childContext }),
  };
}

export function createLogger(
  namespace: string,
  context: LoggerContext = {},
): Logger {
  return createLoggerWithContext(namespace, context);
}
