import { AppProcessEvent, IAppProcess, MainProcessMessages, ProcessConfigReloadData, ProcessInvokePlatformData, ProcessMessage, ProcessReportData, RPCServiceEventPayload, Worker } from "./types";
import cp, { ChildProcess } from 'child_process';
import path from 'path';
import TypedEventEmitter from "./utils/TypedEventEmitter";

export default class AppProcess extends TypedEventEmitter<AppProcessEvent> implements Worker, IAppProcess {

    private configFile: string;

    private proc: ChildProcess;

    get id(): string {
        return this.configFile;
    }

    constructor(configFile: string) {
        super();
        this.configFile = configFile;
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
            this.proc.removeAllListeners('message');
            this.proc.kill();
            this.proc = undefined;
        }
    }

    send(event: keyof MainProcessMessages, data: MainProcessMessages[keyof MainProcessMessages]): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.proc) {
                console.warn('can\'t send message to child process.');
                resolve();
                return;
            }
            this.proc.send({ event, data }, (err) => {
                if (err) {
                    console.error('send message to child process failed ---> ', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        })
    }

    processRPCService(payload: RPCServiceEventPayload) {
        if (!this.proc) return;
        this.proc.send(payload);
    }

    onMessageHandler = async (message: ProcessMessage) => {
        if (message.event === 'report') {
            this.emit('report', message.data as ProcessReportData);
        } else if (message.event === 'reload') {
            this.emit('app_config_reload', message.data as ProcessConfigReloadData);
        } else if (message.event === 'request_config') {
            this.emit('request_main_config', this);
        } else if (message.event === 'request_env_vars') {
            this.emit('request_env_vars', this);
        } else if (message.event === 'invoke_platform') {
            this.emit('invoke_platform', this, message.data as ProcessInvokePlatformData);
        }
    }

}
