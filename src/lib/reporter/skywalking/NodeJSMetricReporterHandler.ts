import dayjs from "dayjs";
import { EmailReport, LarkMessage, LarkReport, MetricUpdate, NodeJSMetric, NodeJSMetricValues, Report } from "../../types";
import { METRIC_MEMORY_VALUE_LEN, METRIC_PECT_VALUE_LEN, MINUTE, NODEJS_METRIC_LOG_LINE_LEN, PID_LEN, TIMESTAMP_LEN } from "../../../consts";
import { IMonitor } from "../../monitor/Monitor";
import { isLarkAvailable, uploadImage } from "../../platform/Lark";
import SkywalkingReporterHandler from "./SkywalkingReporterHandler";
import Throttle from "../../utils/Throttle";
import uniqolor from 'uniqolor';
import { humanizeTimeText } from "../../utils";

const LineByLineReader = require('line-by-line');

const ChartJsImage = require('chartjs-to-image');

const buildChart = async (labels: string[], datasets: any[], options: any): Promise<Buffer> => {
    const chart = new ChartJsImage();
    chart.setConfig({
        type: 'line',
        data: { labels, datasets/*: [{ label: 'Foo', data: [1, 2] }]*/ },
        options,
    });
    chart.setWidth(580);
    chart.setDevicePixelRatio(2.0);
    const buff = await chart.toBinary();
    return buff;
}

type SingleProcessChartData = {
    cpu: { [name: string]: any; data: any[]; };
    memory:{ [name: string]: any; data: any[]; };
};

const genCharts = async (metricsDict: Record<number, Record<number, NodeJSMetric>>, times: Set<number>): Promise<Buffer[]> => {
    // metrics = [ { "label":"CPU", "value": 29.30845818617146, "time": 1657779694421 }, ... ]

    const charts: Buffer[] = [];

    const labels: string[] = [];
    const chartDataDict: Record<number, SingleProcessChartData> = {};

    const timeArr: number[] = [];
    times.forEach(time => {
        timeArr.push(time);
    });

    for (let i = timeArr.length - 1; i >= 0; i --) {
        const time = timeArr[i];
        labels.push(dayjs(Number(time)).format('HH:mm'));

        for (let pid in metricsDict) {
            const metrics = metricsDict[pid];
            let m: NodeJSMetric = metrics[time];
            m = m || {
                cpu: 0,
                memory: 0,
                aliveTime: 0,
                time,
                pid: Number(pid),
            };
            if (!chartDataDict[pid]) {
                const { color } = uniqolor(pid);
                chartDataDict[pid] = { 
                    cpu: { 
                        label: pid, 
                        data: [],
                        borderColor: color,
                    }, 
                    memory: { 
                        label: pid, 
                        data: [],
                        borderColor: color,
                    }
                };
            }
            chartDataDict[pid].cpu.data.push(m.cpu);
            chartDataDict[pid].memory.data.push(m.memory);
        }
    }

    const cpus = [];
    const memories = [];
    for (let pid in chartDataDict) {
        cpus.push(chartDataDict[pid].cpu);
        memories.push(chartDataDict[pid].memory);
    }
    
    charts.push(await buildChart(labels, cpus, {
        legend: {
            position: 'bottom',
        },
        title: {
            display: true,
            text: 'CPU 使用率 (%)',
        },
    }));
    charts.push(await buildChart(labels, memories, {
        legend: {
            position: 'bottom',
        },
        title: {
            display: true,
            text: '内存使用率 (MB)',
        },
    }));

    return charts;
}

const parseMetricFromLog = (line: Buffer | string): NodeJSMetric => {
    const metric: NodeJSMetric = {
        pid: 0,
        time: 0,
        cpu: 0,
        memory: 0,
        aliveTime: 0,
    };
    try {
        let str = typeof line === 'string' ? line : line.toString('utf8');
        let start = 0;
        metric.time = Number(str.substring(start, start + TIMESTAMP_LEN));
        start += TIMESTAMP_LEN + 1;
        metric.pid = Number(str.substring(start, start + PID_LEN));
        start += PID_LEN + 1;
        metric.cpu = Number(str.substring(start, start + METRIC_PECT_VALUE_LEN));
        start += METRIC_PECT_VALUE_LEN + 1;
        metric.memory = Number(str.substring(start, start + METRIC_MEMORY_VALUE_LEN));
        start += METRIC_MEMORY_VALUE_LEN + 1;
        metric.aliveTime = Number(str.substring(start, start + TIMESTAMP_LEN));
        start += TIMESTAMP_LEN + 1;
    } catch (err) {
        console.warn('parse metric error ---> ', err);
    }
    return metric;
}

