import dayjs from 'dayjs';
import Tail from 'tail-file';
import { Log, SingleLogConfig } from '../types';
import Chain from './Chain';
import LogNode from './LogNode';
import Throttle from './Throttle';
import TypedEventEmitter from './TypedEventEmitter';

export type LogWatcherEvents = {
    notify: (watcherId: string, alerts: Log[]) => Promise<void> | void;
};

export default class LogWatcher extends TypedEventEmitter<LogWatcherEvents> {

    protected throttle: Throttle = new Throttle();

    protected config: SingleLogConfig;

    protected watcher: Tail;

    protected logs: string[] = [];

    protected pendingAlerts: Chain<Log> = new Chain();

    protected timer: any;

    protected startLogErr: boolean = false;

    protected lastPos: number = 0;

    protected lastAlertLogTime: number = 0;

    protected watcherStartupTime: number = 0;

    get id(): string {
        return this.targetFile;
    }

    get targetFile(): string {
        return this.config?.file;
    }

    constructor(config: SingleLogConfig) {
        super();
        this.watcherStartupTime = Date.now();
        this.config = config;
        this.onFileNewLine = this.onFileNewLine.bind(this);
        this.onFileEOF = this.onFileEOF.bind(this);
        this.afterConfigUpdate();
    }

    updateConfig(config: Omit<SingleLogConfig, 'file'>) {
        this.config = {
            ...config,
            file: this.targetFile,
        }
        this.afterConfigUpdate();
    }

    private afterConfigUpdate() {
        this.pendingAlerts.maxSize = this.config.debounce.maxNum;
        this.throttle.setConfig(this.config.throttle);
        if (this.config.timeCheck) {
            this.lastAlertLogTime = this.watcherStartupTime;
        } else {
            this.lastAlertLogTime = 0;
        }
    }

    async start() {
        if (this.watcher) return;

        console.log('start watch log file ---> ', this.targetFile);
        this.watcher = new Tail(this.targetFile);
        this.watcher.on('line', this.onFileNewLine);
        this.watcher.on('eof', this.onFileEOF);
        this.watcher.start();
    }

    async stop() {
        this.checkAlert();

        if (this.watcher) {
            console.log('stop watch log file ---> ', this.targetFile);
            this.watcher.off('line', this.onFileNewLine);
            this.watcher.off('eof', this.onFileEOF);
            this.watcher.stop();
        }
    }

    async dispose() {
        await this.stop();
    }

    private onFileNewLine(line: string) {
        if (this.logs.length === 0 && this.throttle.isBlocked) {
            return;
        }

        if (this.checkIsTargetLog(line)) {
            //日志输出第一行, 带日期时间
            //先把之前错误日志处理了

            this.checkAlert();

            this.logs.length = 0;
            if (this.checkIsErrorLog(line)) {
                this.startLogErr = true;
            } else {
                this.startLogErr = false;
            }
        }
        if (this.startLogErr) this.logs.push(line);
    }

    private onFileEOF(pos: number) {
        if (this.lastPos < 0) {
            this.lastPos = pos;
            console.log(`start watching file. current end ---> ${pos}`);
            return;
        }
        if (this.logs.length < 1) {
            return;
        }
        this.lastPos = pos;

        this.checkAlert();

        this.logs.length = 0;
        this.startLogErr = false;
    }

    private parseDateTime(log: string): string | undefined {
        let filter = this.config.dateTimeFilter;
        
        if (filter instanceof RegExp) {
            let parts: string[] = log.match(filter);
            if (parts && parts[0]) {
                return parts[0];
            }
        } else {
            return filter(log);
        }

        return undefined;
    }

    private checkIsTargetLog(log: string): boolean {
        let filter = this.config.logFilter;
        
        if (filter instanceof RegExp) {
            return filter.test(log);
        } else {
            return filter(log);
        }
    }

    private checkIsErrorLog(log: string): boolean {
        let filter = this.config.errorLogFilter;
        
        if (filter instanceof RegExp) {
            return filter.test(log);
        } else {
            return filter(log);
        }
    }

    private checkAlert(): void {
        if (this.logs.length < 1) return;

        const firstLine = this.logs[0];
        const time = this.parseDateTime(firstLine);
        if (this.config.timeCheck) {
            try {
                let t = dayjs(time);
                if (t.isValid()) {
                    let ts = t.valueOf();
                    if (ts <= this.lastAlertLogTime) {
                        return;
                    } else {
                        this.lastAlertLogTime = ts;
                    }
                }
            } catch {
                //ignore parse error
            }
        }
        
        const newAlerts: Log = {
            time,
            lines: [].concat(this.logs),
        };

        this.pendingAlerts.add(new LogNode(newAlerts));

        if (!this.timer) {
            this.timer = setTimeout(async () => {
                this.timer = undefined;
                try {
                    const alerts = this.pendingAlerts.toArray();
                    this.pendingAlerts.removeAll();

                    this.throttle.execute(this.notify, alerts);
                } catch (err) {
                    console.error(err);
                }
            }, (this.config?.debounce?.delay) * 1000);
        }
    }

    notify = (alerts: Log[]) => {
        this.emit('notify', this.id, alerts);
    }

}