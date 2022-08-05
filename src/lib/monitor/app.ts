import envVars from "../../envVars";
import { MainProcessMessage, SyncEnvVarsMessage, Vars } from "../types";
import { initTimeUtil } from "../utils";
import AppNode from "./AppNode";

initTimeUtil();

process.on('message', ({ event, data }: MainProcessMessage) => {
    if (event === 'sync_env_vars') {
        const vars: Vars = (data as SyncEnvVarsMessage).vars;
        console.log('sync env vars ----> ', vars)
        envVars.setVars(vars);
    }
});

let app = new AppNode(process.env.CONFIG);
app.start();

[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
    process.once(eventType, async (...rest) => {
        console.error(eventType, rest);
        if (app) {
            await app.dispose();
            app = undefined;
        }
    });
});