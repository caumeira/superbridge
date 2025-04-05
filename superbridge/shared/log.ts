type Log = (...args: any[]) => void;

interface Logger {
  (...args: any[]): void;
  debug: Log;
  warn: Log;
  error: Log;
  rename: (name: string) => Logger;
}

export function createLogger(name: string): Logger {
  const LOG_COLOR = "#808080";
  const LOG_STYLE = `color: ${LOG_COLOR};`;

  const LABEL = `%c🌉 ${name}:%c`;

  const log: Logger = (...args) => {
    console.info(LABEL, LOG_STYLE, "", ...args);
  };

  log.debug = (...args) => {
    console.debug(LABEL, LOG_STYLE, "", ...args);
  };

  log.warn = (...args) => {
    console.warn(LABEL, LOG_STYLE, "", ...args);
  };

  log.error = (...args) => {
    console.error(LABEL, LOG_STYLE, "", ...args);
  };

  log.rename = (name: string) => {
    return createLogger(name);
  };

  return log;
}

export const log = createLogger("superbridge");
