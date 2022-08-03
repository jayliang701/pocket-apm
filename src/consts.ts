import path from "path";
import { LogConfig, LogThrottleConfig, SkywalkingConfig } from "./lib/types";

export const MINUTE = 60 * 1000;

export const SPACE_LEN = Buffer.from(' ', 'utf-8').byteLength;

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

export const ENV_VAR_LARK_ACCESS_TOKEN = 'lark@acess_token';


export const DEFAULT_LOG_THROTTLE_CONFIG: LogThrottleConfig = {
    delay: 5,
    maxLogsPerAlert: 5,
    maxTimesInWindow: 2,
    windowTime: 3600,
    durationPerTime: 1200,
}

export const setDefaultLogThrottleConfig = (config: LogThrottleConfig | undefined): LogThrottleConfig => {    
    if (!config) {
        config = { ...DEFAULT_LOG_THROTTLE_CONFIG };
    }
    if (!config.hasOwnProperty('delay')) {
        config.delay = DEFAULT_LOG_THROTTLE_CONFIG.delay;
    }
    if (!config.hasOwnProperty('maxLogsPerAlert')) {
        config.maxLogsPerAlert = DEFAULT_LOG_THROTTLE_CONFIG.maxLogsPerAlert;
    }
    if (!config.hasOwnProperty('maxTimesInWindow')) {
        config.maxTimesInWindow = DEFAULT_LOG_THROTTLE_CONFIG.maxTimesInWindow;
    }
    if (!config.hasOwnProperty('windowTime')) {
        config.windowTime = DEFAULT_LOG_THROTTLE_CONFIG.windowTime;
    }
    if (!config.hasOwnProperty('durationPerTime')) {
        config.durationPerTime = DEFAULT_LOG_THROTTLE_CONFIG.durationPerTime;
    }
    return config;
}

export const setDefaultLogConfig = (config: LogConfig | undefined): LogConfig | undefined => {
    if (!config) return undefined;
    
    config.throttle = setDefaultLogThrottleConfig(config.throttle);
    return config;
}

export const setDefaultSkywalkingConfig = (config: SkywalkingConfig | undefined): SkywalkingConfig | undefined => {
    if (!config) return undefined;
    
    let { warn, log } = config;
    if (warn) {
        if (!warn.timeLimit) warn.timeLimit = { durationMinutes: 0 };
        warn.timeLimit.durationMinutes = warn.timeLimit.durationMinutes || 5;
    }
    config.metricLogPath = config.metricLogPath || path.resolve(process.cwd(), `.metric/${config.service}`);

    if (log) {
        log.throttle = setDefaultLogThrottleConfig(log.throttle);
    }

    return config;
}