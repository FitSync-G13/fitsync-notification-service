// Jest setup file
process.env.NODE_ENV = 'test';
process.env.PORT = '3005';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.USER_SERVICE_URL = 'http://localhost:3001';
process.env.TRAINING_SERVICE_URL = 'http://localhost:3002';
process.env.SCHEDULE_SERVICE_URL = 'http://localhost:8003';

// Suppress console logs during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'info').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
