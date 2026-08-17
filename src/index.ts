import { serve } from '@hono/node-server';
import { app } from './app';

const port = Number(process.env.PORT ?? 8787);

console.log(`Material Shield → http://localhost:${port}`);
console.log('  badge:    /badge?label=build&message=passing&color=%236750A4');
console.log('  dynamic:  /github/stars/Kibidango086/material-shield');
console.log('  metrics:  /metrics?user=Kibidango086');
console.log('  landing:  /');

serve({ fetch: app.fetch, port });
