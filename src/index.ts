import "./config/env";
import Logger from "./logger/app";
import App from "./app";

Logger.logInfo(`Root Signal API - v0.0.1`);
Logger.logInfo(`Main: Starting application`);
const app = new App();

// Start app
app.init();
