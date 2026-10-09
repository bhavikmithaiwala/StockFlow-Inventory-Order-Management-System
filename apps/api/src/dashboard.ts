import { Router } from 'express';
import { requireAuth } from './auth.js';
import { dashboardStats } from './services/dashboard.js';
export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);
dashboardRouter.get('/stats', async (_req, res) => res.json({ data: await dashboardStats() }));
