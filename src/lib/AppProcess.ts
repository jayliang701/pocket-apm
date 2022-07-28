import { ProcessConfigReloadData, ProcessMessage, RPCServiceEventPayload, Worker } from "./types";
import cp, { ChildProcess } from 'child_process';
import path from 'path';
import EventEmitter from "events";

export default class AppProcess extends EventEmitter implements Worker {

    public static readonly EVENT_APP_CONFIG_RELOAD: string = 'app_config_reload';

    private configFile: string;

    private proc: ChildProcess;

    get id(): string {
        return this.configFile;
    }

    constructor(configFile: string) {
        super();
        this.configFile = configFile;
        this.onMessageHandler = this.onMessageHandler.bind(this);
    }

    async start() {
        this.proc = cp.fork(path.resolve(__dirname, 'monitor/app.js'), { detached: false, cwd: process.cwd(), env:{ CONFIG: this.configFile } });
        this.proc.on('message', this.onMessageHandler);
    }

    async refresh() {
        //do nothing here
    }

    async dispose() {
        if (this.proc) {
            this.proc.off('message', this.onMessageHandler);
            this.proc.kill();
            this.proc = undefined;
        }
    }

    processRPCService(payload: RPCServiceEventPayload) {
        if (!this.proc) return;
        this.proc.send(payload);
    }

    private async onMessageHandler(message: ProcessMessage) {
        if (message.event === 'reload') {
            const data: ProcessConfigReloadData = message.data;
            this.emit(AppProcess.EVENT_APP_CONFIG_RELOAD, data);
        }
    }

}
