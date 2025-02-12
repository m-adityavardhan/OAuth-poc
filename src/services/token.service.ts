import crypto from 'crypto';
import { SignJWT } from 'jose';
import redisClient from '../config/redis.config';
import { oauthClients } from '../config/clients.config';


const clients = oauthClients;
export const generateToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const expirationTime = Math.floor(Date.now() / 1000) + 3600;
  return { token, expirationTime };
};

export const generateJWT = async (payload: any) => {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .setExpirationTime('1h')
    .sign(Buffer.from(process.env.JWT_PRIVATE_KEY || 'private-key', 'base64'));
};

export const authorize = async (req:any, res:any) => {
  const { client_id, redirect_uri, response_type, state } = req.query;
  // Validate client
  const client = clients.find((c) => c.clientId === client_id && c.redirectUri === redirect_uri);
  if (!client) {
    return res.status(400).json({ error: 'Invalid client or redirect URI' });
  }

  if (response_type !== 'code') {
    return res.status(400).json({ error: 'Unsupported response type' });
  }

  // Generate authorization code
  const { token: authCode, expirationTime } = generateToken();
  await redisClient.set(authCode, JSON.stringify({ clientId: client_id, expirationTime }), { EX: 300 }); // Store with expiration of 5 minutes

  // Redirect with code and optional state
  const redirectParams: Record<string, string> = { code: authCode };
  if (state) redirectParams.state = state as string;
  res.status(302).redirect(`${redirect_uri}?${new URLSearchParams(redirectParams).toString()}`);
};

export const issueToken = async (req:any, res:any) => {
  const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;
  // Validate client
  const client = clients.find((c) => c.clientId === client_id && c.clientSecret === client_secret && c.redirectUri === redirect_uri);
  if (!client) {
    return res.status(401).json({ error: 'Invalid client credentials' });
  }

  if (grant_type === 'authorization_code') {
    // Validate authorization code
    const codeData = await redisClient.get(code);
    if (!codeData) {
      return res.status(400).json({ error: 'Invalid or expired authorization code' });
    }

    const { clientId, expirationTime } = JSON.parse(codeData);
    if (clientId !== client_id || expirationTime < Math.floor(Date.now() / 1000)) {
      return res.status(400).json({ error: 'Invalid or expired authorization code' });
    }

    // Generate JWT access token and refresh token
    const accessToken = await generateJWT({ clientId: client_id });
    const { token: refreshToken, expirationTime: refreshTokenExpiration } = generateToken();
    const expiresIn = 3600;

    // Save tokens securely in Redis
    await redisClient.set(accessToken, JSON.stringify({ refreshToken, expiresIn }), { EX: expiresIn });

    // Invalidate the auth code
    await redisClient.del(code);

    res.setHeader('Content-Type', 'application/json;charset=UTF-8');
    return res.status(200).json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
    });
  }

  return res.status(400).json({ error: 'Unsupported grant type' });
};
