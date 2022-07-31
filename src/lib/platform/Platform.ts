import { Config, IMainProcess } from "../types";


export default abstract class Platform {

    get enabled(): boolean {
        throw new Error('enabled getter should be overrided.');
    }

    async reload(config: Config) {

    }

    protected mainProcess: IMainProcess;

    constructor(mainProcess: IMainProcess) {
        this.mainProcess = mainProcess;
    }

}