const readFileFromHead = async (file: string, fromTime: number, map?: (metric: NodeJSMetric) => void): Promise<Record<number, ProcessMetrics>> => {
    return new Promise((resolve, reject) => {
        const metrics: Record<number, ProcessMetrics> = {};

        const lr = new LineByLineReader(file, { encoding: 'utf-8' });
        const clearReader = () => {
            if (lr) {
                lr.removeAllListeners('error');
                lr.removeAllListeners('line');
                lr.removeAllListeners('end');
                try {
                    lr.close();
                } catch {}
            }
        }
        lr.on('error', (err) => {
            // console.error('read NodeJS metric from log file error ---> ', err);
            clearReader();
            reject(err);
        });

        lr.on('line', (line: string) => {
            if (line.length !== NODEJS_METRIC_LOG_LINE_LEN - 1) {
                return;
            }
            const metric = parseMetricFromLog(line);
            if (metric.time < fromTime) {
                clearReader();
                resolve(metrics);
            } else {
                let pm: ProcessMetrics = metrics[metric.pid];
                if (!pm) {
                    pm = new ProcessMetrics();
                    metrics[metric.pid] = pm;
                }
                pm.add(metric);
                if (map) map(metric);
            }
        });

        lr.on('end', () => {
            // All lines are read, file is closed now.
            clearReader();
            resolve(metrics);
        });
        
    });
}

// const requestLarkAccessToken = (): Promise<string> => {
//     return new Promise((resolve, reject) => {
//         const handler = ({ event, data }: { event: string, data: any }) => {
//             if (event === 'sync_lark_access_token') {
//                 process.off('message', handler);
//                 resolve(data);
//             }
//         }
//         process.on('message', handler);
//         process.send({
//             event: 'invoke_platform',
//             data: { platform: 'lark', method: 'getAccessToken', callback: 'sync_lark_access_token' },
//         })
//     });
// }

class ProcessMetrics {

    private metrics: NodeJSMetric[] = [];

    private aggregateMetric: NodeJSMetricValues = {
        cpu: 0,
        memory: 0,
        aliveTime: 0,
    }

    private maxMetric: NodeJSMetricValues = {
        cpu: 0,
        memory: 0,
        aliveTime: 0,
    }

    private minMetric: NodeJSMetricValues = {
        cpu: 0,
        memory: 0,
        aliveTime: 0,
    }

    get length() {
        return this.metrics.length;
    }

    add(metric: NodeJSMetric) {
        this.metrics.push(metric);
        this.aggregateMetric.cpu += metric.cpu;
        this.aggregateMetric.memory += metric.memory;
        this.aggregateMetric.aliveTime = Math.max(metric.aliveTime, this.aggregateMetric.aliveTime);

        this.maxMetric.cpu = Math.max(this.maxMetric.cpu, metric.cpu);
        this.maxMetric.memory = Math.max(this.maxMetric.memory, metric.memory);
        this.maxMetric.aliveTime = this.aggregateMetric.aliveTime;

        if (this.length > 0) {
            this.minMetric.cpu = Math.min(this.minMetric.cpu, metric.cpu);
            this.minMetric.memory = Math.min(this.minMetric.memory, metric.memory);
            this.minMetric.aliveTime = this.aggregateMetric.aliveTime;
        } else {
            this.minMetric.cpu = metric.cpu;
            this.minMetric.memory = metric.memory;
            this.minMetric.aliveTime = this.aggregateMetric.aliveTime;
        }
    }

    avg(): NodeJSMetricValues {
        const metric: NodeJSMetricValues = {
            cpu: this.aggregateMetric.cpu / this.metrics.length,
            memory: Math.round(this.aggregateMetric.memory / this.metrics.length),
            aliveTime: this.aggregateMetric.aliveTime,
        }
        return metric;
    }

    min(): NodeJSMetricValues {
        return this.minMetric;
    }

    max(): NodeJSMetricValues {
        return this.maxMetric;
    }

    toArray(filterDuplicated?: boolean): NodeJSMetric[] {
        const list: NodeJSMetric[] = [];
        let time = 0;
        for (let i = this.metrics.length - 1; i >= 0; i --) {
            const item = this.metrics[i];
            if (filterDuplicated) {
                if (item.time <= time) {
                    continue;
                }
            }
            list.push(item);
        }
        return list;
    }
};

export default class NodeJSMetricReporterHandler extends SkywalkingReporterHandler {

    private lastProcessTime: number = Math.floor(Date.now() / MINUTE) * MINUTE;

