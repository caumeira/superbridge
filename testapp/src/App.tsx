import { useEffect, useState } from "react";

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

  function togglePings() {
    setRunPings((prev) => !prev);
  }

  useEffect(() => {
    if (!runPings) return;

    return appClient.pings(1, (date, main) => {
      console.log("date", date);
      main(`CLIENT MAIN ${date.toISOString()}`);
      setMessage(`${date.toISOString()}`);
    });
  }, [runPings]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Superbridge Test App</h1>
      <p>Message from main process: {message}</p>
      <button onClick={togglePings}>{runPings ? "Stop" : "Start"}</button>
    </div>
  );
}

export default App;
