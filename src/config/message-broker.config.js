const amqplib = require('amqplib');
const dotenv = require('dotenv');

dotenv.config();

const rawHost = process.env.RABBITMQ_HOST || 'localhost';
const rabbitmqHost = rawHost.replace(/^https?:\/\//, '').replace(/^amqp:\/\//, '');
const rabbitmqPort = process.env.RABBITMQ_PORT || 5672;
const rabbitmqUser = process.env.RABBITMQ_USER || 'guest';
const rabbitmqPassword = process.env.RABBITMQ_PASSWORD || 'guest';

let connection = null;
let channel = null;
let connecting = null;
let reconnectTimer = null;
const channelReadyListeners = new Set();

const connectRabbitMQ = async () => {
    if (channel) return { connection, channel };
    if (connecting) return connecting;

    connecting = (async () => {
      try {
        const url = `amqp://${rabbitmqUser}:${rabbitmqPassword}@${rabbitmqHost}:${rabbitmqPort}`;
        const nextConnection = await amqplib.connect(url);
        const nextChannel = await nextConnection.createChannel();
        connection = nextConnection;
        channel = nextChannel;

        console.log("RabbitMQ connected and channel created");

        nextConnection.on('error', (err) => {
            console.error("RabbitMQ connection error event triggered:", err.message);
            handleDisconnect(nextConnection, nextChannel);
        });

        nextConnection.on('close', () => {
            console.warn("RabbitMQ connection closed. Attempting reconnect...");
            handleDisconnect(nextConnection, nextChannel);
        });

        for (const listener of channelReadyListeners) {
          await listener(nextChannel);
        }

        return { connection: nextConnection, channel: nextChannel };
      } catch (error) {
        console.error("RabbitMQ initialization failed: ", error.message);
        scheduleReconnect();
        return null;
      } finally {
        connecting = null;
      }
    })();

    return connecting;
}

function handleDisconnect(disconnectedConnection, disconnectedChannel) {
    if (connection !== disconnectedConnection || channel !== disconnectedChannel) return;
    connection = null;
    channel = null;
    scheduleReconnect();
}

function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectRabbitMQ();
    }, 5000);
}

const getChannel = () => channel;

const onChannelReady = (listener) => {
    channelReadyListeners.add(listener);
    return () => channelReadyListeners.delete(listener);
};

module.exports = {
    connectRabbitMQ,
    getChannel,
    onChannelReady,
}