    private throttle: Throttle = new Throttle();

    constructor(monitor: IMonitor) {
        super(monitor);
        this.init();
    }

    private init() {
        this.refreshThrottle();
        //debug
        // setTimeout(() => {
        //     this.process({
        //         service: 'test-app',
        //         serviceInstance: '9e8dd6594bf0b92f157c30b2530907a6@192.168.0.139',
        //         metricLog: 'F:\\projects\\library\\pocket-apm\\.metric\\test-app\\test.log',
        //         // metricLog: '/Users/jay/Documents/projects/library/pocket-apm/.metric/demo1/111.log',
        //         timeRange: [ 1660206420000, 1660206420000 ],
        //     });
        // }, 2000);
    }

    private refreshThrottle() {
        const { warn } = this.skywalkingConfig;
        if (warn && warn.throttle) {
            this.throttle.setConfig(warn.throttle);
        }
    }

    override async refresh() {
        this.refreshThrottle();
        await super.refresh();
    }

    override async process(data: MetricUpdate) {
        try {
            if (!this.skywalkingConfig) return;

            const { timeRange } = data;

            const { warn } = this.skywalkingConfig;
            if (warn) {
                const { durationMinutes } = warn;
                const passedMins = (timeRange[1] - this.lastProcessTime) / MINUTE;
                // console.log('passedMins ---> ', passedMins, this.lastProcessTime)
                if (passedMins >= durationMinutes) {
                    this.lastProcessTime = timeRange[1];
                    this.throttle.execute(this.doProcess, data);
                }
            }
            
        } catch (err) {
            console.error(err);
        }
    }

    doProcess = async (data: MetricUpdate) => {
        const { warn } = this.skywalkingConfig;
        if (!warn) return;

        const { durationMinutes } = warn;
        const now = Date.now();
        const fromTime = now - durationMinutes * MINUTE;

        const metricsDict: Record<number, ProcessMetrics> = await readFileFromHead(data.metricLog, fromTime);
        for (let pid in metricsDict) {
            const metrics = metricsDict[pid];
            if (metrics.length >= durationMinutes) {
                const avgMetric = metrics.avg();
                if (warn.nodejs.cpu !== undefined && avgMetric.cpu >= warn.nodejs.cpu) {
                    const reports = await this.buildWarnReports(data, 15);
                    await this.sendReports(reports);
                    return;
                }
            }
        }
    }

