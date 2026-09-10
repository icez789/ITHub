const disabledValues = new Set([
  '0',
  'disabled',
  'false',
  'off',
  'preview-disabled',
]);

export function externalServiceEnabled(...values) {
  return values.length > 0 && values.every((value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized.length > 0 && !disabledValues.has(normalized);
  });
}

export function createPusherServerAdapter(client) {
  return Object.freeze({
    authorizeChannel(...args) {
      if (!client) throw new Error('Pusher is disabled');
      return client.authorizeChannel(...args);
    },
    async trigger(...args) {
      if (!client) return { skipped: true };
      return client.trigger(...args);
    },
  });
}

export function createPusherBrowserAdapter(client) {
  const disabledChannel = Object.freeze({
    bind() {},
    unbind() {},
  });
  return Object.freeze({
    subscribe(channelName) {
      return client ? client.subscribe(channelName) : disabledChannel;
    },
    unsubscribe(channelName) {
      if (client) client.unsubscribe(channelName);
    },
    disconnect() {
      if (client) client.disconnect();
    },
  });
}
