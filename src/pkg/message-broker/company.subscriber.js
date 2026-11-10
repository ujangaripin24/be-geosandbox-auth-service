const {
  onChannelReady,
  getChannel,
} = require("../../config/message-broker.config");
const { TblCompany } = require("../../models");
const { reciverMessageData } = require("./message-broker.pkg");

let consumerRegistered = false;

const consumeCompanyRecivedQueue = async () => {
  await reciverMessageData(["gis_company_updated_queue"], async (msg) => {
    if (!msg) return;

    const payload = JSON.parse(msg.content.toString());
    console.log("[auth-service] Recevied 'company_update' paylaod: ", payload);

    const { uuid, event_type, name } = payload;

    if (!uuid) {
      console.warn(
        "[auth-service] Missing uuid in message payload, skipping message",
      );
      return;
    }

    const company = await TblCompany.findOne({ where: { uuid } });
    if (!company) {
      await TblCompany.create({
        uuid,
        event_type,
        name,
      });
      console.log("[auth-service] Created company:", {
        uuid,
        event_type,
        name,
      });
    } else {
      console.warn(
        `[auth-service] TblCompany record for uuid ${uuid} not found.`,
      );
    }
  });
};

const consumeCompanyDeletedQueue = async () => {
  await reciverMessageData(["gis_company_deleted_queue"], async (msg) => {
    if (!msg) return;

    const payload = JSON.parse(msg.content.toString());
    console.log("[auth-service] Recevied 'company_deleted' paylaod: ", payload);

    const { uuid } = payload;

    if (!uuid) {
      console.warn(
        "[auth-service] Missing uuid in message payload, skipping message",
      );
      return;
    }

    const company = await TblCompany.findOne({ where: { uuid } });
    console.log("[auth-service] Deleted company:", { uuid });
    // if (company) {
    //   await company.destroy();
    //   console.log("[auth-service] Deleted company:", { uuid });
    // } else {
    //   console.warn(
    //     `[auth-service] TblCompany record for uuid ${uuid} not found.`,
    //   );
    // }
  });
};

const consumeCompanyUpdatedQueue = async () => {
  await reciverMessageData(["gis_company_updated_queue"], async (msg) => {
    if (!msg) return;

    const payload = JSON.parse(msg.content.toString());
    console.log("[auth-service] Recevied 'company_update' paylaod: ", payload);

    const { uuid, event_type, name } = payload;

    if (!uuid) {
      console.warn(
        "[auth-service] Missing uuid in message payload, skipping message",
      );
      return;
    }

    const company = await TblCompany.findOne({ where: { uuid } });
    if (company) {
      const updateData = {};
      if (name) updateData.name = name;
      if (event_type) updateData.event_type = event_type;
      if (Object.keys(updateData).length > 0) {
        await company.update(updateData);
        console.log("[auth-service] Updated company:", updateData);
      }
    } else {
      console.warn(
        `[auth-service] TblCompany record for uuid ${uuid} not found.`,
      );
    }
  });
};

/**
 * Listens to 'user_update' queue from RabbitMQ
 * and updates username/email in TblCompany record in auth database.
 * Also attempts to reprocess any DLQ messages when listener starts.
 */
const listenCompanyUpdateQueue = async () => {
  if (consumerRegistered) return;
  consumerRegistered = true;

  const startListener = async () => {
    await consumeCompanyRecivedQueue();
    await consumeCompanyDeletedQueue();
    await consumeCompanyUpdatedQueue();
    setTimeout(async () => {
      try {
        await consumeCompanyRecivedQueue();
        await consumeCompanyDeletedQueue();
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
