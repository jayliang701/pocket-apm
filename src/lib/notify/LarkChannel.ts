import { LarkReport } from "../types";
import NotifyChannel from "./NotifyChannel";

export default class LarkChannel extends NotifyChannel<LarkReport> {

    get enabled(): boolean {
        return !!(this.config.notify.lark?.webhook);
    }
    
    protected override async afterReload() {
        const { notify } = this.config;
        
    }

    async process(report: LarkReport) {
    }

}
