import WS from "isomorphic-ws";

export const StatusCodes = {
  ACCESS_CONDITION_NOT_FULFILLED: 0x9804,
  ALGORITHM_NOT_SUPPORTED: 0x9484,
  CLA_NOT_SUPPORTED: 0x6e00,
  CODE_BLOCKED: 0x9840,
  CODE_NOT_INITIALIZED: 0x9802,
  COMMAND_INCOMPATIBLE_FILE_STRUCTURE: 0x6981,
  CONDITIONS_OF_USE_NOT_SATISFIED: 0x6985,
  CONTRADICTION_INVALIDATION: 0x9810,
  CONTRADICTION_SECRET_CODE_STATUS: 0x9808,
  CUSTOM_IMAGE_BOOTLOADER: 0x662f,
  CUSTOM_IMAGE_EMPTY: 0x662e,
  FILE_ALREADY_EXISTS: 0x6a89,
  FILE_NOT_FOUND: 0x9404,
  GP_AUTH_FAILED: 0x6300,
  HALTED: 0x6faa,
  INCONSISTENT_FILE: 0x9408,
  INCORRECT_DATA: 0x6a80,
  INCORRECT_LENGTH: 0x6700,
  INCORRECT_P1_P2: 0x6b00,
  INS_NOT_SUPPORTED: 0x6d00,
  DEVICE_NOT_ONBOARDED: 0x6d07,
  INVALID_KCV: 0x9485,
  INVALID_OFFSET: 0x9402,
  LICENSING: 0x6f42,
  LOCKED_DEVICE: 0x5515,
  MAX_VALUE_REACHED: 0x9850,
  MEMORY_PROBLEM: 0x9240,
  MISSING_CRITICAL_PARAMETER: 0x6800,
  NO_EF_SELECTED: 0x9400,
  NOT_ENOUGH_MEMORY_SPACE: 0x6a84,
  OK: 0x9000,
  PIN_REMAINING_ATTEMPTS: 0x63c0,
  REFERENCED_DATA_NOT_FOUND: 0x6a88,
  SECURITY_STATUS_NOT_SATISFIED: 0x6982,
  TECHNICAL_PROBLEM: 0x6f00,
  UNKNOWN_APDU: 0x6d02,
  USER_REFUSED_ON_DEVICE: 0x5501,
};

export const createSocket = async ({ url, transport }) => {
  const ws = new WS(url);
  let inBulkMode = false;
  let correctlyFinished = false;

  const onDisconnect = (e) => {
    transport.off("disconnect", onDisconnect);
    throw Error(e);
  };

  const onUnresponsiveDevice = () => {
    // Nb Don't consider the device as locked if we are in a blocking apdu exchange, ie
    // one that requires user confirmation to complete.
    if (inBulkMode) return;

    throw new Error("ManagerDeviceLockedError");
  };

  transport.on("disconnect", onDisconnect);
  transport.on("unresponsive", onUnresponsiveDevice);

  ws.onerror = (e) => {
    if (inBulkMode) return; // in bulk case,
    throw new Error(e);
  };

  ws.onclose = () => {
    if (inBulkMode) return; // in bulk case, we ignore any network events because we just need to unroll APDUs with the device
  };

  ws.onmessage = async (e) => {
    try {
      const input = JSON.parse(e.data);
      switch (input.query) {
        case "exchange": {
          // a single ping-pong apdu with the HSM
          const { nonce } = input;
          const apdu = Buffer.from(input.data, "hex");
          // Detect the specific exchange that triggers the allow secure channel request.
          let pendingUserAllowSecureChannel = false;

          if (apdu.slice(0, 2).toString("hex") === "e051") {
            pendingUserAllowSecureChannel = true;
          }


          const r = await transport.exchange(apdu);
          //   if (unsubscribed) return;
          const status = r.readUInt16BE(r.length - 2);

          let response;
          switch (status) {
            case StatusCodes.OK:
              response = "success";
              break;

            case StatusCodes.LOCKED_DEVICE:
              throw new Error(`new TransportStatusError(${status})`);

            case StatusCodes.USER_REFUSED_ON_DEVICE:
            case StatusCodes.CONDITIONS_OF_USE_NOT_SATISFIED:
              if (pendingUserAllowSecureChannel) {
                throw new Error(`new UserRefusedAllowManager()`);
              }
            // Fallthrough is literally what we want when not allowing a secure channel.
            // eslint-disable-next-line no-fallthrough
            default:
              // Nb Other errors may not throw directly, we will instead keep track of
              // them and throw them if the next event from the ws connection is a disconnect
              // otherwise, we clear them.
              response = "error";
              throw new Error(
                `deviceError = new TransportStatusError(${status})`
              );
          }
          const data = r.slice(0, r.length - 2);

          const msg = {
            nonce,
            response,
            data: data.toString("hex"),
          };

          const strMsg = JSON.stringify(msg);
          ws.send(strMsg);
          break;
        }

        case "bulk": {
          // in bulk, we just have to unroll a lot of apdus, we no longer need the WS
          //   ws.close();
          const { data } = input;
          inBulkMode = true;

          for (let i = 0; i < data.length; i++) {
            const r = await transport.exchange(Buffer.from(data[i], "hex"));
            const status = r.readUInt16BE(r.length - 2);
            if (status !== StatusCodes.OK) {
              throw new Error(status);
            }
          }

          break;
        }

        case "success": {
          break;
        }

        case "error": {
          // an error from HSM
          throw new Error(input.data, {
            url,
          });
        }

        case "warning": {
          // a warning from HSM
          console.warn({
            type: "warning",
            message: input.data,
          });
          break;
        }

        default:
          console.warn(`Cannot handle msg of type ${input.query}`, {
            query: input.query,
            url,
          });
      }
    } catch (e) {
      console.log(e);
    }
  };
};
