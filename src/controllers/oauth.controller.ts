import { Router } from 'express';
import { authorize, issueToken } from '../services/token.service';

const router = Router();

router.get('/authorize', authorize);
router.post('/token', issueToken);

export default router;

