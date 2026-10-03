const { getChannel } = require("../../config/message-broker.config");

/**
 * Helper to ensure DLX and DLQ exist for a target queue
 */
const setupDLQForQueue = async (channel, targetQueue) => {
  const dlqName = `dlq_${targetQueue}`;
  const dlxExchange = `dlx_${targetQueue}`;

  await channel.assertExchange(dlxExchange, "direct", { durable: true });
  await channel.assertQueue(dlqName, { durable: true });
  await channel.bindQueue(dlqName, dlxExchange, dlqName);

  await channel.assertQueue(targetQueue, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": dlxExchange,
      "x-dead-letter-routing-key": dlqName,
    },
  });

  return { dlqName, dlxExchange };
};

/**
 * Deliver payload data to a specified RabbitMQ queue
 * @param {string|string[]} queueName - Target Queue Name(s)
 * @param {object|string} payload - Payload object or string
 */
const deliverMessageData = async (queueName, payload) => {
  try {
    const channel = getChannel();
    if (!channel) {
      throw new Error("RabbitMQ channel is not initialized or connected yet.");
    }

    const messageBuffer = Buffer.from(
      typeof payload === "string" ? payload : JSON.stringify(payload),
    );

    const queueNames = Array.isArray(queueName) ? queueName : [queueName];
    for (const targetQueue of queueNames) {
      await setupDLQForQueue(channel, targetQueue);
      channel.sendToQueue(targetQueue, messageBuffer, { persistent: true });
      console.log(`[RabbitMQ] Message delivered to queue '${targetQueue}'`);
    }
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

    const queueNames = Array.isArray(queueName) ? queueName : [queueName];
    for (const targetQueue of queueNames) {
      const { dlqName } = await setupDLQForQueue(channel, targetQueue);

      await channel.prefetch(10);

      channel.consume(
        targetQueue,
        async (msg) => {
          if (!msg) return;
          try {
            await callback(msg);
            channel.ack(msg);
          } catch (err) {
            console.error(
              `[RabbitMQ] Error processing message in '${targetQueue}': ${err.message}. Moving to DLQ '${dlqName}'`,
            );
            channel.nack(msg, false, false);
          }
        },
        { noAck: false },
      );
      console.log(`[RabbitMQ] Waiting for messages on queue '${targetQueue}' (DLQ: '${dlqName}')`);
    }
    return true;
  } catch (error) {
    console.error(
      `[RabbitMQ] Failed to receive messages from queue '${queueName}':`,
      error.message,
    );
    throw error;
  }
};

/**
 * Reprocess / Replay messages from DLQ back to Main Queue
 */
const reprocessDLQMessages = async (targetQueue) => {
  try {
    const channel = getChannel();
    if (!channel) {
      throw new Error("RabbitMQ channel is not initialized or connected yet.");
    }

    const dlqName = `dlq_${targetQueue}`;
    let count = 0;

    while (true) {
      const msg = await channel.get(dlqName, { noAck: false });
      if (!msg) break;

      channel.sendToQueue(targetQueue, msg.content, { persistent: true });
      channel.ack(msg);
      count++;
    }

    console.log(
      `[RabbitMQ DLQ Replay] Successfully reprocessed ${count} messages from '${dlqName}' to '${targetQueue}'`,
    );
    return count;
  } catch (error) {
    console.error(
      `[RabbitMQ DLQ Replay] Failed to reprocess DLQ for '${targetQueue}':`,
      error.message,
    );
    throw error;
  }
};

module.exports = {
  deliverMessageData,
  reciverMessageData,
  reprocessDLQMessages,
};
