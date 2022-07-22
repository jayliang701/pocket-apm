

import { Server, loadPackageDefinition, ServerCredentials } from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { SkywalkingConfig } from 'src/lib/types';
import path from 'path';
import EventEmitter from 'events';

type ServiceHandler = (service: { request: any }, callback: any) => void;

const protoOptions = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
};

const loadMetricProto = (filename: string): any => {
    const packageDefinition = protoLoader.loadSync(path.resolve(__dirname, 'proto/' + filename), protoOptions);
    const proto = loadPackageDefinition(packageDefinition);
    return proto;
}

export default class RPCServer extends Server {

    config: SkywalkingConfig;

    running: boolean = false;

    dispatcher: EventEmitter = new EventEmitter();

    constructor() {
        super();
    }

    on(eventName: string, handler: (...args: any[]) => void | Promise<void>) {
        this.dispatcher.on(eventName, handler);
    }

    off(eventName: string, handler: (...args: any[]) => void | Promise<void>) {
        this.dispatcher.off(eventName, handler);
    }

    private diffConfig(config: SkywalkingConfig) {
        if (!this.config ||
            (this.config.host !== config.host ||
                this.config.port !== config.port)) {
            return true;
        }
        return false;
    }

    run(config: SkywalkingConfig): Promise<void> {
        return new Promise(async (resolve, reject) => {

            let restart = false;
            if (this.diffConfig(config)) {
                restart = true;
            } else if (!this.running) {
                restart = true;
            }

            this.config = { ...config };

            if (!restart) {
                return;
            }

            await this.shutdown();

            const { host, port } = this.config;
            this.registerRPCServices();
            this.bindAsync(
                `${host}:${port}`,
                ServerCredentials.createInsecure(),
                (err, port) => {
                    if (err) {
                        this.running = false;
                        console.error('RPC server start fail --> ', err);
                        reject(err);
                        return;
                    }
                    this.running = true;
                    console.log(`RPC server running at ${host}:${port}`);
                    this.start();
                    resolve();
                }
            );
        });
    }

    shutdown(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.running) {
                resolve();
                return;
            }

            this.tryShutdown((err => {
                this.running = false;
                if (err) {
                    console.error('RPC server try to shutdown fail --> ', err);
                    console.warn('force shutdown RPC server.');
                    this.forceShutdown();
                    reject(err);
                } else {
                    console.log('RPC server is stopped.');
                    resolve();
                }
            }));
        });
    }

    private createServiceHandler (serviceName: string, methodName: string): ServiceHandler {
        return ({ request }, callback) => {
            this.dispatcher.emit(serviceName, { method: methodName, request });
            callback(null, { commands: [] });
        }
    }

    private registerRPCServices() {
        const metricProto = loadMetricProto('JVMMetric.proto');
        const configDiscoveryProto = loadMetricProto('ConfigurationDiscoveryService.proto');
        const traceProto = loadMetricProto('Tracing.proto');
        const eventProto = loadMetricProto('Event.proto');
        const meterProto = loadMetricProto('Meter.proto');
        const managementProto = loadMetricProto('Management.proto');
        const metricExportProto = loadMetricProto('MetricExport.proto');
        const profileProto = loadMetricProto('Profile.proto');

        this.addService(metricProto.skywalking.v3.JVMMetricReportService.service, {
            collect: this.createServiceHandler('JVMMetricReportService', 'collect'),
        });

        this.addService(profileProto.skywalking.v3.ProfileTask.service, {
            getProfileTaskCommands: this.createServiceHandler('ProfileTask', 'getProfileTaskCommands'),
            collectSnapshot: this.createServiceHandler('ProfileTask', 'collectSnapshot'),
            reportTaskFinish: this.createServiceHandler('ProfileTask', 'reportTaskFinish'),
        });

        this.addService(meterProto.skywalking.v3.MeterReportService.service, {
            collect: this.createServiceHandler('MeterReportService', 'collect'),
            collectBatch: this.createServiceHandler('MeterReportService', 'collectBatch'),
        });

        this.addService(managementProto.skywalking.v3.ManagementService.service, {
            reportInstanceProperties: this.createServiceHandler('ManagementService', 'reportInstanceProperties'),
            keepAlive: this.createServiceHandler('ManagementService', 'keepAlive'),
        });

        this.addService(traceProto.skywalking.v3.TraceSegmentReportService.service, {
            collect: this.createServiceHandler('TraceSegmentReportService', 'collect'),
        });

        this.addService(configDiscoveryProto.skywalking.v3.ConfigurationDiscoveryService.service, {
            fetchConfigurations: this.createServiceHandler('ConfigurationDiscoveryService', 'fetchConfigurations'),
        });

        this.addService(eventProto.skywalking.v3.EventService.service, {
            collect: this.createServiceHandler('EventService', 'collect'),
        });

        this.addService(metricExportProto.MetricExportService.service, {
            export: this.createServiceHandler('MetricExportService', 'export'),
            subscription: this.createServiceHandler('MetricExportService', 'subscription'),
        });
    }
}
