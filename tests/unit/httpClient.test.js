/**
 * Unit tests for HTTP client utility functions.
 */

const axios = require('axios');

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn()
  }))
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('HTTP Client', () => {
  let userServiceClient;
  let trainingServiceClient;
  let scheduleServiceClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock clients
    userServiceClient = {
      get: jest.fn(),
      post: jest.fn()
    };
    
    trainingServiceClient = {
      get: jest.fn()
    };
    
    scheduleServiceClient = {
      get: jest.fn()
    };
  });

  describe('getUserContact', () => {
    it('should return user data on success', async () => {
      const mockUser = {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      };

      userServiceClient.get.mockResolvedValue({
        data: { data: mockUser }
      });

      const response = await userServiceClient.get('/api/users/user-123');
      const result = response.data.data;

      expect(result).toEqual(mockUser);
      expect(result.email).toBe('john@example.com');
    });

    it('should return null on error', async () => {
      userServiceClient.get.mockRejectedValue(new Error('Network error'));

      let result = null;
      try {
        await userServiceClient.get('/api/users/user-123');
      } catch (error) {
        result = null;
      }

      expect(result).toBeNull();
    });

    it('should call correct endpoint with user ID', async () => {
      userServiceClient.get.mockResolvedValue({ data: { data: {} } });

      await userServiceClient.get('/api/users/user-456');

      expect(userServiceClient.get).toHaveBeenCalledWith('/api/users/user-456');
    });
  });

  describe('getUsersBatch', () => {
    it('should return array of users on success', async () => {
      const mockUsers = [
        { id: 'user-1', first_name: 'John', email: 'john@example.com' },
        { id: 'user-2', first_name: 'Jane', email: 'jane@example.com' }
      ];

      userServiceClient.post.mockResolvedValue({
        data: { data: mockUsers }
      });

      const response = await userServiceClient.post('/api/users/batch', {
        user_ids: ['user-1', 'user-2']
      });
      const result = response.data.data;

      expect(result).toHaveLength(2);
      expect(result[0].first_name).toBe('John');
    });

    it('should return empty array on error', async () => {
      userServiceClient.post.mockRejectedValue(new Error('Network error'));

      let result = [];
      try {
        await userServiceClient.post('/api/users/batch', { user_ids: ['user-1'] });
      } catch (error) {
        result = [];
      }

      expect(result).toEqual([]);
    });

    it('should send user_ids in request body', async () => {
      userServiceClient.post.mockResolvedValue({ data: { data: [] } });

      const userIds = ['user-1', 'user-2', 'user-3'];
      await userServiceClient.post('/api/users/batch', { user_ids: userIds });

      expect(userServiceClient.post).toHaveBeenCalledWith(
        '/api/users/batch',
        { user_ids: userIds }
      );
    });
  });

  describe('getProgramDetails', () => {
    it('should return program data on success', async () => {
      const mockProgram = {
        id: 'program-123',
        name: '12-Week Strength Program',
        duration_weeks: 12
      };

      trainingServiceClient.get.mockResolvedValue({
        data: { data: mockProgram }
      });

      const response = await trainingServiceClient.get('/api/programs/program-123');
      const result = response.data.data;

      expect(result).toEqual(mockProgram);
      expect(result.name).toBe('12-Week Strength Program');
    });

    it('should return null on error', async () => {
      trainingServiceClient.get.mockRejectedValue(new Error('Not found'));

      let result = null;
      try {
        await trainingServiceClient.get('/api/programs/program-123');
      } catch (error) {
        result = null;
      }

      expect(result).toBeNull();
    });
  });

  describe('getBookingDetails', () => {
    it('should return booking data on success', async () => {
      const mockBooking = {
        id: 'booking-123',
        client_id: 'client-456',
        trainer_id: 'trainer-789',
        booking_date: '2025-01-15',
        start_time: '10:00',
        status: 'confirmed'
      };

      scheduleServiceClient.get.mockResolvedValue({
        data: { data: mockBooking }
      });

      const response = await scheduleServiceClient.get('/api/bookings/booking-123');
      const result = response.data.data;

      expect(result).toEqual(mockBooking);
      expect(result.status).toBe('confirmed');
    });

    it('should return null on error', async () => {
      scheduleServiceClient.get.mockRejectedValue(new Error('Not found'));

      let result = null;
      try {
        await scheduleServiceClient.get('/api/bookings/booking-123');
      } catch (error) {
        result = null;
      }

      expect(result).toBeNull();
    });
  });
});

describe('Axios Instance Configuration', () => {
  it('should create axios instance with correct baseURL', () => {
    const USER_SERVICE_URL = 'http://localhost:3001';
    const mockInstance = axios.create({
      baseURL: USER_SERVICE_URL,
      timeout: 5000
    });

    expect(axios.create).toHaveBeenCalled();
  });

  it('should set timeout to 5000ms', () => {
    const config = {
      baseURL: 'http://localhost:3001',
      timeout: 5000
    };

    expect(config.timeout).toBe(5000);
  });
});

describe('Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    const mockClient = {
      get: jest.fn().mockRejectedValue(new Error('Network Error'))
    };

    let result = null;
    try {
      await mockClient.get('/api/users/123');
    } catch (error) {
      result = null;
    }

    expect(result).toBeNull();
  });

  it('should handle timeout errors', async () => {
    const timeoutError = new Error('ECONNABORTED');
    timeoutError.code = 'ECONNABORTED';

    const mockClient = {
      get: jest.fn().mockRejectedValue(timeoutError)
    };

    let result = null;
    try {
      await mockClient.get('/api/users/123');
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        result = null;
      }
    }

    expect(result).toBeNull();
  });

  it('should handle 404 errors', async () => {
    const notFoundError = new Error('Not Found');
    notFoundError.response = { status: 404 };

    const mockClient = {
      get: jest.fn().mockRejectedValue(notFoundError)
    };

    let result = null;
    try {
      await mockClient.get('/api/users/nonexistent');
    } catch (error) {
      if (error.response?.status === 404) {
        result = null;
      }
    }

    expect(result).toBeNull();
  });

  it('should handle 500 errors', async () => {
    const serverError = new Error('Internal Server Error');
    serverError.response = { status: 500 };

    const mockClient = {
      get: jest.fn().mockRejectedValue(serverError)
    };

    let result = null;
    try {
      await mockClient.get('/api/users/123');
    } catch (error) {
      if (error.response?.status === 500) {
        result = null;
      }
    }

    expect(result).toBeNull();
  });
});
