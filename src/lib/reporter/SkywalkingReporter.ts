import Reporter from "./Reporter";
import { IMonitor } from "../monitor/Monitor";
import JVMMetricReporter from "./skywalking/JVMMetricReporterHandler";
import SkywalkingReporterHandler from "./skywalking/SkywalkingReporterHandler";
import ProcessloggingReporterHandler from "./skywalking/ProcessLoggingReporterHandler";

export default class SkywalkingReporter extends Reporter {

    private handlers: Record<string, SkywalkingReporterHandler> = {};

    constructor(monitor: IMonitor) {
        super(monitor);
        this.init();
    }
    
    protected init() {
        this.handlers = {
            'JVMMetricReportService': new JVMMetricReporter(this.monitor),
            'LogReportService': new ProcessloggingReporterHandler(this.monitor),
        };
    }

    async process(service: string, ...args: any[]) {
        // this.sendReports(this.buildReports(watcherId, alerts));
        const handler = this.handlers[service];
        if (handler) {
            await handler.process.apply(handler, args);
        }
    }

    override async refresh() {
        for (let key in this.handlers) {
            await this.handlers[key].refresh();
        }
    }

    override async dispose() {
        for (let key in this.handlers) {
            await this.handlers[key].dispose();
        }
    }
}