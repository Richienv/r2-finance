import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  crons: [
    { path: '/api/cron/auto-log-fixed', schedule: '0 1 1 * *' },
  ],
};
