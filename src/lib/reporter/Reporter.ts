import type { IMonitor } from "../monitor/Monitor";
import type { AppConfig, Config, Report } from "../types";

export default abstract class Reporter {

    protected monitor: IMonitor;

    protected get config(): AppConfig {
        return this.monitor?.config;
    }

    protected get mainConfig(): Config {
        return this.monitor?.mainConfig;
    }

    protected get enableEmailChannel(): boolean {
        return !!(this.mainConfig?.notify?.email);
    }

    protected get enableLarkChannel(): boolean {
        return !!(this.mainConfig?.notify?.lark?.webhook);
    }

    constructor(monitor: IMonitor) {
        this.monitor = monitor;
    }

    protected sendReport(report: Report) {
        process.send({ 
            event: 'report', 
            data: { 
                app: this.config.name, 
                report,
            } 
        });
    }

    protected sendReports(reports: Report[]) {
        for (const report of reports) {
            this.sendReport(report);
        }
    }

}

