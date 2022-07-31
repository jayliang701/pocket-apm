
import envVars from '../envVars';
import AppProcess from './AppProcess';
import RPCServer from './monitor/skywalking/RPCServer';
import Notify from './notify/Notify';
import Lark from './platform/Lark';
import Platform from './platform/Platform';
import { Config, IMainProcess, MainProcessMessages, ProcessConfigReloadData, ProcessInvokePlatformData, ProcessReportData, RPCServiceEventPayload, SkywalkingServerConfig } from './types';
import ConfigedWorkerManager from './utils/ConfigedWorkerManager';

export default class MainProcess extends ConfigedWorkerManager<Config, AppProcess> implements IMainProcess {

    private notify: Notify = new Notify();

    private platforms: Record<string, Platform> = {
        lark: new Lark(this),
    };

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
    }

    broadcast(event: keyof MainProcessMessages, data: any): void {
        for (let workerId in this.workers) {
            const worker = this.workers[workerId];
            worker.send(event, data);
        }
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

    onRPCService = async (payload: RPCServiceEventPayload) => {
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

        await this.notify.reload(this.config);

        for (let platformKey in this.platforms) {
            await this.platforms[platformKey].reload(this.config);
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
                worker.removeAllListeners('app_config_reload');
                worker.removeAllListeners('request_main_config');
                worker.removeAllListeners('report');
                worker.removeAllListeners('invoke_platform');
                this.removeMapping(workerId);
            }
        }

        //setup new workers
        for (let appConfigFile in newHash) {
            const worker = new AppProcess(appConfigFile);
            worker.on('app_config_reload', this.onAppConfigReload);
            worker.on('request_main_config', this.onRequestMainConfig);
            worker.on('request_env_vars', this.onRequestEnvVarsSync);
            worker.on('report', this.onReport);
            worker.on('invoke_platform', this.onInvokePlatform);
            newWorkers.push(worker);
        }

        await this.processWorkers(removes, remains, newWorkers);
    }

    private async syncMainConfig(appProcess: AppProcess) {
        return appProcess.send('sync_main_config', {
            config: {...this.config},
        });
    }

    private async syncEnvVars(appProcess: AppProcess) {
        return appProcess.send('sync_env_vars', {
            vars: envVars.toVars(),
        });
    }

    onAppConfigReload = async (payload: ProcessConfigReloadData) => {
        const { app, skywalkingApp, configFile } = payload;
        this.appMapping[app] = configFile;
        this.skywalkingAppMapping[skywalkingApp] = configFile;
    }

    onRequestMainConfig = async (appProcess: AppProcess) => {
        await this.syncMainConfig(appProcess);
    }

    onRequestEnvVarsSync = async (appProcess: AppProcess) => {
        await this.syncEnvVars(appProcess);
    }

    onReport = async (data: ProcessReportData) => {
        this.notify.process(data.report);
    }

    onInvokePlatform = async (appProcess: AppProcess, data: ProcessInvokePlatformData) => {
        const platform = this.platforms[data.platform];
        if (platform) {
            const func = platform[data.method];
            if (func) {
                const args: any[] = data.args ? JSON.parse(data.args) : [];
                try {
                    const res = await func.apply(platform, args);
                    if (data.callback) appProcess.send(data.callback as any, res);
                } catch (err) {
                    console.error(`invoke platform <${data.platform}> error ---> `, err);
                }
            }
        }
    }
}