import dayjs from "dayjs";
import path from 'path';
import { buildFilledString } from "../../../utils";
import { MetricUpdate, NodeJSMetricCollectData, NodeJSMetric, CleanMetricFilePolicy } from "../../../types";
import { NODEJS_METRIC_LOG_LINE_LEN, METRIC_MEMORY_VALUE_LEN, METRIC_PECT_VALUE_LEN, MINUTE, TIMESTAMP_LEN, PID_LEN } from "../../../../consts";
import { Debounce } from "../../../utils/Debounce";
import ServiceHandler from "./ServiceHandler";
import { createReadStream, Stats, truncateSync } from "fs";
import { reentrantLock, releaseLock } from "../../../utils/ReentrantLock";
const prependFile = require('prepend-file');

export default class NodeJSMetricHandler extends ServiceHandler {

    public static cleanMetricLog(file: string, stat: Stats, policy: CleanMetricFilePolicy): Promise<void> {
        return new Promise((resolve, reject) => {
            const maxSizeInKB = policy.maxSize;
            const maxLines = Math.floor(maxSizeInKB * 1024 / NODEJS_METRIC_LOG_LINE_LEN);
            const keepLines = Math.ceil(Math.min(maxLines * policy.keepPect, maxLines));

            const keepBytesLen = NODEJS_METRIC_LOG_LINE_LEN * keepLines;

            if (stat.size <= keepBytesLen) {
                //do nothing
            } else {
                let time: number = 0;
                let moreBytesLen: number = 0;
                const rs = createReadStream(file, { start: keepBytesLen, encoding: 'binary', highWaterMark: NODEJS_METRIC_LOG_LINE_LEN });
                
                const flush = () => {
                    try {
                        truncateSync(file, keepBytesLen + moreBytesLen);
                    } catch (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                }

                const closeStream = () => {
                    if (rs) {
                        rs.removeAllListeners('data');
                        rs.removeAllListeners('end');
                        rs.close();
                    }
                }
                rs.on('data', (chunk: Buffer) => {
                    if (chunk.length === NODEJS_METRIC_LOG_LINE_LEN) {
                        const ts = Number(chunk.slice(0, TIMESTAMP_LEN).toString('utf-8'));
                        if (!time) time = ts;
                        if (time === ts) {
                            //相同的时间，但是不同的process
                            //继续往下找，直到时间不同
                            moreBytesLen += chunk.length;
                        } else {
                            //时间不同，终止stream
                            closeStream();
                            flush();
                        }
                    }
                });
                rs.on('error', (err) => {
                    closeStream();
                    reject(err);
                });
                rs.on('end', () => {
                    closeStream();
                    flush();
                });
            }
        });
    }

    get service(): string {
        return 'NodeJSMetricReportService';
    }

    constructor() {
        super();
    }

    private lastTimeMap: Map<string, Map<number, number>> = new Map();
    private recordsMap: Map<string, Map<number, NodeJSMetric[]>> = new Map();
    private minRecordsMap: Map<string, Map<number, NodeJSMetric[]>> = new Map();

    private debounceMap: Map<string, Debounce> = new Map();

    private getRecords(serviceInstance: string, pid: number): NodeJSMetric[] {
        let processRecords = this.recordsMap.get(serviceInstance);
        if (!processRecords) {
            processRecords = new Map();
            this.recordsMap.set(serviceInstance, processRecords);
        }
        let records = processRecords.get(pid);
        if (!records) {
            records = [];
            processRecords.set(pid, records);
        }
        return records;
    }

    private getMinRecords(serviceInstance: string, pid: number): NodeJSMetric[] {
        let processMinRecords = this.minRecordsMap.get(serviceInstance);
        if (!processMinRecords) {
            processMinRecords = new Map();
            this.minRecordsMap.set(serviceInstance, processMinRecords);
        }
        let minRecords = processMinRecords.get(pid);
        if (!minRecords) {
            minRecords = [];
            processMinRecords.set(pid, minRecords);
        }
        return minRecords;
    }

    collect({ processes, serviceInstance }: NodeJSMetricCollectData): void {

        // const minRecordsDict: Record<number, Map<number, NodeJSMetric[]>>

        for (let proc of processes) {
            proc.pid = Number(proc.pid);
            const { pid, metrics } = proc;
            
            const records = this.getRecords(serviceInstance, pid);
            const minRecords = this.getMinRecords(serviceInstance, pid);

            let lastTimeRecords = this.lastTimeMap.get(serviceInstance);
            if (!lastTimeRecords) {
                lastTimeRecords = new Map();
                this.lastTimeMap.set(serviceInstance, lastTimeRecords);
            }
            let lastTime = lastTimeRecords.get(pid);

            metrics.forEach((metric) => {
                metric.cpu = Math.min(100, metric.cpu);
                let { time, cpu, memory, aliveTime } = metric;

                let ts = Number(time);
                let mins = Math.floor(ts / MINUTE) * MINUTE;
                if (ts < lastTime) {
                    return;
                }
                lastTime = ts;
                lastTimeRecords.set(pid, lastTime);

                if (records.length > 0 && (minRecords.length < 1 || mins > minRecords[minRecords.length - 1].time)) {
                    const total: NodeJSMetric = {
                        pid,
                        time: 0,
                        cpu: 0,
                        memory: 0,
                        aliveTime: 0,
                    };
                    records.forEach((m) => {
                        total.cpu += m.cpu;
                        total.memory += m.memory;
                        total.aliveTime = Math.max(total.aliveTime, m.aliveTime);
                    });
                    const avg: NodeJSMetric = {
                        pid,
                        cpu: total.cpu / records.length,
                        memory: Math.round(total.memory / records.length),
                        aliveTime: total.aliveTime,
                        time: mins
                    };
                    minRecords.push(avg);
                    // console.log(`${serviceInstance} <pid:${pid}> metric (minutes avg) ----> `, dayjs(mins).format('HH:mm'));
                    // console.log(avg);
                    records.length = 0;

                    this.addFlushTask(serviceInstance, minRecords);
                }
                records.push({
                    pid,
                    cpu: Number(cpu),
                    memory: Number(memory),
                    aliveTime: aliveTime,
                    time: ts
                });
            });
        }
    }

    private addFlushTask(serviceInstance: string, metrics: NodeJSMetric[]) {
        if (!metrics || metrics.length < 2) {
            return;
        }
        let debounce = this.debounceMap.get(serviceInstance);
        if (!debounce) {
            debounce = new Debounce({ delay: 5000 });
            this.debounceMap.set(serviceInstance, debounce);
        }
        debounce.execute(this.flushMetricLog, serviceInstance);
    }

    private flushMetricLog = async (serviceInstance: string) => {
        const processMinRecords = this.minRecordsMap.get(serviceInstance);
        if (!processMinRecords) return;

        const d = 1024 * 1024;
        const file = path.resolve(this.config.metricLogPath, `${serviceInstance}-nodejs.log`.replace(/@/img, '_'));

        let totalRemoveNum = 0;
        const removeNums: Map<number, number> = new Map();
        processMinRecords.forEach((metrics, pid) => {
            let removeNum = metrics.length - 1;
            removeNums.set(pid, removeNum);
            totalRemoveNum += removeNum;
        });

        // const lines = Buffer.alloc(totalRemoveNum * NODEJS_METRIC_LOG_LINE_LEN);
        const linesMap: Map<number, string> = new Map();
        const timeRange: [number, number] = [0, 0];

        let offset = 0;
        processMinRecords.forEach((metrics, pid) => {
            const removeNum = removeNums.get(pid);

            for (let i = removeNum - 1; i >= 0; i--) {
                const metric = metrics[i];
                const { time } = metric;
                if (i === 0) {
                    timeRange[0] = Math.min(timeRange[0] || time, time);
                }
                if (i === removeNum - 1) {
                    timeRange[1] = Math.max(timeRange[1], time);
                }

                const pidStr = buildFilledString(String(pid), PID_LEN, '0');
                const cpu = buildFilledString(metric.cpu.toFixed(4), METRIC_PECT_VALUE_LEN, '0');
                const memory = buildFilledString(String(Math.round(metric.memory / d)), METRIC_MEMORY_VALUE_LEN, '0');
                const aliveTime = buildFilledString(String(metric.aliveTime), TIMESTAMP_LEN, '0');
                
                const line = `${time} ${pidStr} ${cpu} ${memory} ${aliveTime}\n`;

                let lines = linesMap.get(time) || '';
                lines += line;
                linesMap.set(time, lines);

                // lines.write(line, offset, NODEJS_METRIC_LOG_LINE_LEN, 'utf-8');
                offset += NODEJS_METRIC_LOG_LINE_LEN;
            }
        });

        let times: number[] = [];
        linesMap.forEach((_, time) => {
            times.push(time);
        })
        times.sort((a, b) => a > b ? -1 : 1);

        let allLines = '';
        for (let time of times) {
            let lines = linesMap.get(time);
            allLines += lines;
        }

        const key = await reentrantLock(file);
        try {
            await prependFile(file, allLines);

            processMinRecords.forEach((metrics, pid) => {
                const removeNum = removeNums.get(pid);
                metrics.splice(0, removeNum);
            });
    
            const payload: MetricUpdate = {
                service: this.config.service,
                serviceInstance,
                metricLog: file,
                timeRange,
            };
            this.emitUpdate(payload);
        } catch (err) {
            console.error(`write NodeJS metric log fail ---> `, err);
        }
        releaseLock(file, key);

    }
    

}
