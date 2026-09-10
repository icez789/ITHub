// lib/pusherClient.js
import Pusher from 'pusher-js';
import { createPusherBrowserAdapter, externalServiceEnabled } from './externalServicesCore';

const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
const client = externalServiceEnabled(key, cluster)
  ? new Pusher(key, { cluster })
  : null;

export const pusherClient = createPusherBrowserAdapter(client);
