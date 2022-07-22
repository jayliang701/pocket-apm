import { Worker } from "../types";
import ConfigWatcher from './ConfigWatcher';

export default abstract class ConfigedWorkerManager<T, W extends Worker> extends ConfigWatcher<T> implements Worker {

    async refresh() {
        throw new Error("Method not implemented.");
    }

    get id(): string {
        return this.configFile;
    }

    protected workers: Record<string, W> = {};

    protected async processWorkers(removes: W[], remains: W[], newWorkers: W[]) {
        for (let worker of removes) {
            await worker.dispose();
            delete this.workers[worker.id];
            console.log('remove worker --> ', worker.id);
        }

        for (let worker of remains) {
            await worker.refresh();
            console.log('refresh worker --> ', worker.id);
        }

        //setup new monitors
        for (let worker of newWorkers) {
            this.workers[worker.id] = worker;
            console.log('add new worker --> ', worker.id);
            await worker.start();
        }
    }

}


