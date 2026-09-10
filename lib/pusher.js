import Pusher from 'pusher';
import { createPusherServerAdapter, externalServiceEnabled } from './externalServicesCore';

const configuration = {
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
};

export const pusherServerEnabled = externalServiceEnabled(
  configuration.appId,
  configuration.key,
  configuration.secret,
  configuration.cluster,
);

const client = pusherServerEnabled
  ? new Pusher({ ...configuration, useTLS: true })
  : null;

export const pusherServer = createPusherServerAdapter(client);
