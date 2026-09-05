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

const connectRabbitMQ = async () => {
    if (channel) return { connection, channel };

    try {
        const url = `amqp://${rabbitmqUser}:${rabbitmqPassword}@${rabbitmqHost}:${rabbitmqPort}`;
        connection = await amqplib.connect(url);
        channel = await connection.createChannel();

        console.log("RabbitMQ connected and channel created");

        connection.on('error', (err) => {
            console.error("RabbitMQ connection error event triggered:", err.message);
            handleDisconnect();
        });

        connection.on('close', () => {
            console.warn("RabbitMQ connection closed. Attempting reconnect...");
            handleDisconnect();
        });

        return { connection, channel };
    } catch (error) {
        console.error("RabbitMQ initialization failed: ", error.message);
        setTimeout(connectRabbitMQ, 5000);
    }
}

function handleDisconnect() {
    connection = null;
    channel = null;
    setTimeout(connectRabbitMQ, 5000);
}

const getChannel = () => channel;

module.exports = {
    connectRabbitMQ,
    getChannel
}
