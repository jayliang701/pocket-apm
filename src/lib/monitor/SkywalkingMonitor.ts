import Monitor from "./Monitor";
import { RPCServiceEventPayload, SkywalkingConfig } from "../types";
import ServiceHandler from "./skywalking/handler/ServiceHandler";
import JavaProcessMetricHandler from "./skywalking/handler/JavaProcessMetricHandler";
import fs from "fs/promises";
import path from "path";
import AppNode from "./AppNode";

export default class SkywalkingMonitor extends Monitor {

    handlers: Record<string, ServiceHandler> = {};

    get skywalkingConfig(): SkywalkingConfig {
        return this.config?.skywalking;
    }

    constructor(appNode: AppNode, id?:string) {
        super(appNode, id);
        this.onRPCService = this.onRPCService.bind(this);
    }

    protected setConfigDefaults() {
        this.skywalkingConfig.metricLogPath = this.skywalkingConfig.metricLogPath || path.resolve(process.cwd(), `.metric/${this.skywalkingConfig.service}`);
    }

    private registerServiceHandler(Cls: typeof ServiceHandler) {
        const { skywalkingConfig, handlers } = this;
        if (!skywalkingConfig) return;

        process.on('message', this.onRPCService);

        const handler = new Cls();
        handler.process = handler.process.bind(handler);
        handler.refresh(skywalkingConfig);
        handlers[handler.service] = handler;
    }

    private unRegisterServiceHandlers() {
        process.off('message', this.onRPCService);
        this.handlers = {};
    }

    override async start() {
        await this.refresh();
    }

    override async refresh() {
        this.setConfigDefaults();

        await fs.mkdir(this.skywalkingConfig.metricLogPath, { recursive: true });

        this.unRegisterServiceHandlers();
        this.registerServiceHandler(JavaProcessMetricHandler);
    }

    async dispose() {
        this.unRegisterServiceHandlers();
        await super.dispose();
    }

    private async onRPCService({ service, method, request }: RPCServiceEventPayload) {
        const handler = this.handlers[service];
        if (!handler) return;

        handler.process({ method, request });
    }

}
