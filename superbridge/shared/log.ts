type Log = (...args: any[]) => void;

enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
}

const LOG_LEVEL = LogLevel.Debug;

interface Logger {
  (...args: any[]): void;
  debug: Log;
  warn: Log;
  error: Log;
  rename: (name: string) => Logger;
}

function getShouldLog(level: LogLevel) {
  return level >= LOG_LEVEL;
}

export function createLogger(name: string): Logger {
  const LOG_COLOR = "#808080";
  const LOG_STYLE = `color: ${LOG_COLOR};`;

  const LABEL = `%c🌉 ${name}:%c`;

  const log: Logger = (...args) => {
    if (!getShouldLog(LogLevel.Info)) {
      return;
    }

    console.info(LABEL, LOG_STYLE, "", ...args);
  };

  log.debug = (...args) => {
    if (!getShouldLog(LogLevel.Debug)) {
      return;
    }

    console.debug(LABEL, LOG_STYLE, "", ...args);
  };

  log.warn = (...args) => {
    if (!getShouldLog(LogLevel.Warn)) {
      return;
    }

    console.warn(LABEL, LOG_STYLE, "", ...args);
  };

  log.error = (...args) => {
    if (!getShouldLog(LogLevel.Error)) {
      return;
    }

    console.error(LABEL, LOG_STYLE, "", ...args);
  };

  log.rename = (name: string) => {
    return createLogger(name);
  };

  return log;
}

export const log = createLogger("superbridge");
