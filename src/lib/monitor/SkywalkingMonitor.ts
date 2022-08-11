import Monitor from "./Monitor";
import { RPCServiceEventPayload, SkywalkingConfig } from "../types";
import ServiceHandler from "./skywalking/handler/ServiceHandler";
import JavaProcessMetricHandler from "./skywalking/handler/JavaProcessMetricHandler";
import fs from "fs/promises";
import JavaProcessLoggingHandler from "./skywalking/handler/JavaProcessLoggingHandler";
import SkywalkingReporter from "../reporter/SkywalkingReporter";
import { setDefaultSkywalkingConfig } from "../../consts";
import NodeJSMetricHandler from "./skywalking/handler/NodeJSMetricHandler";

export default class SkywalkingMonitor extends Monitor {

    handlers: Record<string, ServiceHandler> = {};

    get skywalkingConfig(): SkywalkingConfig {
        return this.config?.skywalking;
    }

    private reporter: SkywalkingReporter = new SkywalkingReporter(this);

    protected setConfigDefaults() {
        setDefaultSkywalkingConfig(this.skywalkingConfig);
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

        await this.reporter.refresh();

        this.registerServiceHandler(JavaProcessMetricHandler);
        this.registerServiceHandler(NodeJSMetricHandler);
        if (this.skywalkingConfig.log) {
            this.registerServiceHandler(JavaProcessLoggingHandler);
        }

        await super.refresh();
    }

    async dispose() {
        process.off('message', this.onRPCService);
        this.unRegisterServiceHandlers();
        await this.reporter.dispose();
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
