// import { Express } from 'express';

// export const setupAuthRoutes = (app: Express) => {
//   app.get('/api/oauth/authorize', (req, res) => {
//     res.send('Authorization Endpoint');
//   });

//   app.post('/api/oauth/token', (req, res) => {
//     res.send('Token Endpoint');
//   });
// };
import { Router } from 'express';
import { authorize, issueToken } from '../services/token.service';

const router = Router();

router.get('/authorize', authorize);
router.post('/token', issueToken);

export default router;

