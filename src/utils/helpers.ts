import crypto from 'crypto';
import { SignJWT } from 'jose';

export const generateToken = () => {    
    const token = crypto.randomBytes(32).toString('hex');
    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // adds 1hr to current time(converted from milliseconds to seconds)
    return { token, expirationTime };
};

export const generateJWT = async (payload: any) => {
    // need to convert base64 version to normal string(.pem) before passin it as key
    const privateKeyPem = Buffer.from(process.env.JWT_PRIVATE_KEY!, 'base64').toString('utf8') || 'private_key';
    const privateKey = crypto.createPrivateKey({
        key: privateKeyPem,
        format: 'pem',
    });
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'ES256' })
        .setExpirationTime('5m') // sets Auth token expiration to 5mins
        .sign(privateKey);
};
