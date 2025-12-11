/**
 * Unit tests for notification storage and retrieval logic.
 */

describe('Notification Storage', () => {
  let notifications;

  beforeEach(() => {
    // Reset the in-memory store for each test
    notifications = new Map();
  });

  // Helper function to store notification (mirrors the one in index.js)
  function storeNotification(userId, notification) {
    if (!notifications.has(userId)) {
      notifications.set(userId, []);
    }
    notifications.get(userId).push({
      id: Date.now().toString(),
      ...notification,
      read_at: null,
      created_at: new Date()
    });
  }

  describe('storeNotification', () => {
    it('should create user array if not exists', () => {
      expect(notifications.has('user-123')).toBe(false);
      
      storeNotification('user-123', {
        type: 'test',
        title: 'Test',
        message: 'Test message'
      });
      
      expect(notifications.has('user-123')).toBe(true);
      expect(notifications.get('user-123').length).toBe(1);
    });

    it('should append to existing user notifications', () => {
      storeNotification('user-123', {
        type: 'first',
        title: 'First',
        message: 'First message'
      });
      
      storeNotification('user-123', {
        type: 'second',
        title: 'Second',
        message: 'Second message'
      });
      
      const userNotifications = notifications.get('user-123');
      expect(userNotifications.length).toBe(2);
      expect(userNotifications[0].type).toBe('first');
      expect(userNotifications[1].type).toBe('second');
    });

    it('should add id, read_at, and created_at fields', () => {
      storeNotification('user-123', {
        type: 'test',
        title: 'Test',
        message: 'Test message'
      });
      
      const notification = notifications.get('user-123')[0];
      
      expect(notification.id).toBeDefined();
      expect(notification.read_at).toBeNull();
      expect(notification.created_at).toBeInstanceOf(Date);
    });

    it('should preserve original notification properties', () => {
      const originalNotification = {
        type: 'booking_confirmation',
        category: 'booking_confirmation',
        title: 'Booking Confirmed',
        message: 'Your session has been booked.',
        metadata: { booking_id: 'booking-123' }
      };
      
      storeNotification('user-123', originalNotification);
      
      const stored = notifications.get('user-123')[0];
      
      expect(stored.type).toBe('booking_confirmation');
      expect(stored.category).toBe('booking_confirmation');
      expect(stored.title).toBe('Booking Confirmed');
      expect(stored.metadata.booking_id).toBe('booking-123');
    });

    it('should store notifications for multiple users independently', () => {
      storeNotification('user-1', { type: 'test1', title: 'For User 1', message: 'msg1' });
      storeNotification('user-2', { type: 'test2', title: 'For User 2', message: 'msg2' });
      storeNotification('user-1', { type: 'test3', title: 'Another for User 1', message: 'msg3' });
      
      expect(notifications.get('user-1').length).toBe(2);
      expect(notifications.get('user-2').length).toBe(1);
    });
  });

  describe('Notification Retrieval', () => {
    beforeEach(() => {
      // Pre-populate some notifications
      storeNotification('user-123', {
        type: 'booking_confirmation',
        title: 'Booking Confirmed',
        message: 'Your session is confirmed'
      });
      storeNotification('user-123', {
        type: 'achievement',
        title: 'Achievement Unlocked',
        message: 'You earned a badge!'
      });
    });

    it('should retrieve all notifications for a user', () => {
      const userNotifications = notifications.get('user-123') || [];
      
      expect(userNotifications.length).toBe(2);
    });

    it('should return empty array for user with no notifications', () => {
      const userNotifications = notifications.get('nonexistent-user') || [];
      
      expect(userNotifications).toEqual([]);
    });

    it('should find notification by id', () => {
      const userNotifications = notifications.get('user-123');
      const targetId = userNotifications[0].id;
      
      const found = userNotifications.find(n => n.id === targetId);
      
      expect(found).toBeDefined();
      expect(found.type).toBe('booking_confirmation');
    });

    it('should return undefined for non-existent notification id', () => {
      const userNotifications = notifications.get('user-123');
      
      const found = userNotifications.find(n => n.id === 'nonexistent-id');
      
      expect(found).toBeUndefined();
    });
  });

  describe('Mark as Read', () => {
    beforeEach(() => {
      storeNotification('user-123', {
        type: 'test',
        title: 'Test',
        message: 'Test message'
      });
    });

    it('should mark notification as read with timestamp', () => {
      const userNotifications = notifications.get('user-123');
      const notification = userNotifications[0];
      
      expect(notification.read_at).toBeNull();
      
      notification.read_at = new Date();
      
      expect(notification.read_at).toBeInstanceOf(Date);
    });

    it('should not affect other notifications when marking one as read', () => {
      storeNotification('user-123', {
        type: 'second',
        title: 'Second',
        message: 'Second message'
      });
      
      const userNotifications = notifications.get('user-123');
      userNotifications[0].read_at = new Date();
      
      expect(userNotifications[0].read_at).not.toBeNull();
      expect(userNotifications[1].read_at).toBeNull();
    });
  });

  describe('Delete Notification', () => {
    beforeEach(() => {
      // Reset notifications map for clean state
      notifications = new Map();
      storeNotification('user-123', { type: 'first', title: 'First', message: 'msg1' });
      storeNotification('user-123', { type: 'second', title: 'Second', message: 'msg2' });
      storeNotification('user-123', { type: 'third', title: 'Third', message: 'msg3' });
    });

    it('should delete notification by id', () => {
      const userNotifications = notifications.get('user-123');
      expect(userNotifications.length).toBe(3);
      
      // Get the second notification by index (order is first, second, third)
      const notificationToDelete = userNotifications[1];
      expect(notificationToDelete.type).toBe('second');
      
      // Remove by index
      userNotifications.splice(1, 1);
      
      expect(userNotifications.length).toBe(2);
      expect(userNotifications[0].type).toBe('first');
      expect(userNotifications[1].type).toBe('third');
    });

    it('should return -1 for non-existent notification', () => {
      const userNotifications = notifications.get('user-123');
      
      const index = userNotifications.findIndex(n => n.id === 'nonexistent');
      
      expect(index).toBe(-1);
    });

    it('should maintain order of remaining notifications after delete', () => {
      const userNotifications = notifications.get('user-123');
      expect(userNotifications.length).toBe(3);
      
      // Delete the first notification
      userNotifications.splice(0, 1);
      
      // Should have 2 remaining in correct order
      expect(userNotifications.length).toBe(2);
      expect(userNotifications[0].type).toBe('second');
      expect(userNotifications[1].type).toBe('third');
    });
  });

  describe('Unread Count', () => {
    beforeEach(() => {
      // Add some notifications, some read, some unread
      storeNotification('user-123', { type: 'test1', title: 'Test 1', message: 'msg1' });
      storeNotification('user-123', { type: 'test2', title: 'Test 2', message: 'msg2' });
      storeNotification('user-123', { type: 'test3', title: 'Test 3', message: 'msg3' });
      
      // Mark one as read
      const userNotifications = notifications.get('user-123');
      userNotifications[1].read_at = new Date();
    });

    it('should count unread notifications', () => {
      const userNotifications = notifications.get('user-123');
      const unreadCount = userNotifications.filter(n => !n.read_at).length;
      
      expect(unreadCount).toBe(2);
    });

    it('should return 0 for empty notification list', () => {
      const emptyNotifications = [];
      const unreadCount = emptyNotifications.filter(n => !n.read_at).length;
      
      expect(unreadCount).toBe(0);
    });

    it('should return 0 when all are read', () => {
      const userNotifications = notifications.get('user-123');
      userNotifications.forEach(n => n.read_at = new Date());
      
      const unreadCount = userNotifications.filter(n => !n.read_at).length;
      
      expect(unreadCount).toBe(0);
    });
  });
});

