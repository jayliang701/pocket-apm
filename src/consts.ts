
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