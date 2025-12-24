interface LogEntry {
  timestamp: string;
  message: string;
  data?: any;
}

class LoggerServiceClass {
  private logs: LogEntry[] = [];
  private maxLogs = 20;

  log(message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      message,
      data
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.log(message, data !== undefined ? data : '');
  }

  error(message: string, error?: any) {
    this.log(`❌ ${message}`, error);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }
}

export const LoggerService = new LoggerServiceClass();
