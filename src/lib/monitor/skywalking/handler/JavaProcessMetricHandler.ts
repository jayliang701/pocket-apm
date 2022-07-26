import dayjs from "dayjs";
import ServiceHandler from "./ServiceHandler";
import fs from 'fs/promises';
import path from 'path';
import { buildFilledString } from "../../../utils";

type ProcessMetric = {
    time: string;
    cpu: {
        usagePercent: number;
    }
};

type ProcessMetricData = {
    service: string;
    serviceInstance: string;
    metrics: ProcessMetric[];
};

type CPUMetric = {
    value: number;
    time: number;
};

const VALUE_LEN = Buffer.from(`999.9999`, 'utf-8').byteLength;
const LINE_LEN = Buffer.from(`${Date.now()} \n`, 'utf-8').byteLength + VALUE_LEN;

export default class JavaProcessMetricHandler extends ServiceHandler {

    get service(): string {
        return this.config.service;
    }

    get serviceName(): string {
        return this.service + '@JVMMetricReportService';
    }

    isFlushing: boolean = false;

    lastMins: number = 0;
    
    constructor() {
        super();
    }

    cpuRecords: Map<string, CPUMetric[]> = new Map();
    cpuMinRecords: Map<string, CPUMetric[]> = new Map();

    collect({ metrics, serviceInstance }: ProcessMetricData): void {
        let cpus = this.cpuRecords.get(serviceInstance);
        if (!cpus) {
            cpus = [];
            this.cpuRecords.set(serviceInstance, cpus);
        }
        let cmr = this.cpuMinRecords.get(serviceInstance);
        if (!cmr) {
            cmr = [];
            this.cpuMinRecords.set(serviceInstance, cmr);
        }
        metrics.forEach(({ time, cpu }) => {
            let ts = Number(time);
            let mins = Math.floor(ts / 60 / 1000) * 60 * 1000;
            if (mins < this.lastMins) {
                console.warn('duplicate time metric ---> ', dayjs(ts).format('HH:mm'));
                return;
            }
            this.lastMins = mins;
            if (cpus.length > 0 && (cmr.length < 1 || mins > cmr[cmr.length - 1].time)) {
                let total = 0;
                cpus.forEach((m) => {
                    total += m.value;
                });
                let avg = total / cpus.length;
                cmr.push({ value: avg, time: mins });
                console.log(`${serviceInstance} cpu usage (minutes avg) ----> `, avg, dayjs(mins).format('HH:mm'));
                cpus.length = 0;

                this.flushCPUMetricLog(serviceInstance, cmr);
            }
            cpus.push({ value: cpu.usagePercent, time: ts });
            // console.log(`${serviceInstance} cpu usage ----> `, cpu.usagePercent, dayjs(sec).format('HH:mm:ss'));
        });
    }

    private async flushCPUMetricLog(serviceInstance: string, metrics: CPUMetric[]) {
        if (!metrics || metrics.length < 2) { 
            return;
        }

        const file = path.resolve(this.config.metricLogPath, `${serviceInstance}-cpu.log`.replace(/@/img, '_'));

        const removeNum = metrics.length - 1;
        const lines = Buffer.alloc(removeNum * LINE_LEN);

        let offset = 0;
        for (let i = 0; i < removeNum; i ++) {
            const metric = metrics[i];
            const val = buildFilledString(metric.value.toFixed(4), VALUE_LEN, '0');
            lines.write(`${metric.time} ${val}\n`, offset, LINE_LEN, 'utf-8');
            offset += LINE_LEN;
        }

        this.isFlushing = true;
        fs.appendFile(file, lines).then(() => {
            metrics.splice(0, removeNum);
            this.isFlushing = false;
        }).catch(err => {
            this.isFlushing = false;
            console.error(`write CPU metric log fail ---> `, err);
        });

    }

}
