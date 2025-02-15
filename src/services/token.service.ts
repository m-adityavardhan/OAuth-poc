import { oauthClients } from '../config/clients.config';
import { generateJWT, generateToken } from '../utils/helpers';

// Stores Client Codes and refresh tokens
// TODO: move to secure storage
const accessTokens = new Map<string, { client_id: string; expirationTime: number }>();
const refreshTokens = new Map<string, { client_id: string; expirationTime: number }>();

const clients = oauthClients;


export const authorize = async (req:any, res:any) => {
  let { client_id, redirect_uri, response_type, state } = req.query;
  
  const client = clients.find((c) => c.clientId === client_id && c.redirectUri === redirect_uri);
  
  // Validate client
  if (!client) {
    return res.status(400).json({ error: 'Invalid client or redirect URI' });
  }

  if (response_type !== 'code') {
    return res.status(400).json({ error: 'Invalid response type' });
  }

  // Generate authorization code
  const { token: authCode, expirationTime } = generateToken();
  // Store authorization code to be authenticated while generating token
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
  let tokenOrCode, errorMessage;
  // when asked for new token i.e, grant_type = refresh_token
  if(refresh_token && grant_type == 'refresh_token'){
    // Get already stored refresh tokens
    const refreshTokenData = refreshTokens.get(refresh_token);
    if(!refreshTokenData){
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    tokenOrCode = refreshTokenData;
    errorMessage = 'Invalid or expired refresh token';
  }
  else{
    // Validate authorization code by getting it from storage
    const codeData = accessTokens.get(code);
    if(!codeData){
      return res.status(401).json({ error: 'Invalid code' });
    }
    tokenOrCode = codeData;
    errorMessage = 'Invalid or expired authorization code';
  }

    const { client_id:clientId, expirationTime } = tokenOrCode;
    const presentTime = Math.floor(Date.now()/1000);

    if (presentTime> expirationTime || clientId !== client_id) {
      return res.status(400).json({ error: errorMessage});
    }
  
    // Generate JWT access token and refresh token
    let accessToken;
    try{
      // generate AccessToken
      accessToken = await generateJWT({ clientId: client_id });
    }
    catch(error){
      console.error('Error signing JWT:', error);
      return res.status(400).json({ error: 'JWT signing failed' });
    }
    // Generate Refresh token which follows same code as generating code.
    const { token: refreshToken, expirationTime: refreshTokenExpiration } = generateToken();
    const expiresIn = 3600;

    // Save refresh tokens securely
    refreshTokens.set(refreshToken, { client_id, expirationTime: refreshTokenExpiration });

    // Invalidate refresh tokens
    if(refresh_token){
      refreshTokens.delete(refresh_token);
    }
    // Invalidate the auth code
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
