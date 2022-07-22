import ServiceHandler from "./ServiceHandler";

type ProcessMetric = {
    time: number;
    cpu: {
        usagePercent: number;
    }
};

type ProcessMetricData = {
    metrics: ProcessMetric[];
};

type CPUMetric = {
    value: number;
    time: number;
};

export default class JavaProcessMetricHandler extends ServiceHandler {

    get serviceName(): string {
        return 'JVMMetricReportService';
    }
    
    cpus: CPUMetric[] = [];

    collect({ metrics }: ProcessMetricData): void {
        metrics.forEach(({ time, cpu }) => {
            this.cpus.push({ value: cpu.usagePercent, time: Number(time) });
            console.log('cpu usage ----> ', cpu.usagePercent);
        });
    }

}
