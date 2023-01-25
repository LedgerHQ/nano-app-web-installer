import "./App.css";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import { appsList } from "./api";
import { useState } from "react";
import { getTargetId, installApp } from "./manager";

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

      // TODO get device version
      const app = family.application_versions.find(
        (a) => a.firmware === "nanox/2.0.2-2/ATOM/app_2.34.6"
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
        <button onClick={() => onClickInstall("Cosmos", true)}>
          Remove app
        </button>
        <div>{error}</div>
      </div>
    </div>
  );
}

export default App;
