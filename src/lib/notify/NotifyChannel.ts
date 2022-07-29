import { Config, Report } from "../types";

export default class NotifyChannel<T extends Report = Report> {

    get enabled(): boolean {
        throw new Error('enabled getter should be overrided.')
    }

    protected config: Config;

    async reload(config: Config): Promise<void> {
        this.config = config;
        await this.afterReload();
    }

    protected async afterReload() {

    }

    async process(report: T) {
        
    }
}
