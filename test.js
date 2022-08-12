const path = require('path');

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

cleaner.checkClean();