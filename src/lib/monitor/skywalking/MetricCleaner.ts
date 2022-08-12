import { readdirSync, Stats, statSync } from "fs";
import path from "path";
import { CleanMetricFilePolicy, SkywalkingConfig } from "src/lib/types";
import JavaProcessMetricHandler from "./handler/JavaProcessMetricHandler";
const cron = require('node-cron');

interface ScheduleTask {
    stop: () => void;
    start: () => void;
}

type CleanFunc = (file: string, stat: Stats, policy: CleanMetricFilePolicy) => void;

export default class MetricHandler {

    protected cleanTask: ScheduleTask;

    protected config: SkywalkingConfig;

    protected cleanPolicy: Record<'jvm' | 'nodejs', CleanFunc> = {
        'jvm': JavaProcessMetricHandler.cleanMetricLog,
        'nodejs': JavaProcessMetricHandler.cleanMetricLog,
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

    public checkClean = () => {
        console.log('start check clean...')
        const files = this.getMetricLogFiles();
        console.log(`found ${files.length} file(s)...`);
        const maxSizeInKB = this.config.clean.metricFile.maxSize;
        for (let file of files) {
            let filePath = path.resolve(this.getMetricLogFolder(), file);
            const stats: Stats = statSync(filePath);
            
            const sizeInKB: number = stats.size / 1024;
            if (sizeInKB > maxSizeInKB) {
                //clean
                console.log(`${file} clean...`)
                this.doCleanJob(filePath, stats);
            } else {
                console.log(`${file} skip...`)
            }
        }
    }

    protected doCleanJob(file: string, stat: Stats) {
        let func: CleanFunc;
        if (file.endsWith('-jvm.log')) {
            func = this.cleanPolicy['jvm'];
        } else if (file.endsWith('-nodejs.log')) {
            func = this.cleanPolicy['nodejs'];
        }
        if (func) {
            try {
                func(file, stat, this.config.clean.metricFile);
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