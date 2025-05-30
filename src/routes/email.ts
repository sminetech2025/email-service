import { Router, RequestHandler } from 'express';
import { sendEmail } from '../services/emailService';
import logger from '../utils/logger';

export const emailRouter = Router();

interface SmtpConfigValidation {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
  fromEmail: string;
  fromName: string;
}

interface EmailRequestBody {
  recipients: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  }>;
  subject: string;
  body: string;
  smtpConfig: SmtpConfigValidation;
}

const validateEmailRequest = (body: any): body is EmailRequestBody => {
  const { recipients, subject, body: emailBody, smtpConfig } = body;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('Recipients must be a non-empty array');
  }

  if (typeof subject !== 'string' || subject.trim().length === 0) {
    throw new Error('Subject is required');
  }

  if (typeof emailBody !== 'string' || emailBody.trim().length === 0) {
    throw new Error('Email body is required');
  }

  if (!smtpConfig || typeof smtpConfig !== 'object') {
    throw new Error('SMTP configuration is required');
  }

  const requiredSmtpFields: (keyof SmtpConfigValidation)[] = [
    'host', 'port', 'username', 'password', 'secure', 'fromEmail', 'fromName'
  ];

  for (const field of requiredSmtpFields) {
    if (!(field in smtpConfig)) {
      throw new Error(`Missing required SMTP field: ${field}`);
    }
  }

  if (typeof smtpConfig.port !== 'number' || smtpConfig.port <= 0) {
    throw new Error('SMTP port must be a positive number');
  }

  return true;
};

const sendEmailHandler: RequestHandler = async (req, res) => {
  try {
    const startTime = Date.now();
    logger.info('Received email send request', {
      recipientCount: req.body.recipients?.length,
      subject: req.body.subject
    });

    validateEmailRequest(req.body);
    
    const { recipients, subject, body, smtpConfig } = req.body;

    await sendEmail({
      to: recipients,
      subject,
      html: body,
      smtp: {
        host: smtpConfig.host,
        port: smtpConfig.port,
        user: smtpConfig.username,
        password: smtpConfig.password,
        secure: smtpConfig.secure,
        fromEmail: smtpConfig.fromEmail,
        fromName: smtpConfig.fromName
      }
    });

    const duration = Date.now() - startTime;
    logger.info('Email send request completed', {
      recipientCount: recipients.length,
      duration
    });

    res.json({ 
      success: true,
      message: `Email sent successfully to ${recipients.length} recipient(s)`
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Email send request failed', {
        error: error.message,
        stack: error.stack
      });

      // Determine if this is a validation error or a system error
      const isValidationError = error.message.includes('required') || 
                               error.message.includes('must be') ||
                               error.message.includes('Missing');

      res.status(isValidationError ? 400 : 500).json({ 
        success: false,
        message: isValidationError ? error.message : 'Failed to send email',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else {
      logger.error('Unknown error in email send request');
      res.status(500).json({ 
        success: false,
        message: 'An unexpected error occurred'
      });
    }
  }
};

emailRouter.post('/send', sendEmailHandler);