import { RPCServicePayload, SkywalkingConfig } from "../../../types";

export default class ServiceHandler {

    protected config: SkywalkingConfig;

    get service(): string {
        throw new Error('service getter should be overrided.')
    }

    refresh(config: SkywalkingConfig) {
        this.config = config;
    }

    process(payload: RPCServicePayload) {
        const func = this[payload.method];
        if (func) {
            try {
                func.apply(this, [ payload.request ]);
            } catch (err) {
                console.error(`RPC service [${this.service} -> ${payload.method}] handler error --> `, err);
            }
        }
    }

    async flush() {
        
    }

    dispose() {
        
    }

}