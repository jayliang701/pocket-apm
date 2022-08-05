import dayjs from "dayjs";
import { EmailReport, JVMMetric, JVMMetricValues, LarkMessage, LarkReport, MetricUpdate, Report } from "../../types";
import { METRIC_LOG_LINE_LEN, METRIC_MEMORY_VALUE_LEN, METRIC_PECT_VALUE_LEN, METRIC_THREAD_COUNT_VALUE_LEN, MINUTE, TIMESTAMP_LEN } from "../../../consts";
import { createStream } from '../../utils/readlines';
import { IMonitor } from "../../monitor/Monitor";
import { uploadImage } from "../../platform/Lark";
import SkywalkingReporterHandler from "./SkywalkingReporterHandler";
import Throttle from "../../utils/Throttle";

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

const genCharts = async (metrics: JVMMetric[]): Promise<Buffer[]> => {
    // metrics = [ { "label":"CPU", "value": 29.30845818617146, "time": 1657779694421 }, ... ]

    const charts: Buffer[] = [];
    
    const cpus = [];
    const heapMemory = [];
    const nonHeapMemory = [];
    const nonDaemonThread = [];
    const daemonThread = [];
    const blockedThread = [];
    const labels = [];

    metrics.forEach(m => {
        labels.push(dayjs(Number(m.time)).format('HH:mm'));
        cpus.push(m.values.cpu);
        heapMemory.push(m.values.heapMemory);
        nonHeapMemory.push(m.values.nonHeapMemory);
        nonDaemonThread.push(Math.round(m.values.liveThread - m.values.daemonThread));
        daemonThread.push(m.values.daemonThread);
        blockedThread.push(m.values.blockedThread);
    });
    
    charts.push(await buildChart(labels, [
        { 
            label: 'CPU 使用率', 
            data: cpus,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgb(54, 162, 235)',
        }
    ], {
        legend: {
            position: 'bottom',
        },
        title: {
            display: true,
            text: '进程 CPU 使用率 (%)',
        },
    }));
    charts.push(await buildChart(labels, [
        { 
            label: 'Heap Memory', 
            data: heapMemory,
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgb(75, 192, 192)',
        },
        { 
            label: 'Non-Heap Memory', 
            data: nonHeapMemory,
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgb(255, 99, 132)', 
        }
    ], {
        legend: {
            position: 'bottom',
        },
        title: {
            display: true,
            text: '进程内存使用率 (MB)',
        },
    }));
    charts.push(await buildChart(labels, [
        { 
            label: '非daemon线程', 
            data: nonDaemonThread,
            backgroundColor: 'rgb(255, 99, 132)',
            borderColor: 'rgb(255, 99, 132)',
            fill: false,
        },
        { 
            label: 'daemon线程', 
            data: daemonThread,
            backgroundColor: 'rgb(54, 162, 235)',
            borderColor: 'rgb(54, 162, 235)',
            fill: false,
        },
        { 
            label: 'blocked线程', 
            data: blockedThread,
            backgroundColor: 'rgb(255, 205, 86)',
            borderColor: 'rgb(255, 205, 86)',
            fill: false,
        }
    ], {
        legend: {
            position: 'bottom',
        },
        title: {
            display: true,
            text: '存活线程统计 (个)',
        },
    }));

    return charts;
}

const parseMetricFromLog = (line: Buffer | string): JVMMetric => {
    const metric = {
        time: 0,
        values: {
            cpu: 0,
            heapMemory: 0,
            nonHeapMemory: 0,
            liveThread: 0,
            daemonThread: 0,
            blockedThread: 0,
        },
    };
    try {
        let str = typeof line === 'string' ? line : line.toString('utf8');
        let start = 0;
        metric.time = Number(str.substring(start, start + TIMESTAMP_LEN));
        start += TIMESTAMP_LEN + 1;
        metric.values.cpu = Number(str.substring(start, start + METRIC_PECT_VALUE_LEN));
        start += METRIC_PECT_VALUE_LEN + 1;
        metric.values.heapMemory = Number(str.substring(start, start + METRIC_MEMORY_VALUE_LEN));
        start += METRIC_MEMORY_VALUE_LEN + 1;
        metric.values.nonHeapMemory = Number(str.substring(start, start + METRIC_MEMORY_VALUE_LEN));
        start += METRIC_MEMORY_VALUE_LEN + 1;
        metric.values.liveThread = Number(str.substring(start, start + METRIC_THREAD_COUNT_VALUE_LEN));
        start += METRIC_THREAD_COUNT_VALUE_LEN + 1;
        metric.values.daemonThread = Number(str.substring(start, start + METRIC_THREAD_COUNT_VALUE_LEN));
        start += METRIC_THREAD_COUNT_VALUE_LEN + 1;
        metric.values.blockedThread = Number(str.substring(start, start + METRIC_THREAD_COUNT_VALUE_LEN));
        start += METRIC_THREAD_COUNT_VALUE_LEN + 1;
    } catch (err) {
        console.warn('parse metric error ---> ', err);
    }
    return metric;
}

