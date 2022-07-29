import Tail from 'tail-file';
import { Log, SingleLogConfig } from '../types';
import TypedEventEmitter from './TypedEventEmitter';

export type LogWatcherEvents = {
    notify: (watcherId: string, alerts: Log[]) => Promise<void> | void;
};

export default class LogWatcher extends TypedEventEmitter<LogWatcherEvents> {

    protected config: SingleLogConfig;

    protected watcher: Tail;

    protected logs: string[] = [];

    protected pendingAlerts: Log[] = [];

    protected timer: any;

    protected startLogErr: boolean = false;

    protected lastPos: number = 0;

    get id(): string {
        return this.targetFile;
    }

    get targetFile(): string {
        return this.config?.file;
    }

    constructor(config: SingleLogConfig) {
        super();
        this.config = config;
        this.onFileNewLine = this.onFileNewLine.bind(this);
        this.onFileEOF = this.onFileEOF.bind(this);
    }

    updateConfig(config: Omit<SingleLogConfig, 'file'>) {
        this.config = {
            ...config,
            file: this.targetFile,
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
        const newAlerts: Log = {
            time,
            lines: [...this.logs],
        };

        this.pendingAlerts.push(newAlerts);

        if (!this.timer) {
            this.timer = setTimeout(async () => {
                this.timer = undefined;
                try {
                    let alerts = [...this.pendingAlerts];
                    this.pendingAlerts.length = 0;

                    // await sendEmail(alerts);
                    // console.log(alerts);
                    // this.emit(LogWatcher.EVENT_NOTIFY, );
                    this.emit('notify', this.id, alerts);
                } catch (err) {
                    console.error(err);
                }
            }, (this.config?.throttle?.delay) * 1000);
        }
    }

}