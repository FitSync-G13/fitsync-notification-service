const axios = require('axios');
const logger = require('../config/logger');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const TRAINING_SERVICE_URL = process.env.TRAINING_SERVICE_URL || 'http://localhost:3002';
const SCHEDULE_SERVICE_URL = process.env.SCHEDULE_SERVICE_URL || 'http://localhost:8003';

// Create axios instances
const userServiceClient = axios.create({
  baseURL: USER_SERVICE_URL,
  timeout: 5000
});

const trainingServiceClient = axios.create({
  baseURL: TRAINING_SERVICE_URL,
  timeout: 5000
});

const scheduleServiceClient = axios.create({
  baseURL: SCHEDULE_SERVICE_URL,
  timeout: 5000
});

/**
 * Get user contact information
 */
async function getUserContact(userId) {
  try {
    const response = await userServiceClient.get(`/api/users/${userId}`);
    return response.data.data;
  } catch (error) {
    logger.error(`Error fetching user ${userId}:`, error.message);
    return null;
  }
}

/**
 * Get multiple users in batch
 */
async function getUsersBatch(userIds) {
  try {
    const response = await userServiceClient.post('/api/users/batch', {
      user_ids: userIds
    });
    return response.data.data;
  } catch (error) {
    logger.error('Error fetching users batch:', error.message);
    return [];
  }
}

/**
 * Get program details
 */
async function getProgramDetails(programId) {
  try {
    const response = await trainingServiceClient.get(`/api/programs/${programId}`);
    return response.data.data;
  } catch (error) {
    logger.error(`Error fetching program ${programId}:`, error.message);
    return null;
  }
}

/**
 * Get booking details
 */
async function getBookingDetails(bookingId) {
  try {
    const response = await scheduleServiceClient.get(`/api/bookings/${bookingId}`);
    return response.data.data;
  } catch (error) {
    logger.error(`Error fetching booking ${bookingId}:`, error.message);
    return null;
  }
}

module.exports = {
  getUserContact,
  getUsersBatch,
  getProgramDetails,
  getBookingDetails
};
