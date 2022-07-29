// import MainProcess from "../MainProcess";
import type { ChannelType, Config, Report } from "../types";
import EmailChannel from "./EmailChannel";
import LarkChannel from "./LarkChannel";
import NotifyChannel from "./NotifyChannel";

export default class Notify {

    // private mainProcess: MainProcess;

    // get config(): Config {
    //     return this.mainProcess?.getConfig();
    // }

    // constructor(mainProcess: MainProcess) {
    //     this.mainProcess = mainProcess;
    // }

    protected readonly channels: Record<ChannelType, NotifyChannel> = {
        email: new EmailChannel(),
        lark: new LarkChannel(),
    };

    async reload(config: Config) {
        const { notify } = config;
        for (let key in notify) {
            const channel: NotifyChannel = this.channels[key];
            if (channel) {
                await channel.reload(config);
            }
        }
    }

    async process(report: Report) {
        const channel: NotifyChannel = this.channels[report.channel];
        if (channel && channel.enabled) {
            channel.process(report).catch(err => {
                console.error(`notify channel <${report.channel}> process fail ---> `, err);
            });
        }
    }

}
