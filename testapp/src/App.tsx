import { useEffect, useState } from "react";

import { type Display } from "electron/renderer";
import { appClient } from "./bridge/client";

console.log("appClient", appClient);

appClient.foo.get().then((foo) => {
  console.log("foo", foo);
});

appClient.foo.change("bar").then(() => {
  console.log("foo changed");
});

appClient.foo.get().then((foo) => {
  console.log("foo", foo);
});

function App() {
  const [runPings, setRunPings] = useState(false);
  const [message, setMessage] = useState("");
  const [displays, setDisplays] = useState<Display[]>([]);

  function togglePings() {
    setRunPings((prev) => !prev);
  }

  useEffect(() => {
    appClient.watchDisplays(setDisplays);
  }, []);

  useEffect(() => {
    if (!runPings) return;

    return appClient.pings(1, (date, main) => {
      console.log("date", date);
      main(`CLIENT MAIN ${date.toISOString()}`);
      setMessage(`${date.toISOString()}`);
    });
  }, [runPings]);

  console.log("displays", displays);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Superbridge Test App</h1>
      <p>Message from main process: {message}</p>
      <button onClick={togglePings}>{runPings ? "Stop" : "Start"}</button>
      <div>
        {displays.map((display) => (
          <div key={display.id}>{display.bounds.height}</div>
        ))}
      </div>
    </div>
  );
}

export default App;
