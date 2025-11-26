require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('redis');
const logger = require('./config/logger');
const { getUserContact, getProgramDetails, getBookingDetails } = require('./utils/httpClient');

const app = express();
const PORT = process.env.PORT || 3005;

// In-memory notification store (replace with database in production)
const notifications = new Map();

// Redis client for subscribing
let redisSubscriber;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
});

// Mock email sending
async function sendEmail(to, subject, body) {
  // In production, use nodemailer with real SMTP
  logger.info(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);
  logger.info(`[MOCK EMAIL] Body: ${body}`);
  return true;
}

// Mock SMS sending
async function sendSMS(to, message) {
  logger.info(`[MOCK SMS] To: ${to}, Message: ${message}`);
  return true;
}

// Store notification
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

// Event handlers
async function handleBookingCreated(data) {
  logger.info('Handling booking.created event', data);

  const { booking_id, client_id, trainer_id, booking_date, start_time } = data;

  // Send confirmation to client
  await sendEmail(
    `client-${client_id}@fitsync.com`,
    'Booking Confirmation',
    `Your booking for ${booking_date} at ${start_time} has been confirmed. Booking ID: ${booking_id}`
  );

  // Store in-app notification
  storeNotification(client_id, {
    type: 'booking_confirmation',
    category: 'booking_confirmation',
    title: 'Booking Confirmed',
    message: `Your session on ${booking_date} at ${start_time} has been booked successfully.`,
    metadata: { booking_id, booking_date, start_time }
  });

  logger.info(`Booking confirmation sent to client ${client_id}`);
}

async function handleBookingCancelled(data) {
  logger.info('Handling booking.cancelled event', data);

  const { booking_id, client_id, reason } = data;

  await sendEmail(
    `client-${client_id}@fitsync.com`,
    'Booking Cancelled',
    `Your booking has been cancelled. ${reason ? `Reason: ${reason}` : ''}`
  );

  storeNotification(client_id, {
    type: 'booking_cancellation',
    category: 'booking_reminder',
    title: 'Booking Cancelled',
    message: `Your booking has been cancelled. ${reason || ''}`,
    metadata: { booking_id }
  });
}

async function handleProgramAssigned(data) {
  logger.info('Handling program.assigned event', data);

  const { program_id, client_id, trainer_id, workout_plan_id, diet_plan_id } = data;

  // Fetch client contact info
  const client = await getUserContact(client_id);
  if (!client) {
    logger.error(`Could not fetch client ${client_id} for program notification`);
    return;
  }

  // Fetch program details
  const program = await getProgramDetails(program_id);
  const programName = program ? program.name || 'Training Program' : 'Training Program';

  await sendEmail(
    client.email,
    'New Training Program Assigned',
    `Hi ${client.first_name},\n\nYour trainer has assigned you a new program: ${programName}\n\nLog in to view your program details and get started!`
  );

  storeNotification(client_id, {
    type: 'program_assigned',
    category: 'program_assigned',
    title: 'New Program Assigned',
    message: `Your trainer assigned you: ${programName}`,
    metadata: { program_id, workout_plan_id, diet_plan_id }
  });

  logger.info(`Program assignment notification sent to client ${client_id}`);
}

async function handleAchievementEarned(data) {
  logger.info('Handling achievement.earned event', data);

  const { achievement_id, client_id, type, title, description } = data;

  // Fetch client contact info
  const client = await getUserContact(client_id);
  if (!client) {
    logger.error(`Could not fetch client ${client_id} for achievement notification`);
    return;
  }

  await sendEmail(
    client.email,
    '🎉 Achievement Unlocked!',
    `Congratulations ${client.first_name}!\n\nYou've earned a new achievement: ${title}\n\n${description || ''}\n\nKeep up the great work!`
  );

  storeNotification(client_id, {
    type: 'achievement',
    category: 'achievement',
    title: 'Achievement Unlocked!',
    message: `Congratulations! You've earned: ${title}`,
    metadata: { achievement_id, type }
  });
}

