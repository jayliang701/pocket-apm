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
