import { RPCServiceEventPayload } from "../types";
import AppNode from "./AppNode";

let app = new AppNode(process.env.CONFIG);
app.start();

[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
    process.once(eventType, async () => {
        if (app) {
            await app.dispose();
            app = undefined;
        }
    });
});