    private async buildWarnReports({ metricLog, service, serviceInstance }: MetricUpdate, mins: number): Promise<Report[]> {

        const times: Set<number> = new Set();
        const dict: Record<number, Record<number, NodeJSMetric>> = {};
        const metricsDict: Record<number, ProcessMetrics> = await readFileFromHead(metricLog, mins, (metric) => {
            times.add(metric.time);
            if (!dict[metric.pid]) {
                dict[metric.pid] = {};
            }
            dict[metric.pid][metric.time] = metric;
        });

        let charts: Buffer[] = [];
        try  {
            charts = await genCharts(dict, times);
        } catch (err) {
            console.error(err);
        }

        const { config } = this;

        const reports: Report[] = [];

        const timeText = humanizeTimeText(mins * 60 * 1000);
        const now = Date.now();
        const timeStr = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');
        const title = `NodeJS应用资源异常报警 <${config.name}>`;

        if (this.enableLarkChannel) {

            const images: any[] = [];
            
            for (let pid in metricsDict) {
                const metrics = metricsDict[pid];
            
                const minMetric = metrics.min();
                const maxMetric = metrics.max();
                
                images.push({
                    tag: 'div',
                    text: {
                        content: [
                            `进程<${pid}> CPU 使用率: ${minMetric.cpu}% &#126; ${maxMetric.cpu}%`,
                            `进程<${pid}> Memory 使用率: ${minMetric.memory} &#126; ${maxMetric.memory} MB`,
                            `进程<${pid}> 存活时长: ${Math.round(metrics.max().aliveTime / 1000)} 秒`
                        ].join('\r\n'),
                        tag: 'lark_md'
                    }
                });
            }

            if (isLarkAvailable()) {
                for (let chart of charts) {
                    try {
                        const imageKey = await uploadImage(chart);
                        images.push({
                            tag: 'img',
                            alt: {
                                content: '应用资源使用情况',
                                tag: 'lark_md'
                            },
                            mode: 'fit_horizontal',
                            img_key: imageKey,
                        });
                    } catch {
                        //upload image to lark fail
                    }
                }
            }

            const message: LarkMessage = {
                msg_type: 'interactive',
                card: {
                    header: {
                        template: 'red',
                        title: {
                            content: title,
                            tag: 'plain_text',
                        }
                    },
                    elements: [
                        {
                            fields: [
                                {
                                    is_short: true,
                                    text: {
                                        content: `**时间**\n${timeStr}`,
                                        tag: 'lark_md'
                                    }
                                },
                                {
                                    is_short: true,
                                    text: {
                                        content: `**服务**\n${config.name}`,
                                        tag: 'lark_md'
                                    }
                                }
                            ],
                            tag: 'div'
                        },
                        {
                            fields: [
                                {
                                    is_short: true,
                                    text: {
                                        content: `**公网IP**\n${config.publicIP || 'N/A'}`,
                                        tag: 'lark_md'
                                    }
                                },
                                {
                                    is_short: true,
                                    text: {
                                        content: `**内网IP**\n${config.privateIP || 'N/A'}`,
                                        tag: 'lark_md'
                                    }
                                }
                            ],
                            tag: 'div'
                        },
                        {
                            fields: [
                                {
                                    is_short: true,
                                    text: {
                                        content: `**Service**\n${service || 'N/A'}`,
                                        tag: 'lark_md'
                                    }
                                },
                                {
                                    is_short: true,
                                    text: {
                                        content: `**Service Instance**\n${serviceInstance || 'N/A'}`,
                                        tag: 'lark_md'
                                    }
                                },
                            ],
                            tag: 'div'
                        },
                        {
                            tag: 'div',
                            text: {
                                content: `过去 ${timeText} 内进程资源使用率:`,
                                tag: 'lark_md'
                            }
                        },
                        ...images,
                        {
                            tag: 'hr'
                        },
                        {
                            elements: [
                                {
                                    content: "[来自 pocket-apm](https://github.com/jayliang701/pocket-apm)",
                                    tag: 'lark_md'
                                }
                            ],
                            tag: 'note'
                        }
                    ]
                }
            };

            const report: LarkReport = {
                channel: 'lark',
                type: 'metric',
                title,
                createTime: now,
                message,
            };
            reports.push(report);
        }

        if (this.enableEmailChannel) {
            const images: string[] = [];  //base64 images
            for (let chart of charts) {
                const image = `data:image/png;base64,${chart.toString('base64')}`;
                images.push(image);
            }

            let body = [
                `时间: ${timeStr}`,
                `服务器别名: ${config.name || 'N/A'}`,
                `服务器(公网IP): ${config.publicIP || 'N/A'}`,
                `服务器(内网IP): ${config.privateIP || 'N/A'}`,
                `Service: ${service}`,
                `Service Instance: ${serviceInstance}`,
                ``,
                `过去 ${timeText} 内:`,
            ];

            let htmlBody = `
                <div>时间: ${timeStr}</div>
                <div>服务器别名: ${config.name || 'N/A'}</div>
                <div>服务器(公网IP): ${config.publicIP || 'N/A'}</div>
                <div>服务器(内网IP): ${config.privateIP || 'N/A'}</div>
                <div>Service: ${service}</div>
                <div>Service Instance: ${serviceInstance}</div>
                <br/>
                <div>过去 ${timeText} 内:</div>
            `;

            for (let pid in metricsDict) {
                const metrics = metricsDict[pid];
            
                const minMetric = metrics.min();
                const maxMetric = metrics.max();
                
                body.push(
                    `进程<${pid}> CPU 使用率: ${minMetric.cpu}% ~ ${maxMetric.cpu}%`,
                    `进程<${pid}> Memory 使用率: ${minMetric.memory} ~ ${maxMetric.memory} MB`,
                    `进程<${pid}> 存活时长: ${Math.round(metrics.max().aliveTime / 1000)} 秒`,
                    ``
                );
                
                htmlBody += `
                    <div>进程<${pid}> CPU 使用率: ${minMetric.cpu}% ~ ${maxMetric.cpu}%</div>
                    <div>进程<${pid}> Memory 使用率: ${minMetric.memory} ~ ${maxMetric.memory} MB</div>
                    <div>进程<${pid}> 存活时长: ${Math.round(metrics.max().aliveTime / 1000)} 秒</div>
                    <br/>
                `;
            }
            htmlBody += `
                ${images.map((image) => `<div><img src="${image}"/></div>`).join('<br/>')}
                <br/>
            `;
            const report: EmailReport = {
                channel: 'email',
                type: 'metric',
                title,
                createTime: now,
                plain: body.join('\n'),
                html: htmlBody,
            };
            reports.push(report);
        }

        return reports;
    }
}