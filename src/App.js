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
      const apps = await appsList();

      const family = apps.find(
        (a) =>
          a.name.toLowerCase() === appName.toLowerCase() && a.category !== 2
      );
      const deviceInfo = await getDeviceInfo(transport);
      // const version = deviceInfo.version;
      const appByDevice = await getAppsListByDevice(deviceInfo, false, 1);

      const myApp = appByDevice.filter( app => app.name == appName);
      console.log(myApp);

      // TODO get device version
      const app = family.application_versions.find(
        (a) => a.firmware === myApp[0].firmware
      );

      // const targetId = await getTargetId(transport);

      await installApp(app, transport, isDelete);
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
