import { getCurrentUser } from '../../../../lib/auth';
import { notificationChannelName } from '../../../../lib/pusherChannels';
import { pusherServer } from '../../../../lib/pusher';

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const socketId = String(formData.get('socket_id') || '');
  const channelName = String(formData.get('channel_name') || '');

  if (!/^\d+\.\d+$/.test(socketId) || socketId.length > 100) {
    return Response.json({ error: 'Invalid socket id' }, { status: 400 });
  }

  if (channelName !== notificationChannelName(user.id)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  return Response.json(pusherServer.authorizeChannel(socketId, channelName));
}
