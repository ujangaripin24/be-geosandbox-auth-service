const { getChannel } = require("../../config/message-broker.config");

/**
 * Deliver payload data to a specified RabbitMQ queue
 * @param {string} queueName - Target Queue Name
 * @param {object|string} payload - Payload object or string
 */
const deliverMessageData = async (queueName, payload) => {
  try {
    const channel = getChannel();
    if (!channel) {
      throw new Error("RabbitMQ channel is not initialized or connected yet.");
    }

    await channel.assertQueue(queueName, { durable: true });

    const messageBuffer = Buffer.from(
      typeof payload === "string" ? payload : JSON.stringify(payload),
    );

    channel.sendToQueue(queueName, messageBuffer, { persistent: true });
    console.log(`[RabbitMQ] Message delivered to queue '${queueName}'`);
    return true;
  } catch (error) {
    console.error(
      `[RabbitMQ] Failed to deliver message to '${queueName}':`,
      error.message,
    );
    throw error;
  }
};

const reciverMessageData = async (queueName, callback) => {
  try {
    const channel = getChannel();
    if (!channel) {
      throw new Error("RabbitMQ channel is not initialized or connected yet.");
    }

    await channel.assertQueue(queueName, { durable: true });
    channel.consume(queueName, (msg) => {
      if (msg) {
        callback(msg);
      }
    });
    console.log(`[RabbitMQ] Waiting for messages on queue '${queueName}'`);
    return true;
  } catch (error) {
    console.error(
      `[RabbitMQ] Failed to receive messages from queue '${queueName}':`,
      error.message,
    );
    throw error;
  }
};
