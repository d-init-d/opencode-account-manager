import React from "react";
import { render } from "ink";
import { Dashboard } from "./Dashboard";

export interface TuiOptions {
  pluginPath?: string;
}

export function startTuiDashboard(options: TuiOptions) {
  render(<Dashboard pluginPath={options.pluginPath} />);
}
