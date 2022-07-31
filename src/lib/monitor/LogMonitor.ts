import LogReporter from "../reporter/LogReporter";
import { Log, LogConfig, SingleLogConfig } from "../types";
import LogWatcher from "../utils/LogWatcher";
import AppNode from "./AppNode";
import Monitor from "./Monitor";

type SharedKeys = { [P in keyof Omit<LogConfig, 'watch' | 'throttle'>]: true };
const sharedKeys: SharedKeys = { 'dateTimeFilter': true, 'logFilter': true, 'errorLogFilter': true };

const copyProperties = (config: LogConfig, singleConfig: SingleLogConfig): SingleLogConfig => {
    for (let key in sharedKeys) {
        if (singleConfig[key] == null || singleConfig[key] == undefined) {
            singleConfig[key] = config[key];
        }
    }
    return singleConfig;
}

export default class LogMonitor extends Monitor {

    private logWatchers: Record<string, LogWatcher> = {};

    private reporter: LogReporter = new LogReporter(this);

    override async start() {
        await this.refresh();
    }

    override async refresh() {
        await this.updateLogWatchers();
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
            singleLogConfig = copyProperties(logConfig, singleLogConfig);
            newHash[singleLogConfig.file] = singleLogConfig;
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
            await watcher.updateConfig(newHash[watcher.id]);
            console.log('update watcher --> ', watcher.id);
        }

        //setup new log watchers 
        for (let logFile in newHash) {
            const watcher: LogWatcher = new LogWatcher(newHash[logFile]);
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
