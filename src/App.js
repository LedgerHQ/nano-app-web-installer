import "./App.css";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import { useState } from "react";
import { getDeviceInfo, installApp, getAppsListByDevice, openApp, quitCurrentApp, getCurrentAppAndVersion } from 'nano-app-web-installer-lib-test';
function App() {
  let transport;
  const [error, setError] = useState("");
  const onClickConnect = async() => {
    // create connection to nano device
    transport = await TransportWebUSB.create();
  }
  const onClickInstall = async (appName, isDelete) => {
    try {
      // get information about current device
      const deviceInfo = await getDeviceInfo(transport);

      // load all app available for device
      const appByDevice = await getAppsListByDevice(deviceInfo, false, 1);

      // find the correct app for device, should only return one app
      const myApp = appByDevice.filter( app => app.name == appName);

      // install the app on the device, need device on dashboard
      await installApp(myApp[0], transport, isDelete);
    } catch (e) {
      setError(String(e));
    }
  }; 
  
  const onClickOpen = async (appName) => {
    try {
      await openApp(transport, appName);
    } catch (e) {
      setError(String(e));
    }
  }; 
  const onClickQuit = async () => {
    try {
      await quitCurrentApp(transport);
    } catch (e) {
      setError(String(e));
    }
  }; 
  const onClickGetAllAppInstalledOnDevice = async () => {
    try {
      const info = await getCurrentAppAndVersion(transport);
      console.log(info);
    } catch (e) {
      setError(String(e));
    }
  }; 
  return (
    <div className="App">
      <div className="App-header">
        <button onClick={() => onClickConnect()}>Connect nano device</button>
        <button onClick={() => onClickOpen("Cosmos")}>Open app</button>
        <button onClick={() => onClickQuit()}>Quit app</button>
        <button onClick={() => onClickGetAllAppInstalledOnDevice()}>Get info app</button>
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
