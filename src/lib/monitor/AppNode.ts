import { AppConfig } from "../types";
import Monitor from "./Monitor";
import LogMonitor from "./LogMonitor";
import ConfigedWorkerManager from "../utils/ConfigedWorkerManager";
import SkywalkingMonitor from "./SkywalkingMonitor";

export default class AppNode extends ConfigedWorkerManager<AppConfig, Monitor> {

    protected override checkConfigFormat(config: AppConfig) {
        if (!config.name) {
            throw new Error('invalid config content, need "name" property.')
        }
    }

    override async refresh() {
        //no need to do anything
    }

    protected override async afterReload() {
        const { log, skywalking } = this.config;

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
            if (worker instanceof LogMonitor) {
                if (newHash[worker.id]) {
                    remains.push(worker);
                    delete newHash[worker.id];
                } else {
                    removes.push(worker);
                }
            }
        }

        //setup new monitors
        for (let monitorId in newHash) {
            const Cls: any = newHash[monitorId];
            const monitor: Monitor = new Cls(this, monitorId);
            newWorkers.push(monitor);
        }

        this.processWorkers(removes, remains, newWorkers);
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


