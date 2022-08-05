import axios from "axios";
import { Config, LarkConfig } from "../types";
import Platform from "./Platform";
import FormData from 'form-data';
import { ENV_VAR_LARK_ACCESS_TOKEN } from "../../consts";
import envVars from "../../envVars";

export const isLarkAvailable = (): boolean => {
    const accessToken = envVars.get(ENV_VAR_LARK_ACCESS_TOKEN);
    return !!accessToken;
}

//img_v2_450a7d47-826d-4bce-adb5-da3df32522dg
export const uploadImage = async (image: Buffer): Promise<string> => {
    const accessToken = envVars.get(ENV_VAR_LARK_ACCESS_TOKEN);
    const form = new FormData();
    form.append('image', image);
    form.append('image_type', 'message');
    try {
        const res = await axios.post('https://open.feishu.cn/open-apis/im/v1/images', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (res.data && res.data.code == 0 && res.data.data) {
            return res.data.data.image_key;
        }
        throw new Error(`lark app upload image fail. status: ${res.status}    statusText: ${res.statusText}    code: ${res.data ? res.data.code : 'N/A'}    msg: ${res.data ? res.data.msg : 'N/A'}`);
    } catch (err) {
        let msg = 'lark app upload image fail.';
        if (err.response) {
            msg += `status: ${err.response.status}    statusText: ${err.response.statusText}    code: ${err.response.data ? err.response.data.code : 'N/A'}    msg: ${err.response.data ? err.response.data.msg : 'N/A'}`;
        }
        throw new Error(msg);
    }
}

export default class Lark extends Platform {

    private larkConfig: LarkConfig;

    private refreshTimer: any;

    private accessToken: string;

    public getAccessToken() {
        return this.accessToken;
    }

    get enabled(): boolean {
        return !!this.larkConfig && !!this.larkConfig.app_id;
    }

    async reload(config: Config) {
        const { lark } = config.notify || {};
        const oldConfig = this.larkConfig;
        this.larkConfig = lark;

        if (!lark) {
            this.clearTimer();
            return;
        }

        if (!oldConfig || (oldConfig.app_id !== lark.app_id) || (oldConfig.app_secret !== lark.app_secret)) {
            await this.refreshToken();
        }
    }

    private async refreshToken() {
        this.clearTimer();

        if (!this.enabled) return;

        const { app_id, app_secret } = this.larkConfig;
        
        try {
            const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
                app_id,
                app_secret,
            }, {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                }
            });
            if (res.status == 200 && res.data.app_access_token) {
                console.log('get lark app access token ---> ', res.data.app_access_token);

                this.updateAccessToken(res.data.app_access_token);

                this.refreshTimer = setTimeout(() => {
                    this.refreshToken();
                }, Math.round(Number(res.data.expire) * 1000 * 3 / 4));
            }
        } catch (err) {
            let msg = 'lark app refresh access token fail.';
            if (err.response) {
                msg += `status: ${err.response.status}    statusText: ${err.response.statusText}    code: ${err.response.data ? err.response.data.code : 'N/A'}    msg: ${err.response.data ? err.response.data.msg : 'N/A'}`;
            }
            
            //15秒后重试
            this.clearTimer();
            this.refreshTimer = setTimeout(() => {
                this.refreshToken();
            }, 15 * 1000);
        }
    }

    private clearTimer() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = undefined;
        }
    }

    private updateAccessToken(accessToken: string) {
        this.accessToken = accessToken;
        envVars.set(ENV_VAR_LARK_ACCESS_TOKEN, accessToken);
        this.mainProcess.broadcast('sync_env_vars', {
            vars: {
                [ENV_VAR_LARK_ACCESS_TOKEN]: accessToken,
            }
        });
    }

}
