const { reciverMessageData } = require("./message-broker.pkg");
const { getChannel, onChannelReady } = require("../../config/message-broker.config");
const { TblUsers } = require("../../models");

let consumerRegistered = false;

const consumeUserUpdatedQueue = async () => {
  await reciverMessageData("user_update", async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      console.log(
        "[auth-service] Received 'user_update' payload:",
        payload,
      );
      const { uuid, username, email } = payload;

      if (!uuid) {
        console.warn("[auth-service] Missing uuid in message payload");
        return;
      }

      const user = await TblUsers.findOne({ where: { uuid } });
      if (user) {
        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (Object.keys(updateData).length > 0) {
          await user.update(updateData);
          console.log(
            `[auth-service] Successfully updated TblUsers for uuid: ${uuid}`,
            updateData,
          );
        }
      } else {
        console.warn(
          `[auth-service] TblUsers record for uuid ${uuid} not found.`,
        );
      }
    } catch (err) {
      console.error(
        "[auth-service] Error processing 'user_update' message:",
        err.message,
      );
    }
  });
};

/**
 * Listens to 'user_update' queue from RabbitMQ
 * and updates username/email in TblUsers record in auth database.
 */
const listenUserUpdatedQueue = async () => {
  if (consumerRegistered) return;
  consumerRegistered = true;
  onChannelReady(consumeUserUpdatedQueue);

  try {
    if (getChannel()) await consumeUserUpdatedQueue();
  } catch (error) {
    console.error(
      "[auth-service] Failed to start 'user_update' listener:",
      error.message,
    );
  }
};

module.exports = {
  listenUserUpdatedQueue,
};
