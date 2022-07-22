import Monitor from "./Monitor";
import { SkywalkingConfig } from "../types";
import RPCServer from "./skywalking/RPCServer";
import ServiceHandler from "./skywalking/handler/ServiceHandler";
import ProcessMetricHandler from "./skywalking/handler/JavaProcessMetricHandler";

export default class SkywalkingMonitor extends Monitor {

    server: RPCServer;

    handlers: Record<string, ServiceHandler> = {};

    get skywalkingConfig(): SkywalkingConfig {
        return this.config?.skywalking;
    }

    private registerServiceHandler(Cls: typeof ServiceHandler) {
        if (!this.server) return;

        const handler = new Cls();
        this.handlers[handler.serviceName] = handler;
        handler.process = handler.process.bind(handler);
        this.server.on(handler.serviceName, handler.process);
    }

    private async startServer() {
        if (this.server) {
            console.warn('RPC server is already running.');
            return;
        }
        this.server = new RPCServer();
        
        this.registerServiceHandler(ProcessMetricHandler);

        await this.server.run(this.skywalkingConfig);
    }

    private async stopServer() {
        for (let serviceName in this.handlers) {
            const handler = this.handlers[serviceName];
            this.server && this.server.off(serviceName, handler.process);
            handler.dispose();
        }
        this.handlers = {};
        
        if (this.server) {
            await this.server.shutdown();
        }
        this.server = undefined;
    }

    // private async refreshRPCServices() {
    //     if (!this.server) return;

        
    // }

    override async start() {
        await this.refresh();
    }

    override async refresh() {
        if (this.server) {
            await this.server.run(this.skywalkingConfig);
        } else {
            await this.startServer();
        }
    }

    override async dispose() {
        await super.dispose();
        await this.stopServer();
    }

}
