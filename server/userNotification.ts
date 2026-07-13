// @ts-nocheck

import { ENV } from './_core/env';
import { getDb } from './db';
import { emailAccounts } from './schema';
import { eq, and } from 'drizzle-orm';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { refreshGmailToken, refreshOutlookToken, decryptToken, encryptToken } from './emailOAuth';

/**
 * User Notification Service
 * Send notifications directly to users (not owner)
 */

interface UserNotificationPayload {
  userId: string;
  userEmail: string;
  userName: string;
  title: string;
  content: string;
}

/**
 * Send notification to a specific user
 * For now, this logs to console. In production, integrate with email service (SendGrid, AWS SES, etc.)
 */
export async function notifyUser(payload: UserNotificationPayload): Promise<boolean> {
  const { userId, userEmail, userName, title, content } = payload;

  // Get user's connected email account
  const db = await getDb();
  if (!db) {
    console.warn(`[USER_NOTIFICATION] Database not available`);
    return false;
  }

  const accounts = await db
    .select()
    .from(emailAccounts)
    .where(and(
      eq(emailAccounts.userId, userId),
      eq(emailAccounts.status, 'active')
    ))
    .limit(1);

  if (!accounts[0]) {
    console.warn(`[USER_NOTIFICATION] User ${userId} has no connected email account, logging to console`);
    console.log(`[USER_NOTIFICATION] Would send to ${userEmail}:`);
    console.log(`  Title: ${title}`);
    console.log(`  Content: ${content}`);
    return false;
  }

  const account = accounts[0];
  
  // Refresh access token if needed
  const now = new Date();
  if (account.tokenExpiry && new Date(account.tokenExpiry) <= now) {
    try {
      const decryptedRefreshToken = decryptToken(account.refreshToken!);
      let newTokens;
      
      if (account.provider === 'gmail') {
        newTokens = await refreshGmailToken(decryptedRefreshToken);
      } else {
        newTokens = await refreshOutlookToken(decryptedRefreshToken);
      }
      
      // Update tokens in database
      await db.update(emailAccounts)
        .set({
          accessToken: encryptToken(newTokens.accessToken),
          tokenExpiry: new Date(newTokens.expiryDate),
        })
        .where(eq(emailAccounts.id, account.id));
      
      account.accessToken = encryptToken(newTokens.accessToken);
      account.tokenExpiry = new Date(newTokens.expiryDate);
    } catch (error) {
      console.error(`[USER_NOTIFICATION] Failed to refresh access token for user ${userId}:`, error);
      return false;
    }
  }
  
  // Decrypt access token for use
  const decryptedAccessToken = decryptToken(account.accessToken!);

  // Send email via user's connected account
  try {
    if (account.provider === 'gmail') {
      await sendViaGmail(decryptedAccessToken, userEmail, title, content);
    } else {
      await sendViaOutlook(decryptedAccessToken, userEmail, title, content);
    }
    console.log(`[USER_NOTIFICATION] Email sent to ${userEmail} via ${account.provider}`);
    return true;
  } catch (error) {
    console.error(`[USER_NOTIFICATION] Failed to send email:`, error);
    return false;
  }
}

/**
 * Generate HTML email template
 */
function generateEmailHTML(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .alert-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .alert-box.critical {
      background: #fee2e2;
      border-left-color: #dc2626;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚨 LARO Usage Alert</h1>
  </div>
  <div class="content">
    <h2>${title}</h2>
    <div class="alert-box ${content.includes('limit') ? 'critical' : ''}">
      <p>${content}</p>
    </div>
    <p>
      To continue using LARO without interruption, consider upgrading to our Pro plan for unlimited access.
    </p>
    <a href="${ENV.FRONTEND_URL || 'https://laro.app'}/billing" class="button">
      View Billing Dashboard
    </a>
  </div>
  <div class="footer">
    <p>
      You're receiving this email because you're using LARO's free tier.
      <br>
      <a href="${ENV.FRONTEND_URL || 'https://laro.app'}/settings">Manage your notification preferences</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send email via Gmail API
 */
async function sendViaGmail(
  accessToken: string,
  to: string,
  subject: string,
  content: string
): Promise<void> {
  const gmail = google.gmail({ version: 'v1' });
  
  const htmlContent = generateEmailHTML(subject, content);
  
  // Create email in RFC 2822 format
  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlContent,
  ].join('\n');
  
  // Encode email in base64url format
  const encodedEmail = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
    auth: new google.auth.OAuth2() as any,
  });
}

/**
 * Send email via Outlook Graph API
 */
async function sendViaOutlook(
  accessToken: string,
  to: string,
  subject: string,
  content: string
): Promise<void> {
  const client = Client.init({
    authProvider: (done: (error: any, accessToken?: string) => void) => {
      done(null, accessToken);
    },
  });
  
  const htmlContent = generateEmailHTML(subject, content);
  
  await client.api('/me/sendMail').post({
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: htmlContent,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
    },
  });
}

/**
 * Send usage alert email to user
 */
export async function sendUsageAlertEmail(
  userId: string,
  userEmail: string,
  userName: string,
  resourceType: string,
  threshold: number,
  used: number,
  limit: number
): Promise<boolean> {
  const resourceName = resourceType.replace(/_/g, ' ').toUpperCase();
  const percent = Math.round((used / limit) * 100);
  const remaining = Math.max(0, limit - used);

  let title: string;
  let content: string;

  if (threshold === 80) {
    title = `⚠️ You've used ${percent}% of your ${resourceName} quota`;
    content = `Hi ${userName},\n\nYou've used ${used} of ${limit} ${resourceName} operations this month (${percent}%). You have ${remaining} operations remaining.\n\nUpgrade to Pro for unlimited access and never worry about limits again.`;
  } else {
    title = `🚫 ${resourceName} quota reached`;
    content = `Hi ${userName},\n\nYou've reached your ${resourceName} limit (${used}/${limit} operations). Further operations will be blocked until you upgrade to Pro or the next billing period begins on the 1st of next month.\n\nUpgrade now to continue using LARO without interruption.`;
  }

  return await notifyUser({
    userId,
    userEmail,
    userName,
    title,
    content,
  });
}
