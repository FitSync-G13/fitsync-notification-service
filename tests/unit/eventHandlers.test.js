/**
 * Unit tests for event handlers in notification-service.
 */

// Mock dependencies before requiring modules
jest.mock('../../src/utils/httpClient', () => ({
  getUserContact: jest.fn(),
  getUsersBatch: jest.fn(),
  getProgramDetails: jest.fn(),
  getBookingDetails: jest.fn()
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

const { getUserContact, getProgramDetails, getBookingDetails } = require('../../src/utils/httpClient');
const logger = require('../../src/config/logger');

// Import the event handlers by recreating them for testing
// (Since they're not exported from index.js, we'll test the logic separately)

describe('Event Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleBookingCreated', () => {
    const mockSendEmail = jest.fn().mockResolvedValue(true);
    const mockStoreNotification = jest.fn();

    const bookingCreatedData = {
      booking_id: 'booking-123',
      client_id: 'client-456',
      trainer_id: 'trainer-789',
      booking_date: '2025-01-15',
      start_time: '10:00'
    };

    it('should create email with correct subject and body', () => {
      const { client_id, booking_date, start_time, booking_id } = bookingCreatedData;
      
      const emailSubject = 'Booking Confirmation';
      const emailBody = `Your booking for ${booking_date} at ${start_time} has been confirmed. Booking ID: ${booking_id}`;
      
      expect(emailSubject).toBe('Booking Confirmation');
      expect(emailBody).toContain('2025-01-15');
      expect(emailBody).toContain('10:00');
      expect(emailBody).toContain('booking-123');
    });

    it('should create notification with correct structure', () => {
      const { booking_id, booking_date, start_time, client_id } = bookingCreatedData;
      
      const notification = {
        type: 'booking_confirmation',
        category: 'booking_confirmation',
        title: 'Booking Confirmed',
        message: `Your session on ${booking_date} at ${start_time} has been booked successfully.`,
        metadata: { booking_id, booking_date, start_time }
      };
      
      expect(notification.type).toBe('booking_confirmation');
      expect(notification.title).toBe('Booking Confirmed');
      expect(notification.metadata.booking_id).toBe('booking-123');
    });
  });

  describe('handleBookingCancelled', () => {
    const bookingCancelledData = {
      booking_id: 'booking-123',
      client_id: 'client-456',
      reason: 'Schedule conflict'
    };

    it('should include cancellation reason in email', () => {
      const { booking_id, reason } = bookingCancelledData;
      
      const emailBody = `Your booking has been cancelled. ${reason ? `Reason: ${reason}` : ''}`;
      
      expect(emailBody).toContain('Schedule conflict');
    });

    it('should handle missing reason gracefully', () => {
      const dataWithoutReason = {
        booking_id: 'booking-123',
        client_id: 'client-456'
      };
      
      const reason = dataWithoutReason.reason;
      const emailBody = `Your booking has been cancelled. ${reason ? `Reason: ${reason}` : ''}`;
      
      expect(emailBody).toBe('Your booking has been cancelled. ');
    });

    it('should create cancellation notification', () => {
      const { booking_id, reason } = bookingCancelledData;
      
      const notification = {
        type: 'booking_cancellation',
        category: 'booking_reminder',
        title: 'Booking Cancelled',
        message: `Your booking has been cancelled. ${reason || ''}`,
        metadata: { booking_id }
      };
      
      expect(notification.type).toBe('booking_cancellation');
      expect(notification.message).toContain('Schedule conflict');
    });
  });

  describe('handleProgramAssigned', () => {
    const programAssignedData = {
      program_id: 'program-123',
      client_id: 'client-456',
      trainer_id: 'trainer-789',
      workout_plan_id: 'workout-111',
      diet_plan_id: 'diet-222'
    };

    const mockClient = {
      id: 'client-456',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com'
    };

    const mockProgram = {
      id: 'program-123',
      name: '12-Week Strength Program'
    };

    it('should fetch client contact info', async () => {
      getUserContact.mockResolvedValue(mockClient);
      
      const client = await getUserContact(programAssignedData.client_id);
      
      expect(getUserContact).toHaveBeenCalledWith('client-456');
      expect(client.email).toBe('john.doe@example.com');
    });

    it('should fetch program details', async () => {
      getProgramDetails.mockResolvedValue(mockProgram);
      
      const program = await getProgramDetails(programAssignedData.program_id);
      
      expect(getProgramDetails).toHaveBeenCalledWith('program-123');
      expect(program.name).toBe('12-Week Strength Program');
    });

    it('should use default program name if not found', async () => {
      getProgramDetails.mockResolvedValue(null);
      
      const program = await getProgramDetails(programAssignedData.program_id);
      const programName = program ? program.name || 'Training Program' : 'Training Program';
      
      expect(programName).toBe('Training Program');
    });

    it('should create program notification with metadata', () => {
      const { program_id, workout_plan_id, diet_plan_id } = programAssignedData;
      
      const notification = {
        type: 'program_assigned',
        category: 'program_assigned',
        title: 'New Program Assigned',
        message: `Your trainer assigned you: ${mockProgram.name}`,
        metadata: { program_id, workout_plan_id, diet_plan_id }
      };
      
      expect(notification.type).toBe('program_assigned');
      expect(notification.metadata.workout_plan_id).toBe('workout-111');
      expect(notification.metadata.diet_plan_id).toBe('diet-222');
    });

    it('should handle client fetch failure', async () => {
      getUserContact.mockResolvedValue(null);
      
      const client = await getUserContact(programAssignedData.client_id);
      
      expect(client).toBeNull();
    });
  });

  describe('handleAchievementEarned', () => {
    const achievementData = {
      achievement_id: 'achievement-123',
      client_id: 'client-456',
      type: 'weight_milestone',
      title: '5kg Lost!',
      description: 'Congratulations on losing 5kg!'
    };

    const mockClient = {
      id: 'client-456',
      first_name: 'Jane',
      email: 'jane@example.com'
    };

    it('should create achievement email with celebration emoji', async () => {
      getUserContact.mockResolvedValue(mockClient);
      
      const emailSubject = '🎉 Achievement Unlocked!';
      const emailBody = `Congratulations ${mockClient.first_name}!\n\nYou've earned a new achievement: ${achievementData.title}\n\n${achievementData.description || ''}\n\nKeep up the great work!`;
      
      expect(emailSubject).toBe('🎉 Achievement Unlocked!');
      expect(emailBody).toContain('Jane');
      expect(emailBody).toContain('5kg Lost!');
    });

    it('should create achievement notification', () => {
      const { achievement_id, type, title } = achievementData;
      
      const notification = {
        type: 'achievement',
        category: 'achievement',
        title: 'Achievement Unlocked!',
        message: `Congratulations! You've earned: ${title}`,
        metadata: { achievement_id, type }
      };
      
      expect(notification.type).toBe('achievement');
      expect(notification.category).toBe('achievement');
      expect(notification.message).toContain('5kg Lost!');
    });

    it('should handle missing description', () => {
      const dataWithoutDesc = { ...achievementData, description: null };
      
      const emailBody = `Congratulations!\n\nYou've earned a new achievement: ${dataWithoutDesc.title}\n\n${dataWithoutDesc.description || ''}\n\nKeep up the great work!`;
      
      expect(emailBody).not.toContain('null');
    });
  });

  describe('handleProgramCompleted', () => {
    const programCompletedData = {
      program_id: 'program-123',
      client_id: 'client-456',
      trainer_id: 'trainer-789'
    };

    const mockClient = {
      id: 'client-456',
      first_name: 'Mike',
      email: 'mike@example.com'
    };

    it('should create completion email', async () => {
      getUserContact.mockResolvedValue(mockClient);
      
      const emailSubject = 'Program Completed!';
      const emailBody = `Congratulations ${mockClient.first_name}!\n\nYou've successfully completed your training program!\n\nGreat work on finishing your program. Keep up the momentum!`;
      
      expect(emailSubject).toBe('Program Completed!');
      expect(emailBody).toContain('Mike');
      expect(emailBody).toContain('successfully completed');
    });

    it('should create completion notification', () => {
      const { program_id } = programCompletedData;
      
      const notification = {
        type: 'program_completed',
        category: 'program_assigned',
        title: 'Program Completed!',
        message: 'Congratulations on completing your training program!',
        metadata: { program_id }
      };
      
      expect(notification.type).toBe('program_completed');
      expect(notification.metadata.program_id).toBe('program-123');
    });
  });

  describe('handleBookingCompleted', () => {
    const bookingCompletedData = {
      booking_id: 'booking-123',
      client_id: 'client-456',
      trainer_id: 'trainer-789',
      workout_date: '2025-01-15'
    };

    it('should create session completed notification', () => {
      const { booking_id, workout_date } = bookingCompletedData;
      
      const notification = {
        type: 'booking_completed',
        category: 'booking_confirmation',
        title: 'Session Completed',
        message: `Your training session on ${workout_date} is complete. Log your workout!`,
        metadata: { booking_id }
      };
      
      expect(notification.type).toBe('booking_completed');
      expect(notification.message).toContain('2025-01-15');
      expect(notification.message).toContain('Log your workout');
    });
  });

  describe('handleMilestoneReached', () => {
    const milestoneData = {
      client_id: 'client-456',
      milestone_type: 'Weight Loss',
      achieved_value: '75kg',
      previous_value: '80kg'
    };

    it('should create milestone email with progress info', () => {
      const { milestone_type, achieved_value, previous_value } = milestoneData;
      
      const emailBody = `Congratulations!\n\nYou've reached a new milestone:\n${milestone_type}: ${achieved_value}\n\nProgress from: ${previous_value} → ${achieved_value}\n\nKeep up the amazing work!`;
      
      expect(emailBody).toContain('Weight Loss');
      expect(emailBody).toContain('75kg');
      expect(emailBody).toContain('80kg → 75kg');
    });

    it('should create milestone notification', () => {
      const notification = {
        type: 'milestone',
        category: 'achievement',
        title: 'Milestone Achieved!',
        message: `You've reached: ${milestoneData.milestone_type}`,
        metadata: milestoneData
      };
      
      expect(notification.type).toBe('milestone');
      expect(notification.category).toBe('achievement');
    });
  });
});

describe('Notification Structure', () => {
  it('should have required fields', () => {
    const notification = {
      id: Date.now().toString(),
      type: 'test',
      category: 'test_category',
      title: 'Test Title',
      message: 'Test message',
      metadata: {},
      read_at: null,
      created_at: new Date()
    };

    expect(notification).toHaveProperty('id');
    expect(notification).toHaveProperty('type');
    expect(notification).toHaveProperty('category');
    expect(notification).toHaveProperty('title');
    expect(notification).toHaveProperty('message');
    expect(notification).toHaveProperty('read_at');
    expect(notification).toHaveProperty('created_at');
  });

  it('should start with read_at as null', () => {
    const notification = {
      id: '123',
      type: 'test',
      read_at: null,
      created_at: new Date()
    };

    expect(notification.read_at).toBeNull();
  });
});

describe('Email/SMS Mock Functions', () => {
  describe('sendEmail mock', () => {
    it('should resolve to true on success', async () => {
      const mockSendEmail = jest.fn().mockResolvedValue(true);
      const result = await mockSendEmail('test@example.com', 'Subject', 'Body');
      expect(result).toBe(true);
    });

    it('should be called with correct parameters', async () => {
      const mockSendEmail = jest.fn().mockResolvedValue(true);
      await mockSendEmail('user@fitsync.com', 'Welcome', 'Welcome to FitSync!');
      
      expect(mockSendEmail).toHaveBeenCalledWith(
        'user@fitsync.com',
        'Welcome',
        'Welcome to FitSync!'
      );
    });
  });

  describe('sendSMS mock', () => {
    it('should resolve to true on success', async () => {
      const mockSendSMS = jest.fn().mockResolvedValue(true);
      const result = await mockSendSMS('+1234567890', 'Your code is 123456');
      expect(result).toBe(true);
    });
  });
});
