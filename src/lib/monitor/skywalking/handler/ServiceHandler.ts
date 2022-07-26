import { SkywalkingConfig } from "src/lib/types";

type ServiceRequest = {
    service: string;
    serviceInstance?: string;
    [name: string]: any;
};

type ServicePayload = {
    method: string;
    request: ServiceRequest;
};

export default class ServiceHandler {

    protected config: SkywalkingConfig;

    get service(): string {
        return this.config.service;
    }

    get serviceName(): string {
        throw new Error('serviceName getter should be overrided.');
    }

    refresh(config: SkywalkingConfig) {
        this.config = config;
    }

    process(payload: ServicePayload) {
        if (this.service !== payload.request.service) {
            return;
        }

        const func = this[payload.method];
        if (func) {
            try {
                func.apply(this, [ payload.request ]);
            } catch (err) {
                console.error(`RPC service [${this.serviceName}] handler error --> `, err);
            }
        }
    }

    async flush() {
        
    }

    dispose() {
        
    }

}