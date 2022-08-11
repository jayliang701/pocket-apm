import dayjs from "dayjs";
import ServiceHandler from "./ServiceHandler";
import fs from 'fs/promises';
import path from 'path';
import { buildFilledString } from "../../../utils";
import { JVMMetric, MetricUpdate, SkywalkingJVMMetricCollectData } from "../../../types";
import { METRIC_LOG_LINE_LEN, METRIC_MEMORY_VALUE_LEN, METRIC_PECT_VALUE_LEN, METRIC_THREAD_COUNT_VALUE_LEN, MINUTE } from "../../../../consts";

export default class JavaProcessMetricHandler extends ServiceHandler {

    get service(): string {
        return 'JVMMetricReportService';
    }

    isFlushing: boolean = false;

    lastTime: number = 0;
    
    constructor() {
        super();
    }

    recordsMap: Map<string, JVMMetric[]> = new Map();
    minRecordsMap: Map<string, JVMMetric[]> = new Map();

    collect({ metrics, serviceInstance }: SkywalkingJVMMetricCollectData): void {
        let records = this.recordsMap.get(serviceInstance);
        if (!records) {
            records = [];
            this.recordsMap.set(serviceInstance, records);
        }
        let minRecords = this.minRecordsMap.get(serviceInstance);
        if (!minRecords) {
            minRecords = [];
            this.minRecordsMap.set(serviceInstance, minRecords);
        }
        metrics.forEach((metric) => {
            // console.log(JSON.stringify(metric, null, 2));
            const { time, cpu, memory, thread } = metric;
            let ts = Number(time);
            let mins = Math.floor(ts / MINUTE) * MINUTE;
            if (ts < this.lastTime) {
                // console.warn('duplicate time metric ---> ', dayjs(ts).format('HH:mm'));
                return;
            }
            this.lastTime = ts;
            if (records.length > 0 && (minRecords.length < 1 || mins > minRecords[minRecords.length - 1].time)) {
                const total: JVMMetric = {
                    time: 0,
                    values: {
                        cpu: 0,
                        heapMemory: 0,
                        nonHeapMemory: 0,
                        liveThread: 0,
                        daemonThread: 0,
                        blockedThread: 0,
                    }
                }; 
                records.forEach((m) => {
                    total.values.cpu += m.values.cpu;
                    total.values.heapMemory += m.values.heapMemory;
                    total.values.nonHeapMemory += m.values.nonHeapMemory;
                    total.values.liveThread += m.values.liveThread;
                    total.values.daemonThread += m.values.daemonThread;
                    total.values.blockedThread += m.values.blockedThread;
                });
                const avg: JVMMetric = { 
                    values: {
                        cpu: total.values.cpu / records.length,
                        heapMemory: Math.round(total.values.heapMemory / records.length),
                        nonHeapMemory: Math.round(total.values.nonHeapMemory / records.length),
                        liveThread: Math.round(total.values.liveThread / records.length),
                        daemonThread: Math.round(total.values.daemonThread / records.length),
                        blockedThread: Math.round(total.values.blockedThread / records.length),
                    }, 
                    time: mins 
                };
                minRecords.push(avg);
                // console.log(`${serviceInstance} metric (minutes avg) ----> `, dayjs(mins).format('HH:mm'));
                // console.log(avg.values);
                records.length = 0;

                this.flushJVMMetricLog(serviceInstance, minRecords);
            }

            const heapMemory = memory[0].isHeap ? memory[0] : memory[1];
            const nonHeapMemory = !memory[0].isHeap ? memory[0] : memory[1];

            records.push({ 
                values: {
                    cpu: Number(cpu.usagePercent),
                    heapMemory: Number(heapMemory.used),
                    nonHeapMemory: Number(nonHeapMemory.used),
                    liveThread: Number(thread.liveCount),
                    daemonThread: Number(thread.daemonCount),
                    blockedThread: Number(thread.blockedStateThreadCount),
                },
                time: ts 
            });
        });
    }

    private async flushJVMMetricLog(serviceInstance: string, metrics: JVMMetric[]) {
        if (!metrics || metrics.length < 2) { 
            return;
        }

        const file = path.resolve(this.config.metricLogPath, `${serviceInstance}-jvm.log`.replace(/@/img, '_'));

        const removeNum = metrics.length - 1;
        const lines = Buffer.alloc(removeNum * METRIC_LOG_LINE_LEN);

        const d = 1024 * 1024;

        let offset = 0;
        const timeRange: [ number, number ] = [ 0, 0 ];
        for (let i = 0; i < removeNum; i ++) {
            const metric = metrics[i];
            const { values, time } = metric;
            if (i === 0) {
                timeRange[0] = time;
            } 
            if (i === removeNum - 1) {
                timeRange[1] = time;
            }

            const cpu = buildFilledString(values.cpu.toFixed(4), METRIC_PECT_VALUE_LEN, '0');
            const heapMemory = buildFilledString(String(Math.round(values.heapMemory / d)), METRIC_MEMORY_VALUE_LEN, '0');
            const nonHeapMemory = buildFilledString(String(Math.round(values.nonHeapMemory / d)), METRIC_MEMORY_VALUE_LEN, '0');
            const liveThread = buildFilledString(String(values.liveThread), METRIC_THREAD_COUNT_VALUE_LEN, '0');
            const daemonThread = buildFilledString(String(values.daemonThread), METRIC_THREAD_COUNT_VALUE_LEN, '0');
            const blockedThread = buildFilledString(String(values.blockedThread), METRIC_THREAD_COUNT_VALUE_LEN, '0');

            lines.write(`${time} ${cpu} ${heapMemory} ${nonHeapMemory} ${liveThread} ${daemonThread} ${blockedThread}\n`, offset, METRIC_LOG_LINE_LEN, 'utf-8');
            offset += METRIC_LOG_LINE_LEN;
        }

        this.isFlushing = true;
        fs.appendFile(file, lines).then(() => {
            metrics.splice(0, removeNum);
            this.isFlushing = false;

            const payload: MetricUpdate = {
                service: this.config.service,
                serviceInstance,
                metricLog: file,
                timeRange,
            };
            this.emitUpdate(payload);
        }).catch(err => {
            this.isFlushing = false;
            console.error(`write JVM metric log fail ---> `, err);
        });

    }

}
