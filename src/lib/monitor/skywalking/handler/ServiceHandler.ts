
type ServiceRequest = any;

type ServicePayload = {
    method: string;
    request: ServiceRequest;
};

export default class ServiceHandler {

    get serviceName(): string {
        throw new Error('serviceName getter should be overrided.');
    }

    process(payload: ServicePayload) {
        const func = this[payload.method];
        if (func) {
            try {
                func.apply(this, [ payload.request ]);
            } catch (err) {
                console.error(`RPC service [${this.serviceName}] handler error --> `, err);
            }
        }
    }

    dispose() {
        
    }

}