const readFileFromEnd = async (file: string, lineNum: number, map?: (metric: JVMMetric) => void): Promise<ProcessMetrics> => {
    return new Promise((resolve, reject) => {
        let num = 0;
        let prevTime = 0;
        let min = 60 * 1000;
        const metrics: ProcessMetrics = new ProcessMetrics();
        const stream = createStream(file, { encoding: 'utf8' });
        const dispose = () => {
            stream.removeAllListeners('data');
            stream.removeAllListeners('close');
            stream.removeAllListeners('error');
        }
        stream.on('data', (line: string) => {
            if (line.length !== METRIC_LOG_LINE_LEN - 1) {
                return;
            }
            num ++;
            const metric = parseMetricFromLog(line);
            if (prevTime === 0 || (prevTime - metric.time) === min) {
                prevTime = metric.time;
                metrics.add(metric);
                if (map) map(metric);
            }

            if (num >= lineNum) {
                dispose();
                try {
                    stream.destroy();
                } catch (err) {
                    console.error(err);
                }
                resolve(metrics);
            }
        });
        stream.on('error', (err) => {
            console.error('read file error ---> ', err);
            dispose();
            reject(err);
        });
        stream.on('close', () => {
            dispose();
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

type JVMMetricValuesExt = {
    nonDaemonThread: number;
} & JVMMetricValues;

class ProcessMetrics {

    private metrics: JVMMetric[] = [];

    private aggregateMetric: JVMMetricValues = {
        cpu: 0,
        heapMemory: 0,
        nonHeapMemory: 0,
        liveThread: 0,
        daemonThread: 0,
        blockedThread: 0,
    }

    private maxMetric: JVMMetricValuesExt = {
        cpu: 0,
        heapMemory: 0,
        nonHeapMemory: 0,
        liveThread: 0,
        nonDaemonThread: 0,
        daemonThread: 0,
        blockedThread: 0,
    }

    private minMetric: JVMMetricValuesExt = {
        cpu: 0,
        heapMemory: 0,
        nonHeapMemory: 0,
        liveThread: 0,
        nonDaemonThread: 0,
        daemonThread: 0,
        blockedThread: 0,
    }

    get length() {
        return this.metrics.length;
    }

    add(metric: JVMMetric) {
        this.metrics.push(metric);
        this.aggregateMetric.cpu += metric.values.cpu;
        this.aggregateMetric.heapMemory += metric.values.heapMemory;
        this.aggregateMetric.nonHeapMemory += metric.values.nonHeapMemory;
        this.aggregateMetric.liveThread += metric.values.liveThread;
        this.aggregateMetric.daemonThread += metric.values.daemonThread;
        this.aggregateMetric.blockedThread += metric.values.blockedThread;

        this.maxMetric.cpu = Math.max(this.maxMetric.cpu, metric.values.cpu);
        this.maxMetric.heapMemory = Math.max(this.maxMetric.heapMemory, metric.values.heapMemory);
        this.maxMetric.nonHeapMemory = Math.max(this.maxMetric.nonHeapMemory, metric.values.nonHeapMemory);
        this.maxMetric.liveThread = Math.max(this.maxMetric.liveThread, metric.values.liveThread);
        this.maxMetric.nonDaemonThread = Math.max(this.maxMetric.liveThread - this.maxMetric.daemonThread, metric.values.liveThread - metric.values.daemonThread);
        this.maxMetric.daemonThread = Math.max(this.maxMetric.daemonThread, metric.values.daemonThread);
        this.maxMetric.blockedThread = Math.max(this.maxMetric.blockedThread, metric.values.blockedThread);

        this.minMetric.cpu = Math.min(this.minMetric.cpu, metric.values.cpu);
        this.minMetric.heapMemory = Math.min(this.minMetric.heapMemory, metric.values.heapMemory);
        this.minMetric.nonHeapMemory = Math.min(this.minMetric.nonHeapMemory, metric.values.nonHeapMemory);
        this.minMetric.liveThread = Math.min(this.minMetric.liveThread, metric.values.liveThread);
        this.minMetric.nonDaemonThread = Math.min(this.minMetric.liveThread - this.minMetric.daemonThread, metric.values.liveThread - metric.values.daemonThread);
        this.minMetric.daemonThread = Math.min(this.minMetric.daemonThread, metric.values.daemonThread);
        this.minMetric.blockedThread = Math.min(this.minMetric.blockedThread, metric.values.blockedThread);
    }

    avg(): JVMMetricValues {
        const metric: JVMMetricValues = {
            cpu: this.aggregateMetric.cpu / this.metrics.length,
            heapMemory: Math.round(this.aggregateMetric.heapMemory / this.metrics.length),
            nonHeapMemory: Math.round(this.aggregateMetric.nonHeapMemory / this.metrics.length),
            liveThread: Math.round(this.aggregateMetric.liveThread / this.metrics.length),
            daemonThread: Math.round(this.aggregateMetric.daemonThread / this.metrics.length),
            blockedThread: Math.round(this.aggregateMetric.blockedThread / this.metrics.length),
        }
        return metric;
    }

    min(): JVMMetricValuesExt {
        return this.minMetric;
    }

    max(): JVMMetricValuesExt {
        return this.maxMetric;
    }

    toArray(filterDuplicated?: boolean): JVMMetric[] {
        const list: JVMMetric[] = [];
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

export default class JVMMetricReporterHandler extends SkywalkingReporterHandler {

    private lastProcessTime: number = 0;

    private throttle: Throttle = new Throttle();

    constructor(monitor: IMonitor) {
        super(monitor);
        this.init();
    }

    private init() {
        this.refreshThrottle();
        //debug
        setTimeout(() => {
            this.process({
                service: 'demo1',
                serviceInstance: 'aebd8e55ca1640928c6d61ee469ee299@192.168.0.139',
                metricLog: 'F:\\projects\\library\\pocket-apm\\.metric\\demo1\\aebd8e55ca1640928c6d61ee469ee299_192.168.0.139-jvm.log',
                // metricLog: '/Users/jay/Documents/projects/library/pocket-apm/.metric/demo1/111.log',
                timeRange: [ 1659677160000, 1659677400000 ],
            });
        }, 2000);
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

        const metrics: ProcessMetrics = await readFileFromEnd(data.metricLog, durationMinutes);
        if (metrics.length >= durationMinutes) {
            const avgMetric = metrics.avg();
            if (warn.jvm.cpu !== undefined && avgMetric.cpu >= warn.jvm.cpu) {
                const reports = await this.buildWarnReports(data, 15);
                await this.sendReports(reports);
            }
        }
    }

    private async buildWarnReports({ metricLog, service, serviceInstance }: MetricUpdate, mins: number): Promise<Report[]> {

        const metrics: ProcessMetrics = await readFileFromEnd(metricLog, mins);
        const minMetric = metrics.min();
        const maxMetric = metrics.max();

        let charts: Buffer[] = [];
        try  {
            charts = await genCharts(metrics.toArray(true));
        } catch (err) {
            console.error(err);
        }

        const { config } = this;

        const reports: Report[] = [];

        const now = Date.now();
        const timeStr = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');
        const title = `JVM进程资源异常报警 <${config.name}>`;

        if (this.enableLarkChannel) {

            const images: any[] = [];
            for (let chart of charts) {
                const imageKey = await uploadImage(chart);
                images.push({
                    tag: 'img',
                    alt: {
                        content: '进程资源使用情况',
                        tag: 'lark_md'
                    },
                    mode: 'fit_horizontal',
                    img_key: imageKey,
                });
            }

            if (images.length < 1) {
                images.push({
                    tag: 'div',
                    fields: [
                        {
                            text: {
                                content: '[ERROR] 图表图片无法展示',
                                tag: 'lark_md'
                            }
                        },
                    ]
                });
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
                `过去 ${mins} 分钟内:`,
                `进程 CPU 使用率: ${minMetric.cpu}% ~ ${maxMetric.cpu}%`,
                `进程 Heap Memory 使用率: ${minMetric.heapMemory} ~ ${maxMetric.heapMemory} MB`,
                `进程 Non-Heap Memory 使用率: ${minMetric.nonHeapMemory}% ~ ${maxMetric.nonHeapMemory} MB`,
                `存活 非daemon 线程数: ${minMetric.daemonThread} ~ ${maxMetric.nonHeapMemory}`,
                `存活 daemon 线程数: ${minMetric.nonDaemonThread} ~ ${maxMetric.nonDaemonThread}`,
                `Blocked 线程数: ${minMetric.blockedThread} ~ ${maxMetric.blockedThread}`,
                ``,
            ];
            let htmlBody = `
                <div>时间: ${timeStr}</div>
                <div>服务器别名: ${config.name || 'N/A'}</div>
                <div>服务器(公网IP): ${config.publicIP || 'N/A'}</div>
                <div>服务器(内网IP): ${config.privateIP || 'N/A'}</div>
                <div>Service: ${service}</div>
                <div>Service Instance: ${serviceInstance}</div>
                <br/>
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