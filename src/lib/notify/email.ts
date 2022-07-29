import { Log, SmtpConfig } from "../types";
import nodemailer from 'nodemailer';

export const init = (option: SmtpConfig) => {
    return new Promise((resolve, reject) => {
        // create reusable transporter object using the default SMTP transport
        const transporter = nodemailer.createTransport({...option});
        // verify connection configuration
        transporter.verify((err) => {
            if (err) {
                reject(err);
            } else {
                resolve(transporter);
            }
        });
    });
}

/**
let transporter: any;

const sendEmail = async (alerts: Log[]) => {
    if (alerts.length < 1) {
        console.log('no alerts');
        return;
    }

    const { mailTo, mailFrom, server, watchFile } = config;
    if (!mailTo) {
        console.warn('MAIL_TO env value is not configed.');
        return;
    }

    let timeStr = dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    let title = `服务日志异常报警 ${server.name ? `<${server.name}> ` : ''}${timeStr}`;

    let txtLogs: string[] = [];
    let htmlLogs: string[] = [];
    let i = 0;
    for (let { log } of alerts) {
        txtLogs.push(log.join('\n'));
        htmlLogs.push(`<pre style="background: #eeeeee; padding: 12px;"><code>${log.join('<br/>')}</code></pre>`);
        i ++;
        if (i >= (config.throttle.maxLogsPerAlert - 1)) {
            break;
        }
    }

    let body = [
        `时间: ${timeStr}`,
        `服务器别名: ${server.name || 'N/A'}`,
        `服务器(公网IP): ${server.publicIP || 'N/A'}`,
        `服务器(内网IP): ${server.privateIP || 'N/A'}`,
        `日志文件: ${watchFile}`,
        ``,
        `相关内容 (最多显示 ${config.throttle.maxLogsPerAlert} 个事件): `,
        txtLogs.join('\n\n'),
    ];
    let htmlBody = `
        <div>时间: ${timeStr}</div>
        <div>服务器别名: ${server.name || 'N/A'}</div>
        <div>服务器(公网IP): ${server.publicIP || 'N/A'}</div>
        <div>服务器(内网IP): ${server.privateIP || 'N/A'}</div>
        <div>日志文件: ${watchFile}</div>
        <div>
        <div>相关内容 (最多显示 ${config.throttle.maxLogsPerAlert} 个事件): </div>
        ${htmlLogs.join('\n')}
        </div>
    `;

    // send mail with defined transport object
    await transporter.sendMail({
        from: mailFrom, // sender address
        to: mailTo, // list of receivers
        subject: title, // Subject line
        text: body.join('\n'), // plain text body
        html: htmlBody, // html body
    });

    console.log(`error <${timeStr}> <${alerts.length}> alert email is sent to ---> ${mailTo}`);
}
 */
export const notify = () => {

}