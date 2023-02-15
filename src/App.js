import "./App.css";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import { appsList } from "./api";
import { useState } from "react";
import { getDeviceInfo, getTargetId, installApp, getAppsListByDevice, getAppsList } from './lib';
function App() {
  let transport;
  const [error, setError] = useState("");
  const onClickInstall = async (appName, isDelete) => {
    try {
      transport = await TransportWebUSB.create();
      const device = transport.deviceModel.id.toLowerCase();
      const apps = await appsList();

      const family = apps.find(
        (a) =>
          a.name.toLowerCase() === appName.toLowerCase() && a.category !== 2
      );

      console.log("transport");
      console.log(transport);
      const lol = await getAppsList();
      const deviceInfo = await getDeviceInfo(transport);
      console.log(deviceInfo);
      // const version = deviceInfo.version;
      const appByDevice = await getAppsListByDevice(deviceInfo, false);
      console.log(appByDevice);

      // TODO get device version
      const app = family.application_versions.find(
        (a) => a.firmware === `${device}/2.0.2-2/ATOM/app_2.34.9`
      );

      // const targetId = await getTargetId(transport);

      // await installApp(app, transport, isDelete);
    } catch (e) {
      setError(String(e));
    }
  }; 
  return (
    <div className="App">
      <div className="App-header">
        <button onClick={() => onClickInstall("Cosmos")}>Install app</button>
        <button onClick={() => onClickInstall("Cosmos", true)}>
          Remove app
        </button>
        <div>{error}</div>
      </div>
    </div>
  );
}

export default App;
