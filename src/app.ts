import express from 'express';
import bodyParser from 'body-parser';
import oauthRouter from './controllers/oauth.controller';
import dotenv from 'dotenv';
dotenv.config();

console.log('JWT_PRIVATE_KEY:', process.env.JWT_PRIVATE_KEY);
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// OAuth Routes
app.use('/api/oauth', oauthRouter);

export default app;
