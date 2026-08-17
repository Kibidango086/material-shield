import { handle } from '@hono/node-server/vercel';
import { app } from '../src/app';

// Vercel 函数入口（api/index.ts）。
export default handle(app);
