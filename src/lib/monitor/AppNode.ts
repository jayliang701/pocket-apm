import { AppConfig, Config, MainProcessMessage, ProcessConfigReloadData, ProcessMessages, SyncMainConfigMessage } from "../types";
import Monitor from "./Monitor";
import LogMonitor from "./LogMonitor";
import ConfigedWorkerManager from "../utils/ConfigedWorkerManager";
import SkywalkingMonitor from "./SkywalkingMonitor";

const syncMainConfig = (): Promise<Config> => {
    return new Promise(async (resolve, reject) => {
        const handler = ({ event, data } : MainProcessMessage) => {
            if (event === 'sync_main_config') {
                process.off('message', handler);
                try {
                    const conf: Config = (data as SyncMainConfigMessage).config;
                    resolve(conf);
                } catch (err) {
                    reject(err);
                }
            }
        }
        process.on('message', handler);
        try {
            await sendToMainProcess('request_config', {});
        } catch (err) {
            reject(err);
        }
    })
}

const syncEnvVars = (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const handler = ({ event } : MainProcessMessage) => {
            if (event === 'sync_env_vars') {
                process.off('message', handler);
                setTimeout(() => {
                    resolve();
                }, 0);
            }
        }
        process.on('message', handler);
        try {
            await sendToMainProcess('request_env_vars', {});
        } catch (err) {
            reject(err);
        }
    })
}

const sendToMainProcess = (event: keyof ProcessMessages, data: ProcessMessages[keyof ProcessMessages]): Promise<void> => {
    return new Promise((resolve, reject) => {
        process.send({ event, data }, (err) => {
            if (err) {
                console.error('send message to main process failed ---> ', err);
                reject(err);
            } else {
                resolve();
            }
        });
    })
}

export default class AppNode extends ConfigedWorkerManager<AppConfig, Monitor> {

    private mainConfig: Config;

    public getMainConfig(): Config {
        return this.mainConfig;
    }

    protected override checkConfigFormat(config: AppConfig) {
        if (!config.name) {
            throw new Error('invalid config content, need "name" property.')
        }
    }

    async refresh() {
        //do nothing here
    }

    protected override async afterReload() {

        this.mainConfig = await syncMainConfig();
        await syncEnvVars();

        const { name, log, skywalking } = this.config;

        const newHash: Record<string, any> = {};
        if (log && log.watch && log.watch.length > 0) {
            newHash['log'] = LogMonitor;
        }
        if (skywalking) {
            newHash['skywalking'] = SkywalkingMonitor;
        }
        
        const remains: Monitor[] = [];
        const removes: Monitor[] = [];
        const newWorkers: Monitor[] = [];

        for (let workerId in this.workers) {
            const worker = this.workers[workerId];
            if (newHash[worker.id]) {
                remains.push(worker);
                delete newHash[worker.id];
            } else {
                removes.push(worker);
            }
        }

        //setup new monitors
        for (let monitorId in newHash) {
            const Cls: any = newHash[monitorId];
            const monitor: Monitor = new Cls(this, monitorId);
            newWorkers.push(monitor);
        }

        await this.processWorkers(removes, remains, newWorkers);

        const payload: ProcessConfigReloadData = {
            app: name,
            skywalkingApp: skywalking ? skywalking.service : undefined,
            configFile: this.configFile,
        };
        sendToMainProcess('reload', payload);
    }

    async dispose() {
        this.stopReload();
        this.stopWatchConfig();
        for (let workerId in this.workers) {
            const worker = this.workers[workerId];
            try {
                await worker.dispose();
            } catch (err) {
                console.error(`worker<${workerId}> dispose fail ---> `, err)
            }
        }
        this.workers = {};
    }

}


