/* eslint-disable no-bitwise */
import { PROVIDERS } from "../manager/provider";
import { satisfies as versionSatisfies, coerce as semverCoerce } from "semver";
import { identifyTargetId } from "@ledgerhq/devices";

const deviceVersionRangesForBootloaderVersion = {
  nanoS: ">=2.0.0",
  nanoX: ">=2.0.0",
  nanoSP: ">=1.0.0",
};

const deviceVersionRangesForHardwareVersion = {
  nanoX: ">=2.0.0",
};

export const isBootloaderVersionSupported = (seVersion, modelId) =>
  !!modelId &&
  !!deviceVersionRangesForBootloaderVersion[modelId] &&
  !!versionSatisfies(
    semverCoerce(seVersion) || seVersion,
    deviceVersionRangesForBootloaderVersion[modelId]
  );

/**
 * @returns whether the Hardware Version bytes are included in the result of the
 * getVersion APDU
 * */
export const isHardwareVersionSupported = (seVersion, modelId) =>
  !!modelId &&
  !!deviceVersionRangesForHardwareVersion[modelId] &&
  !!versionSatisfies(
    semverCoerce(seVersion) || seVersion,
    deviceVersionRangesForHardwareVersion[modelId]
  );

export const getVersion = async (transport) => {
  const res = await transport.send(0xe0, 0x01, 0x00, 0x00);
  const data = res.slice(0, res.length - 2);
  let i = 0;

  // parse the target id of either BL or SE
  const targetId = data.readUIntBE(0, 4);
  i += 4;

  // parse the version of either BL or SE
  const rawVersionLength = data[i++];
  let rawVersion = data.slice(i, i + rawVersionLength).toString();
  i += rawVersionLength;

  // flags. gives information about manager allowed in SE mode.
  const flagsLength = data[i++];
  let flags = data.slice(i, i + flagsLength);
  i += flagsLength;

  if (!rawVersionLength) {
    // To support old firmware like bootloader of 1.3.1
    rawVersion = "0.0.0";
    flags = Buffer.allocUnsafeSlow(0);
  }

  let mcuVersion = "";
  let mcuBlVersion;
  let seVersion;
  let bootloaderVersion;
  let hardwareVersion;
  let mcuTargetId;
  let seTargetId;
  let languageId;

  const isBootloader = (targetId & 0xf0000000) !== 0x30000000;

  if (isBootloader) {
    mcuBlVersion = rawVersion;
    mcuTargetId = targetId;

    if (i < data.length) {
      // se part 1
      const part1Length = data[i++];
      const part1 = data.slice(i, i + part1Length);
      i += part1Length;

      // at this time, this is how we branch old & new format
      if (part1Length >= 5) {
        seVersion = part1.toString();
        // se part 2
        const part2Length = data[i++];
        const part2 = data.slice(i, i + part2Length);
        i += flagsLength;
        seTargetId = part2.readUIntBE(0, 4);
      } else {
        seTargetId = part1.readUIntBE(0, 4);
      }
    }
  } else {
    seVersion = rawVersion;
    seTargetId = targetId;

    // if SE: mcu version
    const mcuVersionLength = data[i++];
    let mcuVersionBuf = Buffer.from(data.slice(i, i + mcuVersionLength));
    i += mcuVersionLength;

    if (mcuVersionBuf[mcuVersionBuf.length - 1] === 0) {
      mcuVersionBuf = mcuVersionBuf.slice(0, mcuVersionBuf.length - 1);
    }
    mcuVersion = mcuVersionBuf.toString();

    const isOSU = rawVersion.includes("-osu");

    if (!isOSU) {
      const deviceModel = identifyTargetId(targetId);

      if (isBootloaderVersionSupported(seVersion, deviceModel?.id)) {
        const bootloaderVersionLength = data[i++];
        let bootloaderVersionBuf = Buffer.from(
          data.slice(i, i + bootloaderVersionLength)
        );
        i += bootloaderVersionLength;

        if (bootloaderVersionBuf[bootloaderVersionBuf.length - 1] === 0) {
          bootloaderVersionBuf = bootloaderVersionBuf.slice(
            0,
            bootloaderVersionBuf.length - 1
          );
        }
        bootloaderVersion = bootloaderVersionBuf.toString();
      }

      if (isHardwareVersionSupported(seVersion, deviceModel?.id)) {
        const hardwareVersionLength = data[i++];
        hardwareVersion = data
          .slice(i, i + hardwareVersionLength)
          .readUIntBE(0, 1); // ?? string? number?
        i += hardwareVersionLength;
      }
    }
  }

  return {
    isBootloader,
    rawVersion,
    targetId,
    seVersion,
    mcuVersion,
    mcuBlVersion,
    mcuTargetId,
    seTargetId,
    flags,
    bootloaderVersion,
    hardwareVersion,
  };
};

const ManagerAllowedFlag = 0x08;
const PinValidatedFlag = 0x80;

export default async function getDeviceInfo(transport) {
  const res = await getVersion(transport).catch((e) => {
    if ((e.statusCode && e.statusCode === 0x6d06) || e.statusCode === 0x6d07) {
      throw new Error("getVersion error");
    }
    throw e;
  });

  const {
    isBootloader,
    rawVersion,
    targetId,
    seVersion,
    seTargetId,
    mcuBlVersion,
    mcuVersion,
    mcuTargetId,
    flags,
    bootloaderVersion,
    hardwareVersion,
    languageId,
  } = res;
  const isOSU = rawVersion.includes("-osu");
  const version = rawVersion.replace("-osu", "");
  const m = rawVersion.match(/([0-9]+.[0-9]+)(.[0-9]+)?(-(.*))?/);
  const [, majMin, , , postDash] = m || [];
  const providerName = PROVIDERS[postDash] ? postDash : null;
  const flag = flags.length > 0 ? flags[0] : 0;
  const managerAllowed = !!(flag & ManagerAllowedFlag);
  const pinValidated = !!(flag & PinValidatedFlag);

  let isRecoveryMode = false;
  let onboarded = true;
  if (flags.length === 4) {
    // Nb Since LNS+ unseeded devices are visible + extra flags
    isRecoveryMode = !!(flags[0] & 0x01);
    onboarded = !!(flags[0] & 0x04);
  }

  return {
    version,
    mcuVersion,
    seVersion,
    mcuBlVersion,
    majMin,
    providerName: providerName || null,
    targetId,
    seTargetId,
    mcuTargetId,
    isOSU,
    isBootloader,
    isRecoveryMode,
    managerAllowed,
    pinValidated,
    onboarded,
    bootloaderVersion,
    hardwareVersion,
    languageId,
  };
}