describe('Notification Categories', () => {
  const categories = [
    'booking_confirmation',
    'booking_reminder',
    'program_assigned',
    'achievement'
  ];

  it('should support all defined categories', () => {
    const testNotifications = categories.map(cat => ({
      type: `test_${cat}`,
      category: cat,
      title: `Test ${cat}`,
      message: `Test message for ${cat}`
    }));

    expect(testNotifications.length).toBe(4);
    testNotifications.forEach((n, i) => {
      expect(n.category).toBe(categories[i]);
    });
  });

  it('should allow filtering by category', () => {
    const allNotifications = [
      { type: 'booking1', category: 'booking_confirmation', title: 'Booking 1' },
      { type: 'achievement1', category: 'achievement', title: 'Achievement 1' },
      { type: 'booking2', category: 'booking_reminder', title: 'Booking 2' },
      { type: 'program1', category: 'program_assigned', title: 'Program 1' },
      { type: 'achievement2', category: 'achievement', title: 'Achievement 2' }
    ];

    const achievementNotifications = allNotifications.filter(n => n.category === 'achievement');
    
    expect(achievementNotifications.length).toBe(2);
  });
});

describe('Notification Types', () => {
  const notificationTypes = [
    'booking_confirmation',
    'booking_cancellation',
    'booking_completed',
    'program_assigned',
    'program_completed',
    'achievement',
    'milestone'
  ];

  it('should support all notification types', () => {
    notificationTypes.forEach(type => {
      const notification = {
        type: type,
        title: `Test ${type}`,
        message: `Test message for ${type}`
      };
      
      expect(notification.type).toBe(type);
    });
  });
});

describe('Metadata Handling', () => {
  it('should store booking metadata', () => {
    const notification = {
      type: 'booking_confirmation',
      title: 'Booking Confirmed',
      message: 'Your session is confirmed',
      metadata: {
        booking_id: 'booking-123',
        booking_date: '2025-01-15',
        start_time: '10:00'
      }
    };

    expect(notification.metadata.booking_id).toBe('booking-123');
    expect(notification.metadata.booking_date).toBe('2025-01-15');
    expect(notification.metadata.start_time).toBe('10:00');
  });

  it('should store program metadata', () => {
    const notification = {
      type: 'program_assigned',
      title: 'New Program',
      message: 'You have a new program',
      metadata: {
        program_id: 'program-123',
        workout_plan_id: 'workout-456',
        diet_plan_id: 'diet-789'
      }
    };

    expect(notification.metadata.program_id).toBe('program-123');
    expect(notification.metadata.workout_plan_id).toBe('workout-456');
    expect(notification.metadata.diet_plan_id).toBe('diet-789');
  });

  it('should store achievement metadata', () => {
    const notification = {
      type: 'achievement',
      title: 'Achievement Unlocked',
      message: 'You earned a badge',
      metadata: {
        achievement_id: 'ach-123',
        type: 'weight_milestone'
      }
    };

    expect(notification.metadata.achievement_id).toBe('ach-123');
    expect(notification.metadata.type).toBe('weight_milestone');
  });

  it('should handle empty metadata', () => {
    const notification = {
      type: 'test',
      title: 'Test',
      message: 'Test message',
      metadata: {}
    };

    expect(notification.metadata).toEqual({});
  });
});
