import dayjs from "dayjs";
import { EmailReport, LarkMessage, LarkReport, ProcessLoggingAlert, Report, SkywalkingLoggingConfig } from "../../types";
import SkywalkingReporterHandler from "./SkywalkingReporterHandler";
import Throttle from "../../utils/Throttle";

export default class ProcessloggingReporterHandler extends SkywalkingReporterHandler {

    get skywalkingLoggingConfig(): SkywalkingLoggingConfig {
        return this.skywalkingConfig.log;
    }

    private throttle: Throttle = new Throttle();

    override async process(data: ProcessLoggingAlert) {
        this.throttle.execute(this.doProcess, data);
    }

    doProcess = (data: ProcessLoggingAlert) => {
        this.sendReports(this.buildReports(data));
    }

    override async refresh() {
        this.throttle.setConfig(this.skywalkingLoggingConfig.throttle);
    }

    private buildReports({ service, serviceInstance, alerts }: ProcessLoggingAlert): Report[] {
        const { config, skywalkingConfig } = this;

        const reports: Report[] = [];

        const now = Date.now();
        const timeStr = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');
        const title = `服务日志异常报警 <${config.name}>`;

        let txtLogs: string[] = [];
        let htmlLogs: string = '';
        let i = 0;
        for (let log of alerts) {
            txtLogs.push(log.lines.join('\n'));
            if (this.enableEmailChannel) htmlLogs += `<pre style="background: #eeeeee; padding: 12px;"><code>${log.lines.join('<br/>')}</code></pre>\n`;
            i++;
            if (i >= (skywalkingConfig.log.throttle.maxLogsPerAlert - 1)) {
                break;
            }
        }

        if (this.enableEmailChannel) {
            let body = [
                `时间: ${timeStr}`,
                `服务器别名: ${config.name || 'N/A'}`,
                `服务器(公网IP): ${config.publicIP || 'N/A'}`,
                `服务器(内网IP): ${config.privateIP || 'N/A'}`,
                `Service: ${service}`,
                `Service Instance: ${serviceInstance}`,
                ``,
                `相关内容 (最多显示 ${skywalkingConfig.log.throttle.maxLogsPerAlert} 个事件): `,
                txtLogs.join('\n\n'),
            ];
            let htmlBody = `
                <div>时间: ${timeStr}</div>
                <div>服务器别名: ${config.name || 'N/A'}</div>
                <div>服务器(公网IP): ${config.publicIP || 'N/A'}</div>
                <div>服务器(内网IP): ${config.privateIP || 'N/A'}</div>
                <div>Service: ${service}</div>
                <div>Service Instance: ${serviceInstance}</div>
                <div>
                <div>相关内容 (最多显示 ${skywalkingConfig.log.throttle.maxLogsPerAlert} 个事件): </div>
                ${htmlLogs}
                </div>
            `;

            const report: EmailReport = {
                channel: 'email',
                type: 'log',
                title,
                createTime: now,
                plain: body.join('\n'),
                html: htmlBody,
            };
            reports.push(report);
        }

        if (this.enableLarkChannel) {

            const message: LarkMessage = {
                msg_type: 'interactive',
                card: {
                    header: {
                        template: 'red',
                        title: {
                            content: title,
                            tag: 'plain_text',
                        }
                    },
                    elements: [
                        {
                            fields: [
                                {
                                    is_short: true,
                                    text: {
                                        content: `**时间**\n${timeStr}`,
                                        tag: 'lark_md'
                                    }
                                },
                                {
                                    is_short: true,
                                    text: {
                                        content: `**服务**\n${config.name}`,
                                        tag: 'lark_md'
                                    }
                                }
                            ],
                            tag: 'div'
                        },
                        {
                            fields: [
                                {
                                    is_short: true,
                                    text: {
                                        content: `**公网IP**\n${config.publicIP || 'N/A'}`,
                                        tag: 'lark_md'
                                    }
                                },
                                {
                                    is_short: true,
                                    text: {
                                        content: `**内网IP**\n${config.privateIP || 'N/A'}`,
                                        tag: 'lark_md'
                                    }
                                }
                            ],
                            tag: 'div'
                        },
                        {
                            fields: [
                                {
                                    is_short: true,
                                    text: {
                                        content: `**Service**\n${service}`,
                                        tag: 'lark_md'
                                    }
                                },
                                {
                                    is_short: true,
                                    text: {
                                        content: `**Service Instance**\n${serviceInstance}`,
                                        tag: 'lark_md'
                                    }
                                }
                            ],
                            tag: 'div'
                        },
                        {
                            tag: 'hr'
                        },
                        ...(txtLogs.map(log => {
                            return {
                                tag: 'div',
                                text: {
                                    content: `${log}`,
                                    tag: 'lark_md'
                                }
                            };
                        })),
                        {
                            tag: 'hr'
                        },
                        {
                            elements: [
                                {
                                    content: "[来自 pocket-apm](https://github.com/jayliang701/pocket-apm)",
                                    tag: 'lark_md'
                                }
                            ],
                            tag: 'note'
                        }
                    ]
                }
            };
    
            const report: LarkReport = {
                channel: 'lark',
                type: 'log',
                title,
                createTime: now,
                message,
            };
            reports.push(report);
        }

        return reports;
    }
}