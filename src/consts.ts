import path from "path";
import { LogConfig, LogBasicConfig, SkywalkingConfig, ThrottleConfig } from "./lib/types";

export const MINUTE = 60 * 1000;

export const SPACE_LEN = Buffer.from(' ', 'utf-8').byteLength;

export const PID_LEN = Buffer.from(`6555555`, 'utf-8').byteLength;

export const TIMESTAMP_LEN = Buffer.from(`${Date.now()}`, 'utf-8').byteLength;

export const METRIC_PECT_VALUE_LEN = Buffer.from('999.9999', 'utf-8').byteLength;

export const METRIC_MEMORY_VALUE_LEN = Buffer.from('000000', 'utf-8').byteLength;   //MB

export const METRIC_THREAD_COUNT_VALUE_LEN = Buffer.from('00000', 'utf-8').byteLength;

export const METRIC_LOG_LINE_LEN = TIMESTAMP_LEN + SPACE_LEN + 
                                    METRIC_PECT_VALUE_LEN + SPACE_LEN +           //cpu usage
                                    METRIC_MEMORY_VALUE_LEN + SPACE_LEN +         //heap memory usage
                                    METRIC_MEMORY_VALUE_LEN + SPACE_LEN +         //non-heap memory usage
                                    METRIC_THREAD_COUNT_VALUE_LEN + SPACE_LEN +   //thread live count
                                    METRIC_THREAD_COUNT_VALUE_LEN + SPACE_LEN +   //thread daemon count
                                    METRIC_THREAD_COUNT_VALUE_LEN +               //thread blocked count
                                    Buffer.from(`\n`, 'utf-8').byteLength;

export const NODEJS_METRIC_LOG_LINE_LEN = TIMESTAMP_LEN + SPACE_LEN + 
                                    PID_LEN + SPACE_LEN +                         //pid
                                    METRIC_PECT_VALUE_LEN + SPACE_LEN +           //cpu usage
                                    METRIC_MEMORY_VALUE_LEN + SPACE_LEN +         //memory usage
                                    TIMESTAMP_LEN +                               //alive time
                                    Buffer.from(`\n`, 'utf-8').byteLength;

export const ENV_VAR_LARK_ACCESS_TOKEN = 'lark@acess_token';

export const DEFAULT_THROTTLE_CONFIG: ThrottleConfig = {
    maxTimesInWindow: 2,
    windowTime: 3600,
    durationPerTime: 1200,
}

export const DEFAULT_LOG_BASIC_CONFIG: LogBasicConfig = {
    debounce: {
        delay: 5,
        maxNum: 5,
    },
    throttle: {
        ...DEFAULT_THROTTLE_CONFIG,
    }
}

export function setDefaultLogBasicConfig<T extends LogBasicConfig>(config: T | undefined): T {    
    if (!config) {
        config = { ...DEFAULT_LOG_BASIC_CONFIG } as T;
    }
    if (!config.debounce) {
        config.debounce = { ...DEFAULT_LOG_BASIC_CONFIG.debounce };
    }
    if (config.debounce.delay === null || config.debounce.delay === undefined) {
        config.debounce.delay = DEFAULT_LOG_BASIC_CONFIG.debounce.delay;
    }
    if (!config.debounce.maxNum === null || config.debounce.maxNum === undefined) {
        config.debounce.maxNum = DEFAULT_LOG_BASIC_CONFIG.debounce.maxNum;
    }

    config.throttle = setDefaultThrottleConfig(config.throttle);
    return config;
}

export const setDefaultThrottleConfig = (config: ThrottleConfig | undefined): ThrottleConfig => {    
    if (!config) {
        config = { ...DEFAULT_THROTTLE_CONFIG };
    }
    if (config.maxTimesInWindow === null || config.maxTimesInWindow === undefined) {
        config.maxTimesInWindow = DEFAULT_THROTTLE_CONFIG.maxTimesInWindow;
    }
    if (config.windowTime === null || config.windowTime === undefined) {
        config.windowTime = DEFAULT_THROTTLE_CONFIG.windowTime;
    }
    if (config.durationPerTime === null || config.durationPerTime === undefined) {
        config.durationPerTime = DEFAULT_THROTTLE_CONFIG.durationPerTime;
    }
    return config;
}

export const setDefaultLogConfig = (config: LogConfig | undefined): LogConfig | undefined => {
    if (!config) return undefined;
    
    setDefaultLogBasicConfig(config);

    config.timeCheck = config.timeCheck === true ? true : false;

    return config;
}

export const setDefaultSkywalkingConfig = (config: SkywalkingConfig | undefined): SkywalkingConfig | undefined => {
    if (!config) return undefined;
    
    let { warn } = config;
    if (warn) {
        warn.durationMinutes = warn.durationMinutes || 5;
        warn.throttle = setDefaultThrottleConfig(warn.throttle);
    }
    config.metricLogPath = config.metricLogPath || path.resolve(process.cwd(), `.metric/${config.service}`);

    if (config.log) {
        config.log = setDefaultLogBasicConfig(config.log);
    }
    config.clean = config.clean || {} as any;
    config.clean.metricFile = config.clean.metricFile || {} as any;
    config.clean.metricFile.maxSize = config.clean.metricFile.maxSize || 10 * 1024;
    config.clean.metricFile.keepPect = config.clean.metricFile.keepPect || 1/2;
    config.clean.metricFile.schedule = config.clean.metricFile.schedule || '';

    return config;
}