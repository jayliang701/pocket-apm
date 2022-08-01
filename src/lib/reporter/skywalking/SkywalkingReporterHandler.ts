import { SkywalkingConfig } from "../../types";
import Reporter from "../Reporter";

export default class SkywalkingReporterHandler extends Reporter {

    protected get skywalkingConfig(): SkywalkingConfig {
        return this.config?.skywalking;
    }

    async process(...args: any[]) {
        throw new Error('process method should be overrided.');
    }
}