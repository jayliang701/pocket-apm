import dayjs from 'dayjs';
import Duration from 'dayjs/plugin/duration';
import RelativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn'; 

export const initTimeUtil = () => {
    dayjs.extend(Duration);
    dayjs.extend(RelativeTime);
    dayjs.locale('zh-cn');
}

const UTF8 = 'utf-8';

export const buildFilledString = (val: string, size: number, fill: string | number = '0'): string => {
    const buffer = buildFilledBuffer(val, size, fill);
    return buffer.toString(UTF8);
}

export const buildFilledBuffer = (val: string, size: number, fill: string | number = '0'): Buffer => {
    const buffer = Buffer.alloc(size, fill, UTF8);
    buffer.write(val, size - val.length, val.length, UTF8);
    return buffer;
}

export function loopHash<T>(hash: Record<any, T>, map: (element: T, key?: any) => Promise<void> | void) {
    for (let key in hash) {
        map(hash[key], key);
    }
}

export function deepSet<S extends object, T extends object>(src: S, target: T, ignoreKeys?: Record<any, true>): T {
    for (let key in src) {
        if (ignoreKeys && ignoreKeys[key]) continue;
        const val = src[key];
        const kt = key as any;
        if (typeof val === 'object' && !(val instanceof RegExp || val instanceof Date)) {
            target[kt] = deepSet(val as any, target[kt] || {});
        } else {
            target[kt] = src[key];
        }
    }
    return target;
}