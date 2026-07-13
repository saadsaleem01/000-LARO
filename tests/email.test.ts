import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emailRouter } from '../server/routers/email';

describe('Email Router', () => {
  describe('getProviderInfo', () => {
    it('should return console provider when no email service is configured', async () => {
      // Clear environment variables
      delete process.env.SENDGRID_API_KEY;
      delete process.env.AWS_SES_REGION;
      delete process.env.SMTP_HOST;

      const caller = emailRouter.createCaller({
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          loginMethod: 'google',
          role: 'user',
          createdAt: new Date(),
          lastSignedIn: new Date(),
        },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.getProviderInfo();

      expect(result).toBeDefined();
      expect(result.provider).toBe('console');
      expect(result.configured).toBe(false);
      expect(result.name).toBe('Console (Development)');
    });

    it('should return sendgrid provider when SENDGRID_API_KEY is set', async () => {
      process.env.SENDGRID_API_KEY = 'test-key';
      delete process.env.AWS_SES_REGION;
      delete process.env.SMTP_HOST;

      const caller = emailRouter.createCaller({
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          loginMethod: 'google',
          role: 'user',
          createdAt: new Date(),
          lastSignedIn: new Date(),
        },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.getProviderInfo();

      expect(result.provider).toBe('sendgrid');
      expect(result.configured).toBe(true);
      expect(result.name).toBe('SendGrid');

      // Cleanup
      delete process.env.SENDGRID_API_KEY;
    });

    it('should return ses provider when AWS_SES_REGION is set', async () => {
      delete process.env.SENDGRID_API_KEY;
      process.env.AWS_SES_REGION = 'us-east-1';
      delete process.env.SMTP_HOST;

      const caller = emailRouter.createCaller({
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          loginMethod: 'google',
          role: 'user',
          createdAt: new Date(),
          lastSignedIn: new Date(),
        },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.getProviderInfo();

      expect(result.provider).toBe('ses');
      expect(result.configured).toBe(true);
      expect(result.name).toBe('AWS SES');

      // Cleanup
      delete process.env.AWS_SES_REGION;
    });

    it('should return smtp provider when SMTP_HOST is set', async () => {
      delete process.env.SENDGRID_API_KEY;
      delete process.env.AWS_SES_REGION;
      process.env.SMTP_HOST = 'smtp.example.com';

      const caller = emailRouter.createCaller({
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          loginMethod: 'google',
          role: 'user',
          createdAt: new Date(),
          lastSignedIn: new Date(),
        },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.getProviderInfo();

      expect(result.provider).toBe('smtp');
      expect(result.configured).toBe(true);
      expect(result.name).toBe('SMTP');

      // Cleanup
      delete process.env.SMTP_HOST;
    });
  });

  describe('test', () => {
    it('should validate email input', async () => {
      const caller = emailRouter.createCaller({
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          loginMethod: 'google',
          role: 'user',
          createdAt: new Date(),
          lastSignedIn: new Date(),
        },
        req: {} as any,
        res: {} as any,
      });

      try {
        await caller.test({
          to: 'invalid-email',
          subject: 'Test',
        });
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid email');
      }
    });

    it('should accept valid email input', async () => {
      delete process.env.SENDGRID_API_KEY;
      delete process.env.AWS_SES_REGION;
      delete process.env.SMTP_HOST;

      const caller = emailRouter.createCaller({
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          loginMethod: 'google',
          role: 'user',
          createdAt: new Date(),
          lastSignedIn: new Date(),
        },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.test({
        to: 'recipient@example.com',
        subject: 'Test Email',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('logged to console');
    });

    it('should use default subject when not provided', async () => {
      delete process.env.SENDGRID_API_KEY;
      delete process.env.AWS_SES_REGION;
      delete process.env.SMTP_HOST;

      const caller = emailRouter.createCaller({
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          loginMethod: 'google',
          role: 'user',
          createdAt: new Date(),
          lastSignedIn: new Date(),
        },
        req: {} as any,
        res: {} as any,
      });

      const result = await caller.test({
        to: 'recipient@example.com',
      });

      expect(result.success).toBe(true);
    });
  });
});
