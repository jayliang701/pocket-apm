import NotifyChannel from "./NotifyChannel";
import nodemailer from 'nodemailer';
import type { SmtpConfig, EmailReport } from "../types";
import dayjs from "dayjs";

interface SMTPConnection {
    checkDiff: (option: SmtpConfig) => boolean;
    verify: (callback: (err: Error) => Promise<void> | void) => void;
    close?: () => Promise<void> | void;
    sendMail: (payload: {
        from: string;
        to: string;
        subject: string;
        text: string;
        html?: string;
    }) => Promise<void>;
};

const createMailer = (option: SmtpConfig): Promise<SMTPConnection> => {
    return new Promise((resolve, reject) => {
        // create reusable transporter object using the default SMTP transport
        const transporter = nodemailer.createTransport({...option});
        // verify connection configuration
        transporter.checkDiff = (option2: SmtpConfig) => {
            if (JSON.stringify(option) !== JSON.stringify(option2)) {
                return true;
            }
            return false;
        }
        transporter.verify((err) => {
            if (err) {
                reject(err);
            } else {
                resolve(transporter);
            }
        });
    });
}

export default class EmailChannel extends NotifyChannel<EmailReport> {

    transporter: SMTPConnection;

    get enabled(): boolean {
        return !!this.transporter;
    }

    private disposeMailer() {
        try {
            const transport = this.transporter;
            if (transport) {
                this.transporter = undefined;
                console.log('email channel is disabled.')
                if (transport.close) {
                    transport.close();
                }
            }
        } catch (err) {
            console.warn('dispose nodemailer failed ---> ', err);
        }
    }
    
    protected override async afterReload() {
        const { notify } = this.config;
        if (notify.email && notify.email.smtp) {
            const { smtp } = notify.email;
            if (this.transporter && this.transporter.checkDiff(smtp)) {
                this.disposeMailer();
            }
            if (!this.transporter) {
                try {
                    this.transporter = await createMailer(notify.email.smtp);
                    console.log(`smtp connection [${smtp.host}:${smtp.port}] is ready to work.`);
                } catch (err) {
                    this.transporter = undefined;
                    console.warn('setup stmp connection failed ---> ', err);
                }
            }
        } else {
            this.disposeMailer();
        }
    }

    async process(report: EmailReport) {
        // console.log('got email report ---> ', report);
        if (!this.config.notify.email) return;

        const { mailTo, mailFrom } = this.config.notify.email;
        
        await this.transporter.sendMail({
            from: mailFrom, // sender address
            to: mailTo, // list of receivers
            subject: report.title, // Subject line
            text: report.plain, // plain text body
            html: report.html, // html body
        });
        console.log(`Email channel process success ---> ${report.title}  ${dayjs(report.createTime).format('YYYY-MM-DD HH:mm:ss')}`);
    }

}
