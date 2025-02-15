import crypto from 'crypto';
import { SignJWT } from 'jose';
import { oauthClients } from '../config/clients.config';

const accessTokens = new Map<string, { client_id: string; expirationTime: number }>();
const refreshTokens = new Map<string, { client_id: string; expirationTime: number }>();

const clients = oauthClients;
export const generateToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const expirationTime = Math.floor(Date.now() / 1000) + 3600;
  return { token, expirationTime };
};

export const generateJWT = async (payload: any) => {
  const privateKeyPem = Buffer.from(process.env.JWT_PRIVATE_KEY!, 'base64').toString('utf8') || 'private_key';
  const privateKey = crypto.createPrivateKey({
    key: privateKeyPem,
    format: 'pem',
  });
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256' })
    .setExpirationTime('5m')
    .sign(privateKey);
};

export const authorize = async (req:any, res:any) => {
  let { client_id, redirect_uri, response_type, state } = req.query;
  
  // Validate client
  const client = clients.find((c) => c.clientId === client_id && c.redirectUri === redirect_uri);

  if (!client) {
    return res.status(400).json({ error: 'Invalid client or redirect URI' });
  }

  if (response_type !== 'code') {
    return res.status(400).json({ error: 'Invalid response type' });
  }

  // Generate authorization code
  const { token: authCode, expirationTime } = generateToken();
  accessTokens.set(authCode, { client_id, expirationTime })

  // Redirect with code and optional state
  const redirectParams: Record<string, string> = { code: authCode };
  if (state) redirectParams.state = state as string;
  const redirectUrl = `${redirect_uri}?${new URLSearchParams(redirectParams).toString()}`;
  res.status(302).redirect(redirectUrl);
};

export const issueToken = async (req:any, res:any) => {
  const { grant_type, code, client_id, redirect_uri,refresh_token } = req.body;
  // Validate client
  const client = clients.find((c) => c.clientId === client_id && c.redirectUri === redirect_uri);
  if (!client) {
    return res.status(401).json({ error: 'Invalid client credentials' });
  }

  if (grant_type !== 'authorization_code' && grant_type !== 'refresh_token') {
    return res.status(401).json({ error: 'Invalid grant_type' });
  }

  if(refresh_token && grant_type == 'refresh_token'){
    const refreshTokenData = refreshTokens.get(refresh_token);
    if(!refreshTokenData){
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    const { client_id:clientId, expirationTime } = refreshTokenData;
    const presentTime = Math.floor(Date.now()/1000);
    if (presentTime> expirationTime|| clientId !== client_id) {
      return res.status(400).json({ error: 'Invalid or expired refresh token' });
    }
  }
  else{
    // Validate authorization code
    const codeData = accessTokens.get(code);
    if(!codeData){
      return res.status(401).json({ error: 'Invalid code' });
    }
    const { client_id:clientId, expirationTime } = codeData;
    const presentTime = Math.floor(Date.now()/1000);
    if (presentTime> expirationTime || clientId !== client_id) {
      return res.status(400).json({ error: 'Invalid or expired authorization code' });
    }
  }
    // Generate JWT access token and refresh token
    let accessToken;
    try{
      accessToken = await generateJWT({ clientId: client_id });
    }
    catch(error){
      console.error('Error signing JWT:', error);
      return res.status(400).json({ error: 'JWT signing failed' });
    }
    const { token: refreshToken, expirationTime: refreshTokenExpiration } = generateToken();
    const expiresIn = 3600;

    // Save tokens securely in Redis
    refreshTokens.set(refreshToken, { client_id, expirationTime: refreshTokenExpiration });

    // Invalidate the auth code
    if(refresh_token){
      refreshTokens.delete(refresh_token);
    }
    if(code){
      accessTokens.delete(code);
    }
    res.setHeader('Content-Type', 'application/json;charset=UTF-8');
    return res.status(200).json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
  });
};
