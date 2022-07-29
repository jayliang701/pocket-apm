import dayjs from "dayjs";
import { EmailReport, Log } from "../types";
import Reporter from "./Reporter";

export default class LogReporter extends Reporter {

    async process(watcherId: string, alerts: Log[]) {
        if (this.enableEmailChannel) {
            this.sendEmailReport(this.buildEmailReport(watcherId, alerts));
        }
    }

    private buildEmailReport(watcherId: string, alerts: Log[]): EmailReport {
        const { config } = this;

        const timeStr = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');

        let txtLogs: string[] = [];
        let htmlLogs: string[] = [];
        let i = 0;
        for (let log of alerts) {
            txtLogs.push(log.lines.join('\n'));
            htmlLogs.push(`<pre style="background: #eeeeee; padding: 12px;"><code>${log.lines.join('<br/>')}</code></pre>`);
            i ++;
            if (i >= (config.log.throttle.maxLogsPerAlert - 1)) {
                break;
            }
        }

        let body = [
            `时间: ${timeStr}`,
            `服务器别名: ${config.name || 'N/A'}`,
            `服务器(公网IP): ${config.publicIP || 'N/A'}`,
            `服务器(内网IP): ${config.privateIP || 'N/A'}`,
            `日志文件: ${watcherId}`,
            ``,
            `相关内容 (最多显示 ${config.log.throttle.maxLogsPerAlert} 个事件): `,
            txtLogs.join('\n\n'),
        ];
        let htmlBody = `
            <div>时间: ${timeStr}</div>
            <div>服务器别名: ${config.name || 'N/A'}</div>
            <div>服务器(公网IP): ${config.publicIP || 'N/A'}</div>
            <div>服务器(内网IP): ${config.privateIP || 'N/A'}</div>
            <div>日志文件: ${watcherId}</div>
            <div>
            <div>相关内容 (最多显示 ${config.log.throttle.maxLogsPerAlert} 个事件): </div>
            ${htmlLogs.join('\n')}
            </div>
        `;

        const report: EmailReport = {
            channel: 'email',
            type: 'log',
            title: `服务日志异常报警 <${config.name}>`,
            createTime: Date.now(),
            plain: body.join('\n'),
            html: htmlBody,
        };

        return report;
    }

}

