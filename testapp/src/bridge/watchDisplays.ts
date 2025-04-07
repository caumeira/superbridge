import { Display, screen } from "electron";

export function watchDisplays(onDisplaysChange: (displays: Display[]) => void) {
  function reportDisplays() {
    const displays = screen.getAllDisplays();
    onDisplaysChange(displays);
  }

  reportDisplays();

  screen.on("display-added", reportDisplays);
  screen.on("display-removed", reportDisplays);
  screen.on("display-metrics-changed", reportDisplays);

  return () => {
    screen.off("display-added", reportDisplays);
    screen.off("display-removed", reportDisplays);
    screen.off("display-metrics-changed", reportDisplays);
  };
}
