import LogReporter from "../reporter/LogReporter";
import { Log, LogConfig, SingleLogConfig } from "../types";
import { deepSet } from "../utils";
import LogWatcher from "../utils/LogWatcher";
import Monitor from "./Monitor";

type IgnoreKeys = Record<keyof Pick<LogConfig, 'watch'>, true>;
const ignoreKeys: IgnoreKeys = { 'watch': true };

export default class LogMonitor extends Monitor {

    private logWatchers: Record<string, LogWatcher> = {};

    private reporter: LogReporter = new LogReporter(this);

    override async start() {
        await this.refresh();
    }

    override async refresh() {
        await this.reporter.refresh();
        await this.updateLogWatchers();
        await super.refresh();
    }

    override async dispose() {
        await super.dispose();
        for (let watcherId in this.logWatchers) {
            const watcher = this.logWatchers[watcherId];
            watcher.off('notify', this.onLogNotify);
            await watcher.dispose();
            console.log('destroy watcher --> ', watcher.id);
        }
        this.logWatchers = undefined;
    }

    private async updateLogWatchers() {
        if (!this.config || !this.logWatchers) return;

        const { log: logConfig } = this.config;

        const hash: Record<string, SingleLogConfig> = {};
        const newHash: Record<string, SingleLogConfig> = {};
        (logConfig.watch || []).forEach((item) => {
            let singleLogConfig: SingleLogConfig;
            if (typeof item === 'string') {
                singleLogConfig = {
                    file: item,
                };
            } else {
                singleLogConfig = item;
            }
            singleLogConfig = deepSet(logConfig, singleLogConfig, ignoreKeys);
            console.log(singleLogConfig);
            newHash[singleLogConfig.file] = singleLogConfig;
            hash[singleLogConfig.file] = singleLogConfig;
        });
        
        let remains: LogWatcher[] = [];
        let removes: LogWatcher[] = [];
        for (let oldFile in this.logWatchers) {
            let watcher = this.logWatchers[oldFile];
            if (newHash[oldFile]) {
                remains.push(watcher);
                delete newHash[oldFile];
            } else {
                removes.push(watcher);
            }
        }

        for (let watcher of removes) {
            watcher.off('notify', this.onLogNotify);
            await watcher.dispose();
            delete this.logWatchers[watcher.id];
            console.log('remove watcher --> ', watcher.id);
        }

        for (let watcher of remains) {
            console.log('update watcher --> ', watcher.id);
            await watcher.updateConfig(hash[watcher.id]);
        }

        //setup new log watchers 
        for (let logFile in newHash) {
            const watcher: LogWatcher = new LogWatcher(hash[logFile]);
            watcher.on('notify', this.onLogNotify);
            this.logWatchers[watcher.id] = watcher;
            console.log('add new watcher --> ', watcher.id);
            watcher.start();
        }
    }

    onLogNotify = async (watcherId:string, alerts: Log[]) => {
        this.reporter.process(watcherId, alerts);
    }

}
