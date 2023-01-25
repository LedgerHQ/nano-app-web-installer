import { createSocket } from "./socket";

export const getAppsList = () => {};

export const getTargetId = async (transport) => {
  const res = await transport.send(0xe0, 0x01, 0x00, 0x00);
  const data = res.slice(0, res.length - 2);

  // parse the target id of either BL or SE
  const targetId = data.readUIntBE(0, 4);
  return targetId;
};

export const installApp = async (targetId, app, transport, isDelete) => {
  const url = new URL(`wss://scriptrunner.api.live.ledger.com/update/install`);

  url.searchParams.append("targetId", targetId);
  url.searchParams.append("perso", app.perso);
  url.searchParams.append("deleteKey", app.delete_key);
  url.searchParams.append("firmware", isDelete ? app.delete : app.firmware);
  url.searchParams.append(
    "firmwareKey",
    isDelete ? app.delete_key : app.firmware_key
  );
  url.searchParams.append("hash", app.hash);

  try {
    await createSocket({
      transport,
      url,
    });
  } catch (e) {
    throw new Error(e);
  }
};
