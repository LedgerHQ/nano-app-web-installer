import "./App.css";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import { useState } from "react";
import { getDeviceInfo, installApp, getAppsListByDevice, openApp, quitCurrentApp, getCurrentAppAndVersion } from './lib';
function App() {
  let transport;
  const [error, setError] = useState("");
  const onClickInstall = async (appName, isDelete) => {
    try {
      transport = await TransportWebUSB.create();
      const deviceInfo = await getDeviceInfo(transport);
      console.log(deviceInfo);
      // const version = deviceInfo.version;
      const appByDevice = await getAppsListByDevice(deviceInfo, false, 1);

      const myApp = appByDevice.filter( app => app.name == appName);
      console.log(myApp);

      await installApp(myApp[0], transport, isDelete);
    } catch (e) {
      setError(String(e));
    }
  }; 
  
  const onClickOpen = async (appName) => {
    try {
      transport = await TransportWebUSB.create();
      await openApp(transport, appName);
    } catch (e) {
      setError(String(e));
    }
  }; 
  const onClickQuit = async () => {
    try {
      transport = await TransportWebUSB.create();
      await quitCurrentApp(transport);
    } catch (e) {
      setError(String(e));
    }
  }; 
  const onClickGetCurrentAppAndVersion = async () => {
    try {
      transport = await TransportWebUSB.create();
      const info = await getCurrentAppAndVersion(transport);
      console.log(info);
    } catch (e) {
      setError(String(e));
    }
  }; 
  return (
    <div className="App">
      <div className="App-header">
        <button onClick={() => onClickOpen("Cosmos")}>Open app</button>
        <button onClick={() => onClickQuit()}>Quit app</button>
        <button onClick={() => onClickGetCurrentAppAndVersion()}>Get info app</button>
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
