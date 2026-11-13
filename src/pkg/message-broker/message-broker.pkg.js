const crypto = require("crypto");
const { getChannel } = require("../../config/message-broker.config");

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;
const MAX_DLQ_REPLAYS = 2;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
 * Deliver payload data to specified RabbitMQ queue(s)
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
      channel.sendToQueue(targetQueue, messageBuffer, {
        persistent: true,
        contentType: "application/json",
        messageId: crypto.randomUUID(),
        timestamp: Math.floor(Date.now() / 1000),
        headers: {
          "x-retry-count": 0,
          "x-dlq-replay-count": 0,
        },
      });
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

/**
 * Consume messages with Manual ACK, Bounded Auto-Retry, and Dead-Lettering on max retries
 * @param {string|string[]} queueName - Queue Name(s)
 * @param {function} callback - Callback function accepting (msg)
 */
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
            const headers = msg.properties?.headers || {};
            const retryCount = Number(headers["x-retry-count"] || 0);

            if (retryCount < MAX_RETRIES) {
              const nextRetry = retryCount + 1;
              console.warn(
                `[RabbitMQ] Error processing '${targetQueue}' (Retry ${nextRetry}/${MAX_RETRIES}): ${err.message}. Retrying in ${RETRY_DELAY_MS}ms...`,
              );
              await delay(RETRY_DELAY_MS);
              channel.sendToQueue(targetQueue, msg.content, {
                ...msg.properties,
                persistent: true,
                headers: {
                  ...headers,
                  "x-retry-count": nextRetry,
                  "x-last-error": err.message,
                },
              });
              channel.ack(msg);
            } else {
              console.error(
                `[RabbitMQ] Max retries (${MAX_RETRIES}) reached in '${targetQueue}': ${err.message}. Moving to DLQ '${dlqName}'`,
              );
              // Move message to DLQ (requeue: false)
              channel.nack(msg, false, false);
            }
          }
        },
        { noAck: false },
      );
      console.log(
        `[RabbitMQ] Waiting for messages on queue '${targetQueue}' (DLQ: '${dlqName}')`,
      );
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
 * Reprocess / Replay messages from DLQ back to the main queue (with Poison Message guard)
 * @param {string} targetQueue - Main Queue Name
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

      const headers = msg.properties?.headers || {};
      const replayCount = Number(headers["x-dlq-replay-count"] || 0);

      if (replayCount >= MAX_DLQ_REPLAYS) {
        console.warn(
          `[RabbitMQ DLQ Replay] Skipping poison message in '${dlqName}' (exceeded max DLQ replays: ${MAX_DLQ_REPLAYS})`,
        );
        channel.ack(msg);
        continue;
      }

      channel.sendToQueue(targetQueue, msg.content, {
        ...msg.properties,
        persistent: true,
        headers: {
          ...headers,
          "x-retry-count": 0,
          "x-dlq-replay-count": replayCount + 1,
        },
      });
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

