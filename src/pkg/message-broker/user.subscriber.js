const { reciverMessageData } = require("./message-broker.pkg");
const { TblUsers } = require("../../models");

/**
 * Listens to 'user_update' queue from RabbitMQ
 * and creates a new TblUsers record in database.
 */
const listenUserActivatedQueue = async () => {
  try {
    await reciverMessageData("user_update", async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        console.log(
          "[user-service] Received 'user_update' payload:",
          payload,
        );

        const { uuid, username, email } = payload;
        if (!uuid) {
          console.warn("[user-service] Missing uuid in message payload");
          return;
        }

        const existingDetail = await TblUsers.findOne({
          where: { uuid },
        });
        if (!existingDetail) {
          await TblUsers.create({
            uuid: uuid,
            username: username,
            email: email
          });
          console.log(
            `[user-service] Successfully created TblUsers record for uuid: ${uuid}`,
          );
        } else {
          console.log(
            `[user-service] TblUsers record for uuid ${uuid} already exists.`,
          );
        }
      } catch (err) {
        console.error(
          "[user-service] Error processing 'user_update' message:",
          err.message,
        );
      }
    });
  } catch (error) {
    console.error(
      "[user-service] Failed to start 'user_update' listener:",
      error.message,
    );
  }
};

module.exports = {
  listenUserActivatedQueue,
};
