import { ThrottleConfig } from "../types";

type ThrottleFunc = (...rest: any[]) => any;

export function throttle<T extends ThrottleFunc>(fn: T, { maxTimesInWindow, windowTime }: ThrottleConfig): T {
    let timeWindowStartTime = 0;
    var timeWindowEndTime = 0;
    let count = 0;
    const ret = (...rest: any[]) => {
        let now = Date.now();
        if (timeWindowEndTime && now > timeWindowEndTime) {
            //next time window
            timeWindowStartTime = 0;
            timeWindowEndTime = 0;
            count = 0;
            // console.log('next time window');
        }

        if (!timeWindowStartTime) {
            timeWindowStartTime = now;
            timeWindowEndTime = timeWindowStartTime + windowTime * 1000;
        }
        count ++;
        if (count > maxTimesInWindow) {
            //during time window, block execution
            if (timeWindowStartTime <= now && now <= timeWindowEndTime) {
                // console.log('block...');
                return;
            }
            count = 0;
        }
        return fn.apply(null, rest);
    };
    return ret as T;
}

export default class Throttle {

    private timeWindowStartTime: number = 0;

    private timeWindowEndTime: number = 0;

    private count: number = 0;
    
    private config: ThrottleConfig;

    get isBlocked(): boolean {
        const now = Date.now();
        if (this.count >= this.config.maxTimesInWindow && 
            (this.timeWindowStartTime <= now && now <= this.timeWindowEndTime)) {
            return true;
        }
        return false;
    }

    setConfig(config: ThrottleConfig) {
        this.config = config;
        if (this.timeWindowStartTime && this.timeWindowEndTime) {
            this.timeWindowEndTime = this.timeWindowStartTime + this.config.windowTime * 1000;
        }
        // console.log('throttle update...')
    }

    execute<T extends ThrottleFunc>(fn: T, ...rest: Parameters<T>) {
        let now = Date.now();
        if (this.timeWindowEndTime && now > this.timeWindowEndTime) {
            //next time window
            this.timeWindowStartTime = 0;
            this.timeWindowEndTime = 0;
            this.count = 0;
            // console.log('next time window');
        }

        if (!this.timeWindowStartTime) {
            this.timeWindowStartTime = now;
            this.timeWindowEndTime = this.timeWindowStartTime + this.config.windowTime * 1000;
        }
        this.count ++;
        if (this.count > this.config.maxTimesInWindow) {
            //during time window, block execution
            if (this.timeWindowStartTime <= now && now <= this.timeWindowEndTime) {
                // console.log('block...');
                return;
            }
            this.count = 0;
        }
        fn.apply(null, rest);
    }
}
