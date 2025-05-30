import { SMTPClient } from 'emailjs';
import logger from '../utils/logger';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
  fromEmail: string;
  fromName: string;
}

interface EmailRecipient {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
}

interface EmailParams {
  to: EmailRecipient[];
  subject: string;
  html: string;
  smtp: SmtpConfig;
}

function replaceVariables(text: string, recipient: EmailRecipient): string {
  return text
    .replace(/\[first_name\]/gi, recipient.firstName || '')
    .replace(/\[last_name\]/gi, recipient.lastName || '')
    .replace(/\[email\]/gi, recipient.email)
    .replace(/\[company\]/gi, recipient.company || '');
}

function validateRecipient(recipient: EmailRecipient): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(recipient.email);
}

export async function sendEmail({ to, subject, html, smtp }: EmailParams): Promise<void> {
  logger.info('Initializing email send operation', { 
    recipientCount: to.length,
    smtpHost: smtp.host 
  });

  const validRecipients = to.filter(validateRecipient);
  const invalidRecipients = to.filter(r => !validateRecipient(r));

  if (invalidRecipients.length > 0) {
    logger.warn('Invalid recipients found', { 
      invalidEmails: invalidRecipients.map(r => r.email) 
    });
  }

  if (validRecipients.length === 0) {
    const error = new Error('No valid recipients provided');
    logger.error('Email send failed - no valid recipients');
    throw error;
  }

  const client = new SMTPClient({
    host: smtp.host,
    port: smtp.port,
    user: smtp.user,
    password: smtp.password,
    ssl: smtp.secure,
    timeout: 30000, // 30 second timeout
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });

  try {
    // Send email to each recipient with personalized content
    for (const recipient of validRecipients) {
      const personalizedSubject = replaceVariables(subject, recipient);
      const personalizedHtml = replaceVariables(html, recipient);
      const plainText = personalizedHtml.replace(/<[^>]*>/g, '');

      logger.info('Sending email', { 
        to: recipient.email,
        subject: personalizedSubject 
      });

      await client.sendAsync({
        from: `${smtp.fromName} <${smtp.fromEmail}>`,
        to: recipient.email,
        subject: personalizedSubject,
        text: plainText,
        attachment: [
          { data: personalizedHtml, alternative: true }
        ]
      });

      logger.info('Email sent successfully', { 
        to: recipient.email 
      });
    }
  } catch (error) {
    logger.error('Email send failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      smtpHost: smtp.host
    });
    throw error;
  }
}