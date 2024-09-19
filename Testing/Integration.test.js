import sendLogs from '../Log_System/sendLogs';


//SEND LOGS TO LOGGYING SYSTEM'S TESTING SERVER....
describe('Logger Integration Tests', () => {
  beforeAll(() => {
    process.env.LOG_BASE_URL = 'http://localhost:3005/log';  //BASE URL FOR INTEGRATION TESTING
  });
    
  test('should send an info log to the log receiver', async () => {
    const logger = sendLogs.authInfo;
    await logger.info('User login successful', '/api/v5/test', 'Izhar');
  });

  test('should send a debug log to the log receiver', async () => {
    const logger = sendLogs.authDebug;
    await logger.debug('Debugging user login', '/api/v5/test', 'Izhar');
  });
});
