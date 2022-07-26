import Monitor from "./Monitor";
import { SkywalkingConfig } from "../types";
import RPCServer from "./skywalking/RPCServer";
import ServiceHandler from "./skywalking/handler/ServiceHandler";
import JavaProcessMetricHandler from "./skywalking/handler/JavaProcessMetricHandler";
import fs from "fs/promises";
import path from "path";

export default class SkywalkingMonitor extends Monitor {

    get server(): RPCServer {
        return RPCServer.getSharedServer();
    }

    handlers: Record<string, ServiceHandler> = {};

    get skywalkingConfig(): SkywalkingConfig {
        return this.config?.skywalking;
    }

    protected setConfigDefaults() {
        this.skywalkingConfig.metricLogPath = this.skywalkingConfig.metricLogPath || path.resolve(process.cwd(), `.metric/${this.skywalkingConfig.service}`);
    }

    private registerServiceHandler(Cls: typeof ServiceHandler) {
        const { server, skywalkingConfig, handlers } = this;
        if (!server || !skywalkingConfig) return;

        const handler = new Cls();
        handler.refresh(skywalkingConfig);
        handlers[handler.serviceName] = handler;
        handler.process = handler.process.bind(handler);
        this.server.on(handler.serviceName, handler.process);
    }

    private unRegisterServiceHandlers() {
        for (let key in this.handlers) {
            const handler = this.handlers[key];
            this.server.off(handler.serviceName, handler.process);
        }
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

}
