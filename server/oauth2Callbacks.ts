/**
 * OAuth2 Callback Routes for Gmail, Outlook, and Trello
 */

import { Router } from "express";
import {
  consumeOAuthState,
  exchangeCodeForTokens,
  getAccountInfo,
  saveEmailAccount,
} from "./oauth2";

const router = Router();

/**
 * Gmail OAuth2 callback
 */
router.get('/api/oauth/gmail/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).send('Missing code or state parameter');
    }
    
    const { userId, codeVerifier } = consumeOAuthState(state as string, "gmail");
    
    console.log(`[OAuth2] Gmail callback for user ${userId}`);
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens('gmail', code as string, codeVerifier);
    
    // Get account info
    const accountInfo = await getAccountInfo('gmail', tokens.accessToken);
    
    // Save to database
    await saveEmailAccount(userId, 'gmail', tokens, accountInfo);
    
    // Redirect to success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gmail Connected</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          .success-icon {
            font-size: 64px;
            color: #4CAF50;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            margin-bottom: 30px;
          }
          button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
          }
          button:hover {
            opacity: 0.9;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>Gmail Connected!</h1>
          <p>Your Gmail account <strong>${accountInfo.email}</strong> has been successfully connected.</p>
          <button onclick="window.close()">Close Window</button>
        </div>
        <script>
          // Auto-close after 3 seconds
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('[OAuth2] Gmail callback error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Failed</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          .error-icon {
            font-size: 64px;
            color: #f44336;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            margin-bottom: 30px;
          }
          button {
            background: #f44336;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">✗</div>
          <h1>Connection Failed</h1>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onclick="window.close()">Close Window</button>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * Trello OAuth callback
 * Trello uses token-based OAuth, not code-based
 */
router.get('/api/oauth/trello/callback', async (req, res) => {
  try {
    const { token, state } = req.query;
    
    if (!token || !state) {
      return res.status(400).send('Missing token or state parameter');
    }
    
    // Decode state to get userId and caseId
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const { userId, caseId } = stateData;
    
    if (!userId || !caseId) {
      return res.status(400).send('Invalid state parameter');
    }
    
    console.log(`[OAuth] Trello callback for user ${userId}, case ${caseId}`);
    
    // Store token in session or pass to frontend
    // The token will be used by the frontend to complete the sync
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Trello Connected</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          .success-icon {
            font-size: 64px;
            color: #4CAF50;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            margin-bottom: 30px;
          }
          button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
          }
          button:hover {
            opacity: 0.9;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>Trello Connected!</h1>
          <p>Your Trello account has been successfully authorized.</p>
          <button onclick="window.close()">Close Window</button>
        </div>
        <script>
          // Pass token back to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'trello-token',
              token: '${token}',
              caseId: '${caseId}'
            }, '*');
          }
          // Auto-close after 3 seconds
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('[OAuth] Trello callback error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Failed</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          .error-icon {
            font-size: 64px;
            color: #f44336;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            margin-bottom: 30px;
          }
          button {
            background: #f44336;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">✗</div>
          <h1>Connection Failed</h1>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onclick="window.close()">Close Window</button>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * Outlook OAuth2 callback
 */
router.get('/api/oauth/outlook/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).send('Missing code or state parameter');
    }
    
    const { userId, codeVerifier } = consumeOAuthState(state as string, "outlook");
    
    console.log(`[OAuth2] Outlook callback for user ${userId}`);
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens('outlook', code as string, codeVerifier);
    
    // Get account info
    const accountInfo = await getAccountInfo('outlook', tokens.accessToken);
    
    // Save to database
    await saveEmailAccount(userId, 'outlook', tokens, accountInfo);
    
    // Redirect to success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Outlook Connected</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          .success-icon {
            font-size: 64px;
            color: #4CAF50;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            margin-bottom: 30px;
          }
          button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
          }
          button:hover {
            opacity: 0.9;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>Outlook Connected!</h1>
          <p>Your Outlook account <strong>${accountInfo.email}</strong> has been successfully connected.</p>
          <button onclick="window.close()">Close Window</button>
        </div>
        <script>
          // Auto-close after 3 seconds
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('[OAuth2] Outlook callback error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Failed</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          .error-icon {
            font-size: 64px;
            color: #f44336;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            margin-bottom: 30px;
          }
          button {
            background: #f44336;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">✗</div>
          <h1>Connection Failed</h1>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onclick="window.close()">Close Window</button>
        </div>
      </body>
      </html>
    `);
  }
});

export default router;