async function handleProgramCompleted(data) {
  logger.info('Handling program.completed event', data);

  const { program_id, client_id, trainer_id } = data;

  const client = await getUserContact(client_id);
  if (!client) return;

  await sendEmail(
    client.email,
    'Program Completed!',
    `Congratulations ${client.first_name}!\n\nYou've successfully completed your training program!\n\nGreat work on finishing your program. Keep up the momentum!`
  );

  storeNotification(client_id, {
    type: 'program_completed',
    category: 'program_assigned',
    title: 'Program Completed!',
    message: 'Congratulations on completing your training program!',
    metadata: { program_id }
  });
}

async function handleBookingCompleted(data) {
  logger.info('Handling booking.completed event', data);

  const { booking_id, client_id, trainer_id, workout_date } = data;

  const client = await getUserContact(client_id);
  if (!client) return;

  await sendEmail(
    client.email,
    'Session Completed',
    `Hi ${client.first_name},\n\nYour training session on ${workout_date} has been marked as complete.\n\nYou can now log your workout details and track your progress!`
  );

  storeNotification(client_id, {
    type: 'booking_completed',
    category: 'booking_confirmation',
    title: 'Session Completed',
    message: `Your training session on ${workout_date} is complete. Log your workout!`,
    metadata: { booking_id }
  });
}

async function handleMilestoneReached(data) {
  logger.info('Handling milestone.reached event', data);

  const { client_id, milestone_type, achieved_value, previous_value } = data;

  const client = await getUserContact(client_id);
  if (!client) return;

  await sendEmail(
    client.email,
    '🎯 Milestone Achieved!',
    `Congratulations ${client.first_name}!\n\nYou've reached a new milestone:\n${milestone_type}: ${achieved_value}\n\nProgress from: ${previous_value} → ${achieved_value}\n\nKeep up the amazing work!`
  );

  storeNotification(client_id, {
    type: 'milestone',
    category: 'achievement',
    title: 'Milestone Achieved!',
    message: `You've reached: ${milestone_type}`,
    metadata: data
  });
}

// API Endpoints

app.get('/api/notifications', (req, res) => {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_USER_ID', message: 'user_id query parameter required' }
    });
  }

  const userNotifications = notifications.get(userId) || [];
  res.json({ success: true, data: userNotifications });
});

app.put('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_USER_ID', message: 'user_id query parameter required' }
    });
  }

  const userNotifications = notifications.get(userId) || [];
  const notification = userNotifications.find(n => n.id === id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Notification not found' }
    });
  }

  notification.read_at = new Date();
  res.json({ success: true, data: notification });
});

app.delete('/api/notifications/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_USER_ID', message: 'user_id query parameter required' }
    });
  }

  const userNotifications = notifications.get(userId);
  if (userNotifications) {
    const index = userNotifications.findIndex(n => n.id === id);
    if (index !== -1) {
      userNotifications.splice(index, 1);
      return res.json({ success: true, message: 'Notification deleted' });
    }
  }

  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Notification not found' }
  });
});

app.get('/api/notifications/unread/count', (req, res) => {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_USER_ID', message: 'user_id query parameter required' }
    });
  }

  const userNotifications = notifications.get(userId) || [];
  const unreadCount = userNotifications.filter(n => !n.read_at).length;

  res.json({ success: true, data: { count: unreadCount } });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found', timestamp: new Date().toISOString() }
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', timestamp: new Date().toISOString() }
  });
});

// Start server and subscribe to events
async function startServer() {
  try {
    // Create Redis subscriber
    redisSubscriber = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      }
    });

    redisSubscriber.on('error', (err) => {
      logger.error('Redis Subscriber Error:', err);
    });

    await redisSubscriber.connect();
    logger.info('Redis subscriber connected');

    // Subscribe to all events
    await redisSubscriber.subscribe('booking.created', handleBookingCreated);
    await redisSubscriber.subscribe('booking.cancelled', handleBookingCancelled);
    await redisSubscriber.subscribe('booking.completed', handleBookingCompleted);
    await redisSubscriber.subscribe('program.assigned', handleProgramAssigned);
    await redisSubscriber.subscribe('program.completed', handleProgramCompleted);
    await redisSubscriber.subscribe('achievement.earned', handleAchievementEarned);
    await redisSubscriber.subscribe('milestone.reached', handleMilestoneReached);

    logger.info('Subscribed to all Redis event channels');

    app.listen(PORT, () => {
      logger.info(`Notification Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing connections');
  if (redisSubscriber) {
    await redisSubscriber.quit();
  }
  process.exit(0);
});

startServer();

module.exports = app;
