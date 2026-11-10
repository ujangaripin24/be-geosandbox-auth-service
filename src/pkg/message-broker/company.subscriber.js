const {
  onChannelReady,
  getChannel,
} = require("../../config/message-broker.config");
const { reciverMessageData } = require("./message-broker.pkg");

let consumerRegistered = false;

const consumeCompanyUpdatedQueue = async () => {
  await reciverMessageData(["gis_company_updated_queue"], async (msg) => {
    if (!msg) return;

    const payload = JSON.parse(msg.content.toString());
    console.log("[auth-service] Recevied 'company_update' paylaod: ", payload);
  });
};

const listenCompanyUpdateQueue = async () => {
  if (consumerRegistered) return;
  consumerRegistered = true;

  const startListener = async () => {
    await consumeCompanyUpdatedQueue();
    setTimeout(async () => {
      try {
        await consumeCompanyUpdatedQueue();
      } catch (dlqErr) {
        console.error("[auth-service] Auto DLQ replay error:", dlqErr.message);
      }
    }, 3000);
  };

  onChannelReady(startListener);

  try {
    if (getChannel()) await startListener();
  } catch (error) {
    console.error(
      "[auth-service] Failed to start 'company_update' listener:",
      error.message,
    );
  }
};

module.exports = {
  listenCompanyUpdateQueue,
};
