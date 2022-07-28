
import AppProcess from './AppProcess';
import RPCServer from './monitor/skywalking/RPCServer';
import { Config, ProcessConfigReloadData, RPCServiceEventPayload, SkywalkingServerConfig } from './types';
import ConfigedWorkerManager from './utils/ConfigedWorkerManager';

export default class App extends ConfigedWorkerManager<Config, AppProcess> {

    private appMapping: Record<string, string> = {};
    private skywalkingAppMapping: Record<string, string> = {};

    private getAppProcessByApp(name: string): AppProcess | undefined {
        if (this.appMapping[name]) {
            const app = this.workers[this.appMapping[name]];
            return app;
        }
        return undefined;
    }

    private getAppProcessBySkywalkingApp(name: string): AppProcess | undefined {
        if (this.skywalkingAppMapping[name]) {
            const app = this.workers[this.skywalkingAppMapping[name]];
            return app;
        }
        return undefined;
    }

    private removeMapping(id: string) {
        for (let name in this.appMapping) {
            if (this.appMapping[name] === id) {
                delete this.appMapping[name];
                break;
            }
        }
        for (let name in this.skywalkingAppMapping) {
            if (this.skywalkingAppMapping[name] === id) {
                delete this.skywalkingAppMapping[name];
                break;
            }
        }
    }

    constructor(configFile: string) {
        super(configFile);
        this.onRPCService = this.onRPCService.bind(this);
        this.onAppConfigReload = this.onAppConfigReload.bind(this);
    }

    private async startServer(skywalkingServerConfig: SkywalkingServerConfig) {
        let server = RPCServer.getSharedServer();
        if (!server) {
            server = RPCServer.create();
            server.on('service', this.onRPCService);
        }
        await server.run(skywalkingServerConfig);
    }
    
    private async stopServer() {
        const server = RPCServer.getSharedServer();
        if (server) {
            server.off('service', this.onRPCService);
            await server.shutdown();
        }
    }

    private async onRPCService(payload: RPCServiceEventPayload) {
        const { app } = payload;
        if (app) {
            const appProcess = this.getAppProcessBySkywalkingApp(app);
            if (appProcess) {
                appProcess.processRPCService(payload);
            }
        }
    }

    protected override async afterReload() {
        const { apps = [], skywalking } = this.config;

        if (skywalking) {
            await this.startServer(skywalking);
        } else {
            await this.stopServer();
        }

        const newHash: Record<string, any> = {};
        apps.forEach(appConfigFile => {
            newHash[appConfigFile] = true;
        });
        
        const remains: AppProcess[] = [];
        const removes: AppProcess[] = [];
        const newWorkers: AppProcess[] = [];

        for (let workerId in this.workers) {
            const worker = this.workers[workerId];
            if (newHash[worker.id]) {
                remains.push(worker);
                delete newHash[worker.id];
            } else {
                removes.push(worker);
                this.removeMapping(workerId);
            }
        }

        //setup new workers
        for (let appConfigFile in newHash) {
            const worker = new AppProcess(appConfigFile);
            worker.on(AppProcess.EVENT_APP_CONFIG_RELOAD, this.onAppConfigReload);
            newWorkers.push(worker);
        }

        await this.processWorkers(removes, remains, newWorkers);
    }

    private async onAppConfigReload(payload: ProcessConfigReloadData) {
        const { app, skywalkingApp, configFile } = payload;
        this.appMapping[app] = configFile;
        this.skywalkingAppMapping[skywalkingApp] = configFile;
    }
}