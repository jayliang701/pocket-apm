
export type Vars = {
    [name: string]: string | number | boolean;
};

export type Log = {
    time: string;
    lines: string[];
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

export type ThrottleConfig = {
    maxTimesInWindow: number;  //在一个时间窗口内最多执行次数
    windowTime: number;   //秒, 时间窗口长度
    durationPerTime: number; //秒, 每次执行的时间间隔
};

export type LogBasicConfig = {
    debounce: {
        delay: number;   //秒, 节流, 比如第一条错误日志出现时开始计时, 在随后的N秒内如果还出现其他错误日志, 则等到最后一并发送通知
        maxNum: number;   //最多保留几条日志
    };
    throttle: ThrottleConfig;
};

export type LogConfig = {
    timeCheck: boolean;   //是否开启日志时间检查, 默认false
                          //为false时, pocket-apm不会在采集阶段处理日志时间(即不会将 dateTimeFilter 解析出的结果再变成时间戳), 以便获得更好的性能
                          //如果日志时间字符串无法变成时间戳(dayjs无法解析), 则跳过日志时间检查
                          //为true时, pocket-apm会解析每条目标日志(即满足 errorLogFilter 的日志)的时间,
                          //并丢弃不满足时间连续性的日志(即新采集到的日志的时间不得早于之前已采集日志的时间)
                          //第一条被采集日志的时间将和watch的启动时间做对比
    dateTimeFilter: RegExp | ((log: string) => string | undefined);
    logFilter: RegExp | ((log: string) => boolean);
    errorLogFilter: RegExp | ((log: string) => boolean);
    watch: (string | SingleLogConfig)[];
} & LogBasicConfig;

export type SingleLogConfig = {
    file: string;
} & Omit<Partial<LogConfig>, 'watch'>;

export type SkywalkingServerConfig = {
    host: string;
    port: number;
    enableLogging?: boolean;
};

export type SkywalkingLoggingConfig = {
    level: string;   //ERROR, INFO, WARN, DEBUG
    filter?: (log: SkywalkingLoggingCollectData, level: LogLevel) => boolean;
} & LogBasicConfig;

export type SkywalkingConfig = {
    service: string;
    metricLogPath: string;
    warn?: {
        durationMinutes: number;
        throttle: ThrottleConfig;
        jvm?: {
            cpu?: number;   //avg CPU usage warn line. range: 0 - 100 (%)
        }
    };
    log?: SkywalkingLoggingConfig;
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

export interface Refreshable {
    refresh(): Promise<void>;
    dispose(): Promise<void>;
}

export interface Worker extends Refreshable {
    get id(): string;
    start(): Promise<void>;
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
    timeRange: [ number, number ];
}

export type ProcessLoggingAlert = {
    service: string;
    serviceInstance: string;
    alerts: Log[];
}

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

export type SkywalkingLoggingCollectData = {
    service: string;
    serviceInstance: string;
    timestamp: string;
    endpoint: string;
    body: {
        type: 'TEXT' | 'JSON' | 'YAML';
        text?: {
            text: string;
        },
        json?: any;
        yaml?: any;
        content: 'text' | 'json' | 'yaml';
    },
    tags: {
        data: { key: string, value: string }[];
    }
};

export type LogLevel = 'ERROR' | 'INFO' | 'WARN' | 'DEBUG';

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

export type SkywalkingJVMMetricCollectData = {
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