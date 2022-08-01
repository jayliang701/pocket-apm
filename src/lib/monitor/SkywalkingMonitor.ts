import Monitor from "./Monitor";
import { RPCServiceEventPayload, SkywalkingConfig } from "../types";
import ServiceHandler from "./skywalking/handler/ServiceHandler";
import JavaProcessMetricHandler from "./skywalking/handler/JavaProcessMetricHandler";
import fs from "fs/promises";
import path from "path";
import JavaProcessLoggingHandler from "./skywalking/handler/JavaProcessLoggingHandler";
import SkywalkingReporter from "../reporter/SkywalkingReporter";

export default class SkywalkingMonitor extends Monitor {

    handlers: Record<string, ServiceHandler> = {};

    get skywalkingConfig(): SkywalkingConfig {
        return this.config?.skywalking;
    }

    private reporter: SkywalkingReporter = new SkywalkingReporter(this);

    protected setConfigDefaults() {
        let { warn } = this.skywalkingConfig;
        if (warn) {
            if (!warn.timeLimit) warn.timeLimit = { durationMinutes: 0 };
            warn.timeLimit.durationMinutes = warn.timeLimit.durationMinutes || 5;
        }
        this.skywalkingConfig.metricLogPath = this.skywalkingConfig.metricLogPath || path.resolve(process.cwd(), `.metric/${this.skywalkingConfig.service}`);
    }

    private registerServiceHandler(Cls: typeof ServiceHandler) {
        const { skywalkingConfig, handlers } = this;
        if (!skywalkingConfig) return;

        const handler = new Cls();
        handler.process = handler.process.bind(handler);
        handler.on('update', this.onHandlerUpdate);
        handler.refresh(skywalkingConfig);
        handlers[handler.service] = handler;
    }

    private unRegisterServiceHandlers() {
        for (let key in this.handlers) {
            this.handlers[key].removeAllListeners('update');
            this.handlers[key].dispose();
        }
        this.handlers = {};
    }

    override async start() {
        process.on('message', this.onRPCService);
        await this.refresh();
    }

    override async refresh() {
        this.setConfigDefaults();

        await fs.mkdir(this.skywalkingConfig.metricLogPath, { recursive: true });

        this.unRegisterServiceHandlers();

        this.registerServiceHandler(JavaProcessMetricHandler);
        if (this.skywalkingConfig.log) {
            this.registerServiceHandler(JavaProcessLoggingHandler);
        }
    }

    async dispose() {
        process.off('message', this.onRPCService);
        this.unRegisterServiceHandlers();
        await super.dispose();
    }

    private onRPCService = async ({ service, method, request }: RPCServiceEventPayload) => {
        const handler = this.handlers[service];
        if (!handler) return;

        handler.process({ method, request });
    }

    private onHandlerUpdate = async (service: string, ...args: any[]) => {
        this.reporter.process.apply(this.reporter, [ service ].concat(args));
    }

}
