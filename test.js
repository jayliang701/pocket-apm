const { appendFile } = require('fs/promises');
const path = require('path');
const { reentrantLock, releaseLock } = require('./dist/src/lib/utils/ReentrantLock');

const MetricCleaner = require('./dist/src/lib/monitor/skywalking/MetricCleaner').default;

const cleaner = new MetricCleaner();
cleaner.refresh({
    service: 'demo1',
    metricLogPath: path.resolve(__dirname, '.metric/demo1'),
    clean: {
        metricFile: {
            maxSize: 2,
            keepPect: 1/4,
            schedule: '0 * * * *',
        }
    },
    warn: {
        durationMinutes: 5,  //每次预警时间间隔（分钟）, 默认5分钟
        // throttle: {
        //     maxTimesInWindow: 2,  //在时间窗口中最多发送几次, 默认2次
        //     windowTime: 60 * 60,  //秒，时间窗口, 默认1小时
        //     durationPerTime: 20 * 60,  //秒, 每次通知的时间间隔, 默认20分钟
        // },
        jvm: {
            cpu: 40.00,  //0 ~ 100, N分钟 (durationMinutes) 内CPU平均使用率达到该值时将发出预警消息
        },
        nodejs: {
            cpu: 40.00,  //0 ~ 100, N分钟 (durationMinutes) 内CPU平均使用率达到该值时将发出预警消息
        }
    },
    //开启 skywalking 日志收集
    log: {
        level: 'ERROR',   //目标日志等级, 支持多个类型, 如 'ERROR|WARN', 默认 ERROR
        /* 自定义过滤函数 
        filter: (log, level) => {
            //log --> SkywalkingLoggingCollectData
            //level --> ERROR, WARN...
            return true;   //true -> pick,  false -> ignore
        },
        */
        debounce: {
            delay: 5,   //秒, 节流, 比如第一条错误日志出现时开始计时, 在随后的N秒内如果还出现其他错误日志, 则等到最后一并发送通知
            maxNum: 5,   //最多保留几条日志
        },
        throttle: {
            // maxTimesInWindow: 1,  //在时间窗口中最多发送几次, 默认2次
            // windowTime: 60 * 60,  //秒，时间窗口, 默认1小时
            // durationPerTime: 20 * 60,  //秒, 每次通知的时间间隔, 默认20分钟
        }
    }
    // metricLogPath: '/xxx/xxx/xx',   //记录metric数据的文件存放路径, 默认为 ${process.cwd()}/.metric/${service}
});

const res = 'F:\\projects\\library\\pocket-apm\\.metric\\demo1\\a68655d283044206c102dd7a0821b93b_192.168.0.117-nodejs.log';

// setTimeout(async () => {
//     console.log('[2] try to append file');
//     const key = await reentrantLock(res);
//     console.log('[2] get lock');
//     await appendFile(res, '1660288440000 0022248 000.0000 000033 0000002158996\n', { encoding: 'utf-8' });
//     console.log('[2] append !!');
//     releaseLock(res, key);
// }, 2000);

// setTimeout(async () => {
//     console.log('[3] try to append file');
//     const key = await reentrantLock(res);
//     console.log('[3] get lock');
//     await appendFile(res, '1660288441111 0022248 000.0000 000033 0000002158996\n', { encoding: 'utf-8' });
//     console.log('[3] append !!');
//     releaseLock(res, key);
// }, 3000);
cleaner.checkClean();