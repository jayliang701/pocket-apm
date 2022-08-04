import dayjs from "dayjs";
import { EmailReport, LarkMessage, LarkReport, Log, Report } from "../types";
import Throttle from "../utils/Throttle";
import Reporter from "./Reporter";

export default class LogReporter extends Reporter {

    private throttle: Throttle = new Throttle();

    async process(watcherId: string, alerts: Log[]) {
        this.throttle.execute(this.doProcess, watcherId, alerts);
    }

    doProcess = (watcherId: string, alerts: Log[]) => {
        this.sendReports(this.buildReports(watcherId, alerts));
    }

    override async refresh() {
        this.throttle.setConfig(this.config.log!.throttle);
        console.log('throttle update...', this.config.log!.throttle)
    }

    private buildReports(watcherId: string, alerts: Log[]): Report[] {
        const { config } = this;

        const reports: Report[] = [];

        const now = Date.now();
        const timeStr = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');
        const title = `服务日志异常报警 <${config.name}>`;

        let txtLogs: string[] = [];
        let htmlLogs: string = '';
        for (let log of alerts) {
            txtLogs.push(log.lines.join('\n'));
            if (this.enableEmailChannel) htmlLogs += `<pre style="background: #eeeeee; padding: 12px;"><code>${log.lines.join('<br/>')}</code></pre>\n`;
        }

        if (this.enableEmailChannel) {
            let body = [
                `时间: ${timeStr}`,
                `服务器别名: ${config.name || 'N/A'}`,
                `服务器(公网IP): ${config.publicIP || 'N/A'}`,
                `服务器(内网IP): ${config.privateIP || 'N/A'}`,
                `日志文件: ${watcherId}`,
                ``,
                `相关内容 (最多显示 ${config.log.debounce.maxNum} 个事件): `,
                txtLogs.join('\n\n'),
            ];
            let htmlBody = `
                <div>时间: ${timeStr}</div>
                <div>服务器别名: ${config.name || 'N/A'}</div>
                <div>服务器(公网IP): ${config.publicIP || 'N/A'}</div>
                <div>服务器(内网IP): ${config.privateIP || 'N/A'}</div>
                <div>日志文件: ${watcherId}</div>
                <div>
                <div>相关内容 (最多显示 ${config.log.debounce.maxNum} 个事件): </div>
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
                                    text: {
                                        content: `**日志文件**\n${watcherId}`,
                                        tag: 'lark_md'
                                    }
                                },
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
                        // {

                        //     tag: 'img',
                        //     alt: {
                        //         content: 'CPU使用率',
                        //         tag: 'lark_md'
                        //     },
                        //     img_key: 'img_v2_450a7d47-826d-4bce-adb5-da3df32522dg',
                        // },
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

