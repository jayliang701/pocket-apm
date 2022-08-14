
export class ReleaseKey {

    private lock: ReentrantLock;

    private _isDisposed: boolean = false;

    public get isDisposed(): boolean {
        return this._isDisposed;
    }

    constructor(lock: ReentrantLock) {
        this.lock = lock;
    }

    public dispose() {
        this._isDisposed = true;
    }
}

export class ReentrantLock {

    private isLocked: boolean = false;

    private timer: NodeJS.Timer;

    private resolveList: { key: ReleaseKey; resolve: (key: ReleaseKey) => Promise<any | void> | any | void }[] = [];

    public getPendingLen(): number {
        return this.resolveList.length;
    }

    private holder: ReleaseKey;

    lock(): Promise<ReleaseKey> {
        return new Promise((resolve) => {
            const key = new ReleaseKey(this);

            if (!this.isLocked && this.resolveList.length < 1) {
                this.holder = key;
                this.isLocked = true;
                resolve(key);
                return;
            }

            this.resolveList.push({ key, resolve });
            if (!this.timer) {
                this.timer = setInterval(this.check, 20);
            }
        });
    }

    private check = () => {
        if (this.resolveList.length < 1) {
            clearInterval(this.timer)
            this.timer = undefined;
            return;
        }
        if (!this.isLocked) {
            const { key, resolve } = this.resolveList.shift();
            if (key.isDisposed) {
                this.check();
                return;
            }
            this.holder = key;
            this.isLocked = true;
            resolve(key);
        }
    }

    release(key: ReleaseKey): boolean {
        if (this.holder !== key) {
            return false;
        }
        this.isLocked = false;
        this.holder = undefined;
        return true;
    }

}

const locks: Map<string, ReentrantLock> = new Map();

export const reentrantLock = (resource: string): Promise<ReleaseKey> => {
    let lock: ReentrantLock;
    if (!locks.has(resource)) {
        lock = new ReentrantLock();
        locks.set(resource, lock);
    } else {
        lock = locks.get(resource);
    }
    return lock.lock();
}

export const releaseLock = (resource: string, key: ReleaseKey): boolean => {
    let lock: ReentrantLock;
    if (!locks.has(resource)) {
        return false;
    } else {
        lock = locks.get(resource);
    }
    let flag = lock.release(key);
    if (flag && lock.getPendingLen() === 0) {
        locks.delete(resource);
    }
    return flag;
}