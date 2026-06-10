import { Client, type Channel, type ApplicationInfo, type ReceiverStatusMessage, type ReceiverMessage } from 'castv2';
import { env } from '../config/env';
import { recordCastEvent } from '../stats/recorder';

const CHROMECAST_IP = env.cast.ip;
const APP_ID = env.cast.appId;
const CAST_URL = env.cast.url;
const START_HOUR = env.cast.startHour;
const END_HOUR = env.cast.endHour;

const IDLE_CONFIRMATION_ATTEMPTS = 2;

let isLaunching = false;
let currentTransportId: ApplicationInfo['transportId'] | null = null;

let isIdleCount = 0;
let requestCounter = 1;
let launchStuckTimer: ReturnType<typeof setTimeout> | null = null;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const connectClient = (ip: string) =>
  new Promise<Client>((resolve, reject) => {
    const c = new Client();
    c.connect(ip, () => resolve(c));
    c.on('error', reject);
    c.on('close', () => reject(new Error('Connection closed')));
  });

const launchApp = (receiver: Channel, volume: number | undefined) =>
  new Promise<void>((resolve) => {
    isLaunching = true;
    console.log('[cast] 🚀 Launching app...');
    receiver.send({ type: 'SET_VOLUME', volume: { muted: true }, requestId: 1 });
    receiver.send({ type: 'LAUNCH', appId: APP_ID, requestId: 1 });
    receiver.send({ type: 'SET_VOLUME', volume: { level: volume || 0.25 }, requestId: 1 });

    // If the launch fails the app never reaches 'URL Cast ready...', so
    // isLaunching would stay true forever and block idle-relaunch. Reset it
    // after a grace period if no transport appeared.
    if (launchStuckTimer) clearTimeout(launchStuckTimer);
    launchStuckTimer = setTimeout(() => {
      if (isLaunching) {
        console.warn('[cast] ⚠️ Launch did not complete in time, resetting isLaunching');
        isLaunching = false;
      }
    }, 15_000);

    setTimeout(() => resolve(), 3000);
  });

const sendUrlToApp = (client: Client, transportId: ApplicationInfo['transportId']) => {
  if (!client) return;

  const castConnection = client.createChannel(
    'sender-0',
    transportId,
    'urn:x-cast:com.google.cast.tp.connection',
    'JSON',
  );
  const appChannel = client.createChannel('sender-0', transportId, 'urn:x-cast:com.url.cast', '');

  castConnection.send({ type: 'CONNECT' });

  appChannel.on('message', (msg) => {
    console.log('[cast] 📩 App response:', msg);
  });

  appChannel.send(JSON.stringify({ type: 'loc', url: CAST_URL }));
  console.log('[cast] 🌐 Sent URL to Chromecast');
};

const isWithinTimeRange = () => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= START_HOUR && hour < END_HOUR;
};

const isReceiverStatusMessage = (msg: ReceiverMessage): msg is ReceiverStatusMessage => msg.type === 'RECEIVER_STATUS';

export const startMonitoring = async () => {
  let client: Client | null = null;

  while (true) {
    try {
      client = await connectClient(CHROMECAST_IP);
      console.log('[cast] ✅ Connected to Chromecast');
      recordCastEvent('connected');

      const connection = client.createChannel(
        'sender-0',
        'receiver-0',
        'urn:x-cast:com.google.cast.tp.connection',
        'JSON',
      );
      const receiver = client.createChannel('sender-0', 'receiver-0', 'urn:x-cast:com.google.cast.receiver', 'JSON');

      connection.send({ type: 'CONNECT' });

      receiver.on('message', async (data) => {
        if (!isReceiverStatusMessage(data)) return;

        const app = data.status?.applications?.[0];
        const isIdle = app?.isIdleScreen;

        if (!isWithinTimeRange()) {
          if (app?.appId === APP_ID) {
            console.log('[cast] 🛑 Outside allowed hours, stopping app');
            recordCastEvent('outside_hours_stop');
            receiver.send({ type: 'STOP', sessionId: app.sessionId, requestId: ++requestCounter });
          }
          return;
        }

        if (isIdle && !isLaunching) {
          isIdleCount++;
          if (isIdleCount === IDLE_CONFIRMATION_ATTEMPTS) {
            isIdleCount = 0;
            console.log('[cast] 🔄 Idle confirmed, relaunching...');
            recordCastEvent('idle_relaunch');
            const currentVolume = data.status?.volume?.level;
            await launchApp(receiver, currentVolume);
          }
        } else {
          isIdleCount = 0;
        }

        if (
          app?.appId === APP_ID &&
          app?.statusText === 'URL Cast ready...' &&
          app?.transportId &&
          !app?.isIdleScreen
        ) {
          if (currentTransportId !== app.transportId && client) {
            currentTransportId = app.transportId;
            isLaunching = false;
            if (launchStuckTimer) {
              clearTimeout(launchStuckTimer);
              launchStuckTimer = null;
            }
            sendUrlToApp(client, currentTransportId);
          }
        }
      });

      receiver.send({ type: 'GET_STATUS', requestId: 1 });

      // Once connectClient resolves, its error/close handlers become no-ops, so
      // a dropped connection would leave the poll loop writing GET_STATUS into a
      // dead socket forever and the reconnect logic below would never run. Race
      // the poll loop against a fresh "connection lost" promise so a close/error
      // throws into the catch and triggers a reconnect.
      const closed = new Promise<never>((_, reject) => {
        client!.on('error', reject);
        client!.on('close', () => reject(new Error('Connection closed')));
      });

      const pollLoop = (async () => {
        while (true) {
          await delay(isWithinTimeRange() ? 5000 : 60_000);
          receiver.send({ type: 'GET_STATUS', requestId: ++requestCounter });
        }
      })();

      await Promise.race([pollLoop, closed]);
    } catch (err) {
      if (err instanceof Error) {
        console.error('[cast] ❌ Error:', err.message);
      }
      if (client) {
        try {
          client.close();
        } catch {}
      }
      client = null;
      await delay(2000);
      console.log('[cast] 🔁 Reconnecting...');
      recordCastEvent('reconnect');
    }
  }
};
