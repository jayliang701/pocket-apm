
import AppNode from './monitor/AppNode';
import { Config } from './types';
import ConfigedWorkerManager from './utils/ConfigedWorkerManager';

export default class App extends ConfigedWorkerManager<Config, AppNode> {

    protected override async afterReload() {
        const apps = this.config.apps || [];

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

        this.processWorkers(removes, remains, newWorkers);
    }
}