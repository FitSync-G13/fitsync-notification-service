# FitSync Notification Service

Notification management service for the FitSync application.


## Features

- Multi-channel notifications (Email, Push, In-app)
- Notification templates
- Scheduled notifications
- Notification preferences management
- Email delivery via SMTP
- Real-time notification dispatch
- Notification history and tracking

## Technology Stack

- Node.js with Express
- Redis for queuing
- SMTP for email delivery
- WebSocket for real-time notifications

## Running the Full FitSync Application

This service is part of the FitSync multi-repository application. To run the complete application:

### Quick Start

1. **Clone all repositories:**

```bash
mkdir fitsync-app && cd fitsync-app

git clone https://github.com/FitSync-G13/fitsync-docker-compose.git
git clone https://github.com/FitSync-G13/fitsync-api-gateway.git
git clone https://github.com/FitSync-G13/fitsync-user-service.git
git clone https://github.com/FitSync-G13/fitsync-training-service.git
git clone https://github.com/FitSync-G13/fitsync-schedule-service.git
git clone https://github.com/FitSync-G13/fitsync-progress-service.git
git clone https://github.com/FitSync-G13/fitsync-notification-service.git
git clone https://github.com/FitSync-G13/fitsync-frontend.git
```

2. **Run setup:**

```bash
cd fitsync-docker-compose
./setup.sh    # Linux/Mac
setup.bat     # Windows
```

3. **Access:** http://localhost:3000

## Development - Run This Service Locally

1. **Start infrastructure:**
```bash
cd ../fitsync-docker-compose
docker compose up -d redis user-service
docker compose stop notification-service
```

2. **Install dependencies:**
```bash
cd ../fitsync-notification-service
npm install
```

3. **Configure environment (.env):**
```env
NODE_ENV=development
PORT=3005
REDIS_HOST=localhost
REDIS_PORT=6379
USER_SERVICE_URL=http://localhost:3001
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@fitsync.com
SMTP_PASSWORD=your-smtp-password
```

4. **Start development server:**
```bash
npm run dev
```

Service runs on http://localhost:3005

## API Endpoints

- `POST /api/notifications/send` - Send notification
- `GET /api/notifications/:userId` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/notifications/preferences/:userId` - Get notification preferences
- `PUT /api/notifications/preferences/:userId` - Update preferences

## Notification Types

- **Workout Assigned** - When trainer assigns a program
- **Session Booked** - Booking confirmations
- **Session Reminder** - Upcoming session reminders
- **Goal Achieved** - Milestone achievements
- **Progress Update** - Weekly progress summaries

## Testing

This service uses Jest for unit testing.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/unit/eventHandlers.test.js
```

### Test Structure

```
tests/
├── setup.js                          # Test environment configuration
└── unit/
    ├── eventHandlers.test.js         # Event handler tests (23 tests)
    ├── notificationStorage.test.js   # Storage logic tests (24 tests)
    └── httpClient.test.js            # HTTP client tests (16 tests)
```

### Test Coverage

The test suite covers:

#### Event Handlers (`eventHandlers.test.js`)
- **booking.created** - Tests email and notification creation for new bookings
- **booking.cancelled** - Tests cancellation notifications with reason handling
- **booking.completed** - Tests session completion notifications
- **program.assigned** - Tests program assignment with user/program data fetching
- **program.completed** - Tests program completion notifications
- **achievement.earned** - Tests achievement notifications with descriptions
- **milestone.reached** - Tests milestone notifications with progress info

#### Notification Storage (`notificationStorage.test.js`)
- **storeNotification** - User array creation, notification appending, field population
- **Retrieval** - User notifications retrieval, finding by ID
- **Mark as Read** - Timestamp updates, isolation between notifications
- **Delete** - Notification removal, array order preservation
- **Unread Count** - Counting unread notifications
- **Categories** - All notification categories (workout, booking, achievement, system, social)
- **Types** - All notification types (confirmation, reminder, alert, etc.)
- **Metadata** - Booking, program, and achievement metadata handling

#### HTTP Client (`httpClient.test.js`)
- **getUserContact** - User data fetching with error handling
- **getUsersBatch** - Batch user fetching
- **getProgramDetails** - Program details fetching
- **getBookingDetails** - Booking details fetching
- **Error Handling** - Network errors, timeouts, 404/500 responses

### Current Test Status

- **Total Tests:** 63
- **Passing:** 63
- **Coverage Areas:** Event handlers,notification storage,HTTP client utilities

## More Information

See [fitsync-docker-compose](https://github.com/FitSync-G13/fitsync-docker-compose) for complete documentation.

## License

MIT
