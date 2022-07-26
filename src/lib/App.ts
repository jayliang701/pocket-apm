
import AppNode from './monitor/AppNode';
import RPCServer from './monitor/skywalking/RPCServer';
import { Config, SkywalkingServerConfig } from './types';
import ConfigedWorkerManager from './utils/ConfigedWorkerManager';

const startServer = async (skywalkingServerConfig: SkywalkingServerConfig) => {
    let server = RPCServer.getSharedServer();
    if (!server) {
        server = RPCServer.create();
    }
    await server.run(skywalkingServerConfig);
}

const stopServer = async () => {
    const server = RPCServer.getSharedServer();
    if (server) {
        await server.shutdown();
    }
}

export default class App extends ConfigedWorkerManager<Config, AppNode> {

    protected override async afterReload() {
        const { apps = [], skywalking } = this.config;

        if (skywalking) {
            await startServer(skywalking);
        } else {
            await stopServer();
        }

        const newHash: Record<string, any> = {};
        apps.forEach(appConfigFile => {
            newHash[appConfigFile] = true;
        });
        
        const remains: AppNode[] = [];
        const removes: AppNode[] = [];
        const newWorkers: AppNode[] = [];

        for (let workerId in this.workers) {
            const worker = this.workers[workerId];
            if (newHash[worker.id]) {
                remains.push(worker);
                delete newHash[worker.id];
            } else {
                removes.push(worker);
            }
        }

        //setup new workers
        for (let appConfigFile in newHash) {
            const worker = new AppNode(appConfigFile);
            newWorkers.push(worker);
        }

        await this.processWorkers(removes, remains, newWorkers);
    }
}