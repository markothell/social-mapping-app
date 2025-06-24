type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(entry: LogEntry): string {
    const { timestamp, level, message, context, error } = entry;
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    const errorStr = error ? ` | Error: ${error.message}${error.stack ? `\n${error.stack}` : ''}` : '';
    
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}${errorStr}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error
    };

    const formattedMessage = this.formatMessage(entry);

    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formattedMessage);
        }
        break;
      default:
        console.log(formattedMessage);
    }

    // In production, you could send to external logging service here
    if (!this.isDevelopment && level === 'error') {
      this.sendToExternalLogger(entry);
    }
  }

  private async sendToExternalLogger(entry: LogEntry) {
    // Future: Send to Sentry, LogRocket, or other logging service
    // For now, we'll just store critical errors
    try {
      // Example: await fetch('/api/logs', { method: 'POST', body: JSON.stringify(entry) });
    } catch (err) {
      console.error('Failed to send log to external service:', err);
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>, error?: Error) {
    this.log('error', message, context, error);
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  // Helper for API route errors
  apiError(route: string, error: Error, context?: Record<string, any>) {
    this.error(`API Error in ${route}`, { ...context, route }, error);
  }

  // Helper for WebSocket errors
  wsError(event: string, error: Error, context?: Record<string, any>) {
    this.error(`WebSocket Error in ${event}`, { ...context, event }, error);
  }
}

export const logger = new Logger();