import "./App.css";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import TransportWebBLE from "@ledgerhq/hw-transport-web-ble";
import { appsList } from "./api";
import { useState } from "react";
import { getDeviceInfo, getTargetId, installApp, getAppsListByDevice } from './lib';
function App() {
  let transport;
  const [error, setError] = useState("");
  const onClickInstall = async (appName, isDelete) => {
    try {
      transport = await TransportWebUSB.create();

      const apps = await appsList();

      const family = apps.find(
        (a) =>
          a.name.toLowerCase() === appName.toLowerCase() && a.category !== 2
      );

      console.log("transport");
      console.log(transport);
      const lol = await getDeviceInfo(transport);
      console.log(lol);

      // TODO get device version
      const app = family.application_versions.find(
        (a) => a.firmware === "nanox/2.0.2-2/ATOM/app_2.34.9"
      );

      const targetId = await getTargetId(transport);

      await installApp(targetId, app, transport, isDelete);
    } catch (e) {
      setError(String(e));
    }
  };  
  const onClickInstallBLE = async (appName, isDelete) => {
    try {
      transport = await TransportWebBLE.create();

      const apps = await appsList();

      const family = apps.find(
        (a) =>
          a.name.toLowerCase() === appName.toLowerCase() && a.category !== 2
      );

      console.log("transport");
      console.log(transport);
      const lol = await getDeviceInfo(transport);
      console.log(lol);
      // const lolilol = await getAppsListByDevice(lol, false);
      // console.log(lolilol);

      // TODO get device version
      const app = family.application_versions.find(
        (a) => a.firmware === "nanox/2.0.2-2/ATOM/app_2.34.9"
      );

      const targetId = await getTargetId(transport);

      await installApp(targetId, app, transport, isDelete);
    } catch (e) {
      setError(String(e));
    }
  };
  return (
    <div className="App">
      <div className="App-header">
        <button onClick={() => onClickInstall("Cosmos")}>Install app</button>
        <button onClick={() => onClickInstallBLE("Cosmos")}>Install app Bluetooth</button>
        <button onClick={() => onClickInstall("Cosmos", true)}>
          Remove app
        </button>
        <div>{error}</div>
      </div>
    </div>
  );
}

export default App;
