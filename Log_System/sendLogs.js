import axios from 'axios';
import { format } from 'date-fns';

const LOG_CAT = {
  AUTH: 'AUTH',
  PAYMENT: 'PAYMENT',
  EXCHANGE: 'EXCHANGE',
  API: 'API',
  DATABASE: 'DATABASE'
};

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
};

class Logger {
  constructor(category, level = LOG_LEVELS.INFO) {
    this.category = category;
    this.level = level;
    this.baseURL = process.env.TEST_ENV ? 'http://localhost:3005/log' : 'http://localhost:3001/log';
  }

  async log(level, message, endPoint, userName) {
    if (this.shouldLog(level)) {
      const logMessage = `[${level}] [${this.category}] ${userName ? `${userName}` : ''} ${endPoint ? `${endPoint}` : ''} ${message}`;
      console.log("message is logged:", logMessage);

      try {
        await axios.post(this.baseURL, {
          category: this.category,
          level,
          message,
          endPoint,
          userName,
          timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        });
        console.log('Log sent to server successfully');
      } catch (error) {
        console.error('Failed to send log to server:', error.message);
      }
    }
  }

  async debug(message, endPoint, userName) {
    await this.log(LOG_LEVELS.DEBUG, message, endPoint, userName);
  }

  async info(message, endPoint, userName) {
    await this.log(LOG_LEVELS.INFO, message, endPoint, userName);
  }

  async warn(message, endPoint, userName) {
    await this.log(LOG_LEVELS.WARN, message, endPoint, userName);
  }

  async error(message, endPoint, userName) {
    await this.log(LOG_LEVELS.ERROR, message, endPoint, userName);
  }

  async critical(message, endPoint, userName) {
    await this.log(LOG_LEVELS.CRITICAL, message, endPoint, userName);
  }

  shouldLog(level) {
    const levelOrder = [LOG_LEVELS.DEBUG, LOG_LEVELS.INFO, LOG_LEVELS.WARN, LOG_LEVELS.ERROR, LOG_LEVELS.CRITICAL];
    return levelOrder.indexOf(level) >= levelOrder.indexOf(this.level);
  }
}

function sendLogs() {
  const baseURL = process.env.LOG_BASE_URL || 'http://localhost:3001/log';
  return {
    authInfo: new Logger(LOG_CAT.AUTH, LOG_LEVELS.INFO, baseURL),
    authDebug: new Logger(LOG_CAT.AUTH, LOG_LEVELS.DEBUG, baseURL),
    authError: new Logger(LOG_CAT.AUTH, LOG_LEVELS.ERROR, baseURL),
    authWarn: new Logger(LOG_CAT.AUTH, LOG_LEVELS.WARN, baseURL),
    authCritical: new Logger(LOG_CAT.AUTH, LOG_LEVELS.CRITICAL, baseURL),

    paymentInfo: new Logger(LOG_CAT.PAYMENT, LOG_LEVELS.INFO, baseURL),
    paymentDebug: new Logger(LOG_CAT.PAYMENT, LOG_LEVELS.DEBUG, baseURL),
    paymentError: new Logger(LOG_CAT.PAYMENT, LOG_LEVELS.ERROR, baseURL),
    paymentWarn: new Logger(LOG_CAT.PAYMENT, LOG_LEVELS.WARN, baseURL),
    paymentCritical: new Logger(LOG_CAT.PAYMENT, LOG_LEVELS.CRITICAL, baseURL),

    exchangeInfo: new Logger(LOG_CAT.EXCHANGE, LOG_LEVELS.INFO, baseURL),
    exchangeDebug: new Logger(LOG_CAT.EXCHANGE, LOG_LEVELS.DEBUG, baseURL),
    exchangeError: new Logger(LOG_CAT.EXCHANGE, LOG_LEVELS.ERROR, baseURL),
    exchangeWarn: new Logger(LOG_CAT.EXCHANGE, LOG_LEVELS.WARN, baseURL),
    exchangeCritical: new Logger(LOG_CAT.EXCHANGE, LOG_LEVELS.CRITICAL, baseURL),

    dbInfo: new Logger(LOG_CAT.DATABASE, LOG_LEVELS.INFO, baseURL),
    dbDebug: new Logger(LOG_CAT.DATABASE, LOG_LEVELS.DEBUG, baseURL),
    dbError: new Logger(LOG_CAT.DATABASE, LOG_LEVELS.ERROR, baseURL),
    dbWarn: new Logger(LOG_CAT.DATABASE, LOG_LEVELS.WARN, baseURL),
    dbCritical: new Logger(LOG_CAT.DATABASE, LOG_LEVELS.CRITICAL, baseURL),

    apiInfo: new Logger(LOG_CAT.API, LOG_LEVELS.INFO, baseURL),
    apiDebug: new Logger(LOG_CAT.API, LOG_LEVELS.DEBUG, baseURL),
    apiError: new Logger(LOG_CAT.API, LOG_LEVELS.ERROR, baseURL),
    apiWarn: new Logger(LOG_CAT.API, LOG_LEVELS.WARN, baseURL),
    apiCritical: new Logger(LOG_CAT.API, LOG_LEVELS.CRITICAL, baseURL),
  };
}

export default sendLogs();
