class DebugLoggerClass {
  private logs: Array<{time: string, step: string, data?: any}> = [];
  private listeners: Array<(logs: any[]) => void> = [];

  log(step: string, data?: any) {
    const entry = {
      time: new Date().toLocaleTimeString(),
      step,
      data: data ? JSON.stringify(data, null, 2) : undefined
    };
    this.logs.push(entry);
    console.log(`[DEBUG] ${entry.time} - ${step}`, data || '');
    this.listeners.forEach(fn => fn([...this.logs]));
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(fn => fn([]));
  }

  subscribe(fn: (logs: any[]) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  getLogs() {
    return [...this.logs];
  }
}

export const DebugLogger = new DebugLoggerClass();
