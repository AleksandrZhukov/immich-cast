import { Client } from 'castv2';

if (!process.env.CHROMECAST_IP || !process.env.CAST_URL || !process.env.START_HOUR || !process.env.END_HOUR) {
  throw new Error('Missing CHROMECAST_IP, CAST_URL, START_HOUR or END_HOUR environment variable');
}

const CHROMECAST_IP = process.env.CHROMECAST_IP;
const APP_ID = '5CB45E5A';
const CAST_URL = process.env.CAST_URL;
const START_HOUR = +process.env.START_HOUR;
const END_HOUR = +process.env.END_HOUR;

if (START_HOUR < 0 || END_HOUR > 23 || END_HOUR < START_HOUR) {
  throw new Error('Invalid START_HOUR or END_HOUR environment variable');
}

const IDLE_CONFIRMATION_ATTEMPTS = 2;

let client;
let receiver;
let isLaunching = false;
let currentTransportId = null;

let isIdleCount = 0;
let requestCounter = 1;

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const connectClient = (ip) =>
  new Promise((resolve, reject) => {
    const c = new Client();
    c.connect(ip, () => resolve(c));
    c.on('error', reject);
    c.on('close', () => reject(new Error('Connection closed')));
  });

const createChannels = (client) => {
  const connection = client.createChannel('sender-0', 'receiver-0', 'urn:x-cast:com.google.cast.tp.connection', 'JSON');
  receiver = client.createChannel('sender-0', 'receiver-0', 'urn:x-cast:com.google.cast.receiver', 'JSON');

  connection.send({ type: 'CONNECT' });

  return { connection, receiver };
};

const launchApp = () =>
  new Promise((resolve) => {
    isLaunching = true;
    console.log('🚀 Launching Cast App...');
    receiver.send({ type: 'LAUNCH', appId: APP_ID, requestId: 1 });
    setTimeout(() => resolve(), 3000);
  });

const sendUrlToApp = (transportId) => {
  const castConnection = client.createChannel(
    'sender-0',
    transportId,
    'urn:x-cast:com.google.cast.tp.connection',
    'JSON',
  );
  const appChannel = client.createChannel('sender-0', transportId, 'urn:x-cast:com.url.cast');

  castConnection.send({ type: 'CONNECT' });

  appChannel.on('message', (msg) => {
    console.log('📩 App Response:', msg);
  });

  appChannel.send(JSON.stringify({ type: 'loc', url: CAST_URL }));
  console.log('🌐 Sent URL to Chromecast');
};

const isWithinTimeRange = () => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= START_HOUR && hour < END_HOUR;
};

export const startMonitoring = async () => {
  while (true) {
    try {
      client = await connectClient(CHROMECAST_IP);
      console.log('✅ Connected to Chromecast');

      createChannels(client);

      receiver.on('message', async (data) => {
        if (data.type !== 'RECEIVER_STATUS') return;

        const app = data?.status?.applications?.[0];
        const isIdle = data?.status?.isIdleScreen || app?.isIdleScreen;

        // ⛔ Stop app if outside allowed hours
        if (!isWithinTimeRange()) {
          console.log('🛑 Outside allowed hours. Stopping the app...');
          if (app?.appId === APP_ID) {
            receiver.send({ type: 'STOP', sessionId: app.sessionId, requestId: ++requestCounter });
          }
          return;
        }

        if (isIdle && !isLaunching) {
          console.log('⛔ Detected idle screen. Validating...');
          isIdleCount++;
          const reallyIdle = isIdleCount === IDLE_CONFIRMATION_ATTEMPTS;
          if (reallyIdle) {
            isIdleCount = 0;
            console.log('✅ Idle confirmed. Relaunching...');
            await launchApp();
          } else {
            console.log('❌ False idle, skipping.');
          }
        } else {
          if (app) {
            console.log(app ? `🚀 ${app?.displayName} is running.` : '🚀 No app running.');
          }
        }

        if (
          app?.appId === APP_ID &&
          app?.statusText === 'URL Cast ready...' &&
          app?.transportId &&
          !app?.isIdleScreen
        ) {
          if (currentTransportId !== app.transportId) {
            currentTransportId = app.transportId;
            isLaunching = false;
            sendUrlToApp(currentTransportId);
          }
        }
      });

      receiver.send({ type: 'GET_STATUS', requestId: 1 });

      while (true) {
        if (!isLaunching) {
          await delay(isWithinTimeRange() ? 5000 : 60_000);
          receiver.send({ type: 'GET_STATUS', requestId: ++requestCounter });
        }
      }
    } catch (err) {
      console.error('❌ Chromecast Error:', err.message);
      if (client) {
        try {
          client.close();
        } catch {}
      }
      client = null;
      await delay(2000);
      console.log('🔁 Reconnecting...');
    }
  }
};
