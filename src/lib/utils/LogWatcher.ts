import EventEmitter from 'events';
import Tail from 'tail-file';
import { Log, SingleLogConfig } from '../types';

export default class LogWatcher extends EventEmitter {

    protected config: SingleLogConfig;

    protected watcher: Tail;

    protected logs: string[] = [];

    protected pendingAlerts: Log[] = [];

    protected timer: any;

    get id(): string {
        return this.targetFile;
    }

    get targetFile(): string {
        return this.config?.file;
    }

    constructor(config: SingleLogConfig) {
        super();
        this.config = config;
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
        let startLogErr = false;
        let lastPos = 0;
        this.watcher.on('line', (line) => {
            if (this.checkIsTargetLog(line)) {
                //日志输出第一行, 带日期时间
                //先把之前错误日志处理了

                this.checkAlert();

                this.logs.length = 0;
                if (this.checkIsErrorLog(line)) {
                    startLogErr = true;
                } else {
                    startLogErr = false;
                }
            }
            if (startLogErr) this.logs.push(line);
        });
        this.watcher.on('eof', pos => {
            if (lastPos < 0) {
                lastPos = pos;
                console.log(`start watching file. current end ---> ${pos}`);
                return;
            }
            if (this.logs.length < 1) {
                return;
            }
            lastPos = pos;

            this.checkAlert();

            this.logs.length = 0;
            startLogErr = false;
        });
        this.watcher.start();
    }

    async stop() {
        this.checkAlert();

        if (this.watcher) {
            console.log('stop watch log file ---> ', this.targetFile);
            this.watcher.stop();
        }
    }

    async dispose() {
        await this.stop();
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
                    console.log(alerts)
                } catch (err) {
                    console.error(err);
                }
            }, (this.config?.throttle?.delay) * 1000);
        }
    }

}