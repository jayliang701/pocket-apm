
export type Log = {
    time: string;
    lines: string[];
};

export type MailAlert = {
    log: string[];
    time: string;
};

export type SmtpConfig = {
    pool?: boolean;
    host: string;
    port: number;
    secure?: boolean;
    auth?: {
        user: string;
        pass: string;
    }
};

export type Config = {
    apps: string[];
    skywalking?: SkywalkingServerConfig;
    notify: {
        lark?: {
            webhook: string;
            producer?: string;     //飞书机器人消息内容生成JS脚本的路径
        }
        email?: {
            mailTo: string;
            mailFrom: string;
            smtp: SmtpConfig;
        }
    }
}

export type LogConfig = {
    dateTimeFilter: RegExp | ((log: string) => string | undefined);
    logFilter: RegExp | ((log: string) => boolean);
    errorLogFilter: RegExp | ((log: string) => boolean);
    throttle: {
        delay: number;   //seconds
        maxLogsPerAlert: number;   //count
        // maxTimesInWindow: number;  //count
        // windowTime: number;   //seconds
        check?: (log: string[]) => boolean;
    },
    watch: (string | SingleLogConfig)[];
};

export type SingleLogConfig = {
    file: string;
} & Omit<Partial<LogConfig>, 'watch'>;

export type SkywalkingServerConfig = {
    host: string;
    port: number;
};

export type SkywalkingConfig = {
    service: string;
    metricLogPath: string;
};

export type AppConfig = {
    name: string;
    publicIP?: string;
    privateIP?: string;
    log?: LogConfig;
    skywalking?: SkywalkingConfig;
};

export interface Worker {
    get id(): string;
    start(): Promise<void>;
    refresh(): Promise<void>;
    dispose(): Promise<void>;
}

export type RPCServiceRequest = {
    service: string;
    serviceInstance: string;
    [name: string]: any;
};

export type RPCServicePayload = {
    method: string;
    request: RPCServiceRequest;
};

export type RPCServiceEventPayload = {
    app?: string;
    service: string;
} & RPCServicePayload;

export type ProcessMessage = {
    event: 'reload';
    data: any;
};

export type ProcessConfigReloadData = {
    app: string;
    configFile: string;
    skywalkingApp?: string;
};
