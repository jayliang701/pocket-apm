
export type Vars = {
    [name: string]: string | number | boolean;
};

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

export type LarkConfig = {
    app_id?: string;    //飞书应用id
    app_secret?: string;    //飞书应用密钥
    webhook: string;
    secret?: string;
    producer?: string;     //飞书机器人消息内容生成JS脚本的路径
}

export type Config = {
    apps: string[];
    skywalking?: SkywalkingServerConfig;
    notify: {
        lark?: LarkConfig;
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
    warn?: {
        timeLimit: {
            durationMinutes: number;
        },
        jvm?: {
            cpu?: number;   //avg CPU usage warn line. range: 0 - 100 (%)
        }
    }
};

export type AppConfig = {
    name: string;
    publicIP?: string;
    privateIP?: string;
    log?: LogConfig;
    skywalking?: SkywalkingConfig;
};

export type MainProcessMessages = {
    sync_main_config: SyncMainConfigMessage;
    sync_env_vars: SyncEnvVarsMessage;
};

export type MainProcessMessage = {
    event: keyof MainProcessMessages;
    data: MainProcessMessages[keyof MainProcessMessages];
};

export type SyncMainConfigMessage = {
    config: Config;
};

export type SyncEnvVarsMessage = {
    vars: Vars;
};

export type AppProcessEvent = {
    app_config_reload: (data: ProcessConfigReloadData) => Promise<void> | void;
    request_main_config: (appProcess: IAppProcess) => Promise<void> | void;
    request_env_vars: (appProcess: IAppProcess) => Promise<void> | void;
    report: (data: ProcessReportData) => Promise<void> | void;
    invoke_platform: (appProcess: IAppProcess, data: ProcessInvokePlatformData) => Promise<void> | void;
};

export interface IMainProcess {
    broadcast: (event: keyof MainProcessMessages, data: MainProcessMessages[keyof MainProcessMessages]) => void;
};

export interface IAppProcess {
    send: (event: keyof MainProcessMessages, data: MainProcessMessages[keyof MainProcessMessages]) => Promise<void>;
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

export type ProcessMessages = {
    reload: ProcessConfigReloadData;
    report: ProcessReportData;
    request_config: {},
    request_env_vars: {},
    invoke_platform: ProcessInvokePlatformData;
};

export type ProcessMessage = {
    event: keyof ProcessMessages;
    data: ProcessMessages[keyof ProcessMessages];
};

export type ProcessConfigReloadData = {
    app: string;
    configFile: string;
    skywalkingApp?: string;
};

export type ProcessReportData = {
    app: string;
    report: Report;
};

export type ProcessInvokePlatformData = {
    platform: 'lark';
    method: string;
    args?: string; // string array
    callback?: string;   //callback message type
};

export type MetricUpdate = {
    service: string;
    serviceInstance: string;
    metricLog: string;
    timeRange: [ number, number ],
}

export type ProcessMetric = {
    time: number;
    cpu: number;
};

export type ChannelType = 'email' | 'lark';

export type Report<C extends ChannelType = ChannelType, T = any> = {
    channel: C;
    type: 'log' | 'metric';
    title: string;
    createTime: number;
} & T;

export type EmailReport = Report<'email', {
    plain: string; 
    html?: string;
    attachments?: any[];
}>;

export type LarkMessage = {
    msg_type: 'interactive' | 'text' | 'post' | 'image';
    content?: {
        text: string;
    };
    card?: {
        config?: {
            enable_forward?: boolean;
            update_multi?: boolean;
        };
        elements: any[];
        header: {
            template: 'red'|'wathet'|'turquoise'|'green'|'yellow'|'orange'|'red'|'carmine'|'violet'|'purple'|'indigo'|'grey';
            title: {
                content: string;
                tag: 'plain_text';
            }
        };
    }
};

export type LarkReport = Report<'lark', {
    message: LarkMessage;
}>;

///

export type SkywalkingJVMMetric = {
    time: string;
    cpu: {
        usagePercent: string;
    },
    memory: JVMMemory[];
    thread: JVMThread;
};

export type JVMMemory = {
    isHeap: boolean;
    init: string;
    max: string;
    used: string;
    committed: string;
}

export type JVMThread = {
    liveCount: string;
    daemonCount: string;
    peakCount: string;
    runnableStateThreadCount: string;
    blockedStateThreadCount: string;
    waitingStateThreadCount: string;
    timedWaitingStateThreadCount: string;
};

export type ProcessMetricData = {
    service: string;
    serviceInstance: string;
    metrics: SkywalkingJVMMetric[];
};

export type JVMMetricValues = {
    cpu: number;
    heapMemory: number;
    nonHeapMemory: number;
    liveThread: number;
    daemonThread: number;
    blockedThread: number;
};

export type JVMMetric = {
    values: JVMMetricValues;
    time: number;
};