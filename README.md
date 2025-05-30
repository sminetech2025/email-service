# Email Service

A production-ready Express.js email service for sending personalized emails with SMTP support.

## Features

- Personalized email sending with template variables
- SMTP configuration support
- Rate limiting to prevent abuse
- Comprehensive error handling and validation
- Structured logging with Winston
- Security features with Helmet
- CORS configuration
- Production-ready build setup

## Prerequisites

- Node.js 18.x or higher
- npm 7.x or higher

## Development Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Copy the environment file:
```bash
cp .env.example .env
```
4. Update the environment variables in `.env` according to your needs

Start the development server:
```bash
npm run dev
```

## Production Deployment

You can deploy this Express service to any Node.js hosting platform (Heroku, Render, DigitalOcean App Platform, etc.).

1. Build the project:
```bash
npm run build
```

2. Set up environment variables on your hosting platform:
   - `NODE_ENV=production`
   - `PORT` (if required by platform)
   - `CORS_ORIGIN` to match your frontend URL
   - Configure other environment variables as needed

3. Start the production server:
```bash
npm start
```

## Monitoring and Health Checks

The service includes built-in monitoring:

- Health check endpoint: `GET /health`
- Winston logging to files and console
- Error tracking and request logging

View logs:
- Error logs: `./logs/error.log`
- Combined logs: `./logs/combined.log`

## Environment Variables

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGIN`: Allowed CORS origin for frontend requests
- `LOG_LEVEL`: Winston logger level (debug/info/warn/error)
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window
- `TLS_REJECT_UNAUTHORIZED`: TLS certificate validation

## API Documentation

### Send Email
`POST /api/email/send`

Request Body:
```typescript
{
  recipients: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  }>;
  subject: string;
  body: string;
  smtpConfig: {
    host: string;
    port: number;
    username: string;
    password: string;
    secure: boolean;
    fromEmail: string;
    fromName: string;
  }
}
```

Template Variables:
- `[first_name]`: Recipient's first name
- `[last_name]`: Recipient's last name
- `[email]`: Recipient's email address
- `[company]`: Recipient's company name

Response:
```typescript
{
  success: boolean;
  message: string;
  error?: string; // Only in development mode
}
```

## Security Features

- Helmet middleware for HTTP headers
- Rate limiting per IP
- CORS configuration
- Request size limiting
- TLS certificate validation in production
- Input validation and sanitization

## Logging and Error Handling

Logs are written to:
- Console (all levels, formatted for readability)
- `error.log` (error level only)
- `combined.log` (all levels)

Error handling includes:
- Validation errors (400 Bad Request)
- Rate limiting errors (429 Too Many Requests)
- Server errors (500 Internal Server Error)
- Uncaught exception handling
- Unhandled promise rejection tracking

## Frontend Integration

Update your frontend environment variables:
```env
VITE_EMAIL_SERVICE_URL=http://your-email-service-url:3001
```

The service automatically works with the development frontend at `http://localhost:5173`