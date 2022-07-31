import { LarkReport } from "../types";
import NotifyChannel from "./NotifyChannel";
import axios from 'axios';
import dayjs from "dayjs";

import crypto from 'crypto';
/**
 * 签名
 * @param {string} timestamp - 10位时间戳
 * @param {string} secret - 密钥
 * @returns {string} - 签名
 */
const genSign = (timestamp, secret) => {
    const key = `${timestamp}\n${secret}`;
    const sign = crypto.createHmac('sha256', key).update('').digest('base64');
    return sign;
}

const genTimeStamp = () => {
    let timestamp = Date.now();
    return String(timestamp).slice(0, 10);
}

export default class LarkChannel extends NotifyChannel<LarkReport> {

    get enabled(): boolean {
        return !!(this.config.notify.lark?.webhook);
    }

    async process(report: LarkReport) {
        // console.log('got email report ---> ', report);
        if (!this.config.notify.lark) return;

        const { webhook, secret } = this.config.notify.lark;

        const body = {
            ...report.message,
            timestamp: genTimeStamp(),
            sign: '',
        };
        if (secret) {
            body.sign = genSign(body.timestamp, secret);
        }

        const res = await axios.post(webhook, body, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            timeout: 30000,
        });
        if (res.status == 200 && res.data.StatusCode == 0) {
            //success
            console.log(`Lark channel process success ---> ${report.title}  ${dayjs(report.createTime).format('YYYY-MM-DD HH:mm:ss')}`);
        } else {
            throw new Error(`post message error. status: ${res.status}     statusText: ${res.statusText}     code: ${res.data?.code}     message: ${res.data?.msg}`);
        }
        
    }

}
