import crypto from 'crypto';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;
let tokenRequestInFlight: Promise<string | null> | null = null;

export type FcmDispatchResult = {
  sent: boolean;
  invalidToken: boolean;
};

function invalidTokenResponse(status: number, response: string): boolean {
  return status === 404 || /UNREGISTERED|NotRegistered/i.test(response);
}

function getServiceAccount(): ServiceAccount | null {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', e);
    }
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

async function getGoogleOAuth2Token(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }

  if (!tokenRequestInFlight) {
    tokenRequestInFlight = requestGoogleOAuth2Token(sa, now).finally(() => {
      tokenRequestInFlight = null;
    });
  }

  return tokenRequestInFlight;
}

async function requestGoogleOAuth2Token(
  sa: ServiceAccount,
  now: number,
): Promise<string | null> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Claim = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const signatureInput = `${b64Header}.${b64Claim}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  signer.end();
  const signature = signer.sign(sa.private_key, 'base64url');

  const jwt = `${signatureInput}.${signature}`;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Google OAuth2 token exchange failed:', err);
      return null;
    }

    const data = await res.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in || 3600),
    };
    return cachedToken.token;
  } catch (err) {
    console.error('Error fetching Google OAuth2 token:', err);
    return null;
  }
}

export async function sendFCMMessage(
  deviceToken: string,
  payload: {
    title: string;
    body: string;
    url?: string;
    ticker?: string;
    strategy?: string;
    signal?: string;
    companyName?: string;
    logoUrl?: string;
    alpha?: string;
    adverseExcursion?: string;
    returnToMae?: string;
    color?: string;
  }
): Promise<FcmDispatchResult> {
  const sa = getServiceAccount();

  // 1. Try FCM HTTP v1 (Official Google Firebase Standard)
  if (sa) {
    const accessToken = await getGoogleOAuth2Token(sa);
    if (accessToken) {
      try {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token: deviceToken,
                notification: {
                  title: payload.title,
                  body: payload.body,
                  ...(payload.logoUrl ? { image: payload.logoUrl } : {}),
                },
                data: {
                  url: payload.url || '/charts',
                  ticker: payload.ticker || '',
                  strategy: payload.strategy || '',
                  signal: payload.signal || '',
                  companyName: payload.companyName || '',
                  logoUrl: payload.logoUrl || '',
                  alpha: payload.alpha || '',
                  adverseExcursion: payload.adverseExcursion || '',
                  returnToMae: payload.returnToMae || '',
                },
                android: {
                  priority: 'high',
                  notification: {
                    channel_id: 'trading_signals',
                    icon: 'ic_stat_ticknal',
                    ...(payload.logoUrl ? { image: payload.logoUrl } : {}),
                    sound: 'default',
                    default_vibrate_timings: true,
                    notification_priority: 'PRIORITY_HIGH',
                    color: payload.color || '#2962ff',
                  },
                },
              },
            }),
          }
        );

        if (res.ok) return { sent: true, invalidToken: false };
        const errText = await res.text();
        if (invalidTokenResponse(res.status, errText)) {
          return { sent: false, invalidToken: true };
        }
        console.error('FCM HTTP v1 dispatch error:', errText);
      } catch (err) {
        console.error('FCM HTTP v1 network error:', err);
      }
    }
  }

  // 2. Fallback to Legacy FCM Server Key if configured
  const fcmServerKey = process.env.FCM_SERVER_KEY;
  if (fcmServerKey) {
    try {
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${fcmServerKey}`,
        },
        body: JSON.stringify({
          to: deviceToken,
          priority: 'high',
          notification: {
            title: payload.title,
            body: payload.body,
            sound: 'default',
            android_channel_id: 'trading_signals',
            ...(payload.logoUrl ? { image: payload.logoUrl } : {}),
          },
          data: {
            url: payload.url || '/charts',
            ticker: payload.ticker || '',
            strategy: payload.strategy || '',
            signal: payload.signal || '',
            companyName: payload.companyName || '',
            logoUrl: payload.logoUrl || '',
            alpha: payload.alpha || '',
            adverseExcursion: payload.adverseExcursion || '',
            returnToMae: payload.returnToMae || '',
          },
        }),
      });
      if (res.ok) return { sent: true, invalidToken: false };
      const errText = await res.text();
      if (invalidTokenResponse(res.status, errText)) {
        return { sent: false, invalidToken: true };
      }
      console.error('Legacy FCM dispatch error:', errText);
    } catch (err) {
      console.error('Legacy FCM dispatch error:', err);
    }
  }

  return { sent: false, invalidToken: false };
}
