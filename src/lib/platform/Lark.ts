import axios from "axios";
import { Config, LarkConfig } from "../types";
import Platform from "./Platform";
import FormData from 'form-data';
import { ENV_VAR_LARK_ACCESS_TOKEN } from "../../consts";
import envVars from "../../envVars";

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
        console.error(err);
        throw new Error('lark app upload image fail.')
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

        if (!lark) return;

        if (!oldConfig || (oldConfig.app_id !== lark.app_id) || (oldConfig.app_secret !== lark.app_secret)) {
            await this.refreshToken();
        }
    }

    private async refreshToken() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = undefined;
        }
        if (!this.enabled) return;

        const { app_id, app_secret } = this.larkConfig;
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

            // const image = await genChart([
            //     { time: 1658981160000, cpu: 0.1323 },
            //     { time: 1658981220000, cpu: 0.3523 },
            //     { time: 1658981280000, cpu: 0.2823 },
            //     { time: 1658981340000, cpu: 0.4423 },
            //     { time: 1658981400000, cpu: 0.2323 },
            // ]);
            // this.uploadImage(image);
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
