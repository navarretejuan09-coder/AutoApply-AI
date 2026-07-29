export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

function write(
  level: LogLevel,
  namespace: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  const entry = {
    level,
    namespace,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {}),
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

export function createLogger(namespace: string): Logger {
  return {
    debug: (message, meta) => write("debug", namespace, message, meta),
    info: (message, meta) => write("info", namespace, message, meta),
    warn: (message, meta) => write("warn", namespace, message, meta),
    error: (message, meta) => write("error", namespace, message, meta),
  };
}
