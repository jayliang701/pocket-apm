import Throttle from "../src/lib/utils/Throttle";

const sleep = (delay: number): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, delay);
    });
}

describe("throttle", () => {
    beforeAll(async () => {
        //
    });

    afterAll(async () => {
        //
    });

    test("block", async () => {
        const throttle = new Throttle();
        throttle.setConfig({
            durationPerTime: 0,
            windowTime: 1,
            maxTimesInWindow: 2,
        });

        let count = 0;

        const job = () => {
            count ++;
        }

        throttle.execute(job);
        await sleep(100);
        throttle.execute(job);
        await sleep(100);
        throttle.execute(job);
        throttle.execute(job);
        expect(count).toBe(2);
        expect(throttle.isBlocked).toBe(true);

        await sleep(900);
        throttle.execute(job);

        expect(throttle.isBlocked).toBe(false);
        expect(count).toBe(3);

        throttle.execute(job);
        throttle.execute(job);
        throttle.execute(job);

        expect(count).toBe(4);
        expect(throttle.isBlocked).toBe(true);
        await sleep(1000);
        expect(throttle.isBlocked).toBe(false);
    });
});
