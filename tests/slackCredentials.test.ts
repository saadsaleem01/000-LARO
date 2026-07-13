import { describe, it, expect } from 'vitest';

/**
 * Test to validate Slack API credentials
 * Uses the Slack auth.test API endpoint to verify the bot token is valid
 */
describe('Slack Credentials Validation', () => {
  it('should have SLACK_BOT_TOKEN environment variable set', () => {
    expect(process.env.SLACK_BOT_TOKEN).toBeDefined();
    expect(process.env.SLACK_BOT_TOKEN).not.toBe('');
  });

  it('should have SLACK_CLIENT_ID environment variable set', () => {
    expect(process.env.SLACK_CLIENT_ID).toBeDefined();
    expect(process.env.SLACK_CLIENT_ID).not.toBe('');
  });

  it('should have SLACK_CLIENT_SECRET environment variable set', () => {
    expect(process.env.SLACK_CLIENT_SECRET).toBeDefined();
    expect(process.env.SLACK_CLIENT_SECRET).not.toBe('');
  });

  it('should validate Slack bot token with auth.test API', async () => {
    const token = process.env.SLACK_BOT_TOKEN;
    
    if (!token) {
      throw new Error('SLACK_BOT_TOKEN is not set');
    }

    const response = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();
    
    console.log('Slack auth.test response:', data);
    
    expect(data.ok).toBe(true);
    expect(data.team).toBeDefined();
    expect(data.user).toBeDefined();
  });
});
