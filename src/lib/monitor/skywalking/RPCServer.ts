

import { Server, loadPackageDefinition, ServerCredentials, ServerReadableStream, UntypedServiceImplementation, ServiceDefinition } from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { SkywalkingServerConfig } from '../../types';
import path from 'path';
import EventEmitter from 'events';
import { Http2ServerCallStream } from '@grpc/grpc-js/build/src/server-call';

type ServiceHandler = (service: { request: any, call?: Http2ServerCallStream<any, any> }, callback: any) => void;

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

    private static instance: RPCServer;

    public static create(): RPCServer {
        if (!RPCServer.instance) {
            const server = new RPCServer();
            RPCServer.instance = server;
        }
        return RPCServer.instance;
    }

    public static getSharedServer() {
        return RPCServer.instance;
    }

    config: SkywalkingServerConfig;

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

    private diffConfig(config: SkywalkingServerConfig): [ boolean, boolean ] {
        let restart = false;
        let refresh = false;
        if (!this.config ||
            (this.config.host !== config.host ||
                this.config.port !== config.port)) {
            restart = true;
        }
        if (!this.config ||
            (this.config.enableLogging !== config.enableLogging)) {
            refresh = true;
        }
        return [ restart, refresh ];
    }

    run(config: SkywalkingServerConfig): Promise<void> {
        return new Promise(async (resolve, reject) => {

            let [ restart, refresh ] = this.diffConfig(config);
            if (restart || !this.running) {
                restart = true;
            }

            this.config = { ...config };

            if (!restart) {

                //check enableLogging
                if (refresh) {
                    this.registerRPCServices();
                }

                resolve();
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

            this.tryShutdown(() => {
                this.running = false;
                const err = false;
                if (err) {
                    console.error('RPC server try to shutdown fail --> ', err);
                    console.warn('force shutdown RPC server.');
                    this.forceShutdown();
                    reject(err);
                } else {
                    console.log('RPC server is stopped.');
                    resolve();
                }
            });
        });
    }

    dispose(): void {
        if (this === RPCServer.instance) {
            RPCServer.instance = undefined;
        }
        this.shutdown();
    }

    private createServiceHandler (serviceName: string, methodName: string, enabled: boolean = false): ServiceHandler {
        return (message, callback) => {
            if (enabled) {
                const { request, call } = message;
                let app: string;
                if (request) {
                    app = request.service;
                } else if (call) {
                    call.receiveUnaryMessage('binary').then((payload: any) => {
                        if (payload === undefined) {
                            payload = [...call['messagesToPush']];
                        }
                        if (payload instanceof Array) {
                            for (const req of payload) {
                                if (!req) continue;
                                this.dispatcher.emit('service', { app: req.service, service: serviceName, method: methodName, request: req });
                            }
                        } else {
                            this.dispatcher.emit('service', { app: payload.service, service: serviceName, method: methodName, request: payload });
                        }
                        callback(null, { commands: [] });
                    });
                    return;
                }
                this.dispatcher.emit('service', { app, service: serviceName, method: methodName, request });
            }
            callback(null, { commands: [] });
        }
    }

    private registerSingleRPCService(service: ServiceDefinition, implementation: UntypedServiceImplementation) {
        this.removeService(service);
        this.addService(service, implementation);
    }

    private registerRPCServices() {
        const jvmMetricProto = loadMetricProto('JVMMetric.proto');
        const nodeJSMetricProto = loadMetricProto('NodeJSMetric.proto');
        const configDiscoveryProto = loadMetricProto('ConfigurationDiscoveryService.proto');
        const traceProto = loadMetricProto('Tracing.proto');
        const eventProto = loadMetricProto('Event.proto');
        const meterProto = loadMetricProto('Meter.proto');
        const managementProto = loadMetricProto('Management.proto');
        const metricExportProto = loadMetricProto('MetricExport.proto');
        const profileProto = loadMetricProto('Profile.proto');
        const loggingProto = loadMetricProto('Logging.proto');

        this.registerSingleRPCService(jvmMetricProto.skywalking.v3.JVMMetricReportService.service, {
            collect: this.createServiceHandler('JVMMetricReportService', 'collect', true),
        });

        this.registerSingleRPCService(nodeJSMetricProto.pocketapm.NodeJSMetricReportService.service, {
            collect: this.createServiceHandler('NodeJSMetricReportService', 'collect', true),
        });

        this.registerSingleRPCService(profileProto.skywalking.v3.ProfileTask.service, {
            getProfileTaskCommands: this.createServiceHandler('ProfileTask', 'getProfileTaskCommands'),
            collectSnapshot: this.createServiceHandler('ProfileTask', 'collectSnapshot'),
            reportTaskFinish: this.createServiceHandler('ProfileTask', 'reportTaskFinish'),
        });

        this.registerSingleRPCService(meterProto.skywalking.v3.MeterReportService.service, {
            collect: this.createServiceHandler('MeterReportService', 'collect'),
            collectBatch: this.createServiceHandler('MeterReportService', 'collectBatch'),
        });

        this.registerSingleRPCService(managementProto.skywalking.v3.ManagementService.service, {
            reportInstanceProperties: this.createServiceHandler('ManagementService', 'reportInstanceProperties'),
            keepAlive: this.createServiceHandler('ManagementService', 'keepAlive'),
        });

        this.registerSingleRPCService(traceProto.skywalking.v3.TraceSegmentReportService.service, {
            collect: this.createServiceHandler('TraceSegmentReportService', 'collect'),
        });

        this.registerSingleRPCService(configDiscoveryProto.skywalking.v3.ConfigurationDiscoveryService.service, {
            fetchConfigurations: this.createServiceHandler('ConfigurationDiscoveryService', 'fetchConfigurations'),
        });

        this.registerSingleRPCService(eventProto.skywalking.v3.EventService.service, {
            collect: this.createServiceHandler('EventService', 'collect'),
        });

        this.registerSingleRPCService(metricExportProto.MetricExportService.service, {
            export: this.createServiceHandler('MetricExportService', 'export'),
            subscription: this.createServiceHandler('MetricExportService', 'subscription'),
        });

        this.registerSingleRPCService(loggingProto.skywalking.v3.LogReportService.service, {
            collect: this.createServiceHandler('LogReportService', 'collect', this.config.enableLogging ? true : false),
        });
    }
}
