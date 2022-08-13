import { readdirSync, Stats, statSync } from "fs";
import path from "path";
import { CleanMetricFilePolicy, SkywalkingConfig } from "../../types";
import { reentrantLock, releaseLock } from "../../utils/ReentrantLock";
import JavaProcessMetricHandler from "./handler/JavaProcessMetricHandler";
import NodeJSMetricHandler from "./handler/NodeJSMetricHandler";
const cron = require('node-cron');

interface ScheduleTask {
    stop: () => void;
    start: () => void;
}

type CleanFunc = (file: string, stat: Stats, policy: CleanMetricFilePolicy) => Promise<void>;

export default class MetricCleaner {

    protected cleanTask: ScheduleTask;

    protected config: SkywalkingConfig;

    protected cleanPolicy: Record<'jvm' | 'nodejs', CleanFunc> = {
        'jvm': JavaProcessMetricHandler.cleanMetricLog,
        'nodejs': NodeJSMetricHandler.cleanMetricLog,
    };

    protected getMetricLogFolder(): string {
        const folder = path.resolve(this.config.metricLogPath);
        return folder;
    }

    protected getMetricLogFiles(): string[] {
        const files = readdirSync(this.getMetricLogFolder());
        return files;
    }

    refresh(config: SkywalkingConfig) {
        this.config = config;

        if (this.cleanTask) {
            this.cleanTask.stop();
        }
        this.cleanTask = cron.schedule(this.config.clean.metricFile.schedule, this.checkClean, {
            scheduled: false,
        });
        this.cleanTask.start();
    }

    public checkClean = async () => {
        console.log('check...')
        const files = this.getMetricLogFiles();
        const maxSizeInKB = this.config.clean.metricFile.maxSize;
        const tasks: Promise<void>[] = [];
        for (let file of files) {
            let filePath = path.resolve(this.getMetricLogFolder(), file);
            const stats: Stats = statSync(filePath);
            
            const sizeInKB: number = stats.size / 1024;
            if (sizeInKB > maxSizeInKB) {
                //clean
                tasks.push(this.doCleanJob(filePath, stats));
            }
        }
        if (tasks.length > 0) {
            Promise.all(tasks);
        }
    }

    protected async doCleanJob(file: string, stat: Stats) {
        let func: CleanFunc;
        if (file.endsWith('-jvm.log')) {
            func = this.cleanPolicy['jvm'];
        } else if (file.endsWith('-nodejs.log')) {
            func = this.cleanPolicy['nodejs'];
        }
        if (func) {
            try {
                const key = await reentrantLock(file);
                await func(file, stat, this.config.clean.metricFile);
                releaseLock(file, key);
            } catch (err) {
                console.warn(`clean metric file <${file}> failed ---> `, err);
            }
        }
    }

    dispose() {
        if (this.cleanTask) {
            this.cleanTask.stop();
        }
    }

}