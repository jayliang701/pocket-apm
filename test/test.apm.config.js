module.exports = {
    name: 'demo1',
    // publicIP?: string;
    // privateIP?: string;
    skywalking: {
        service: 'demo1',
        warn: {
            durationMinutes: 5,  //每次预警时间间隔（分钟）, 默认5分钟
            // throttle: {
            //     maxTimesInWindow: 2,  //在时间窗口中最多发送几次, 默认2次
            //     windowTime: 60 * 60,  //秒，时间窗口, 默认1小时
            //     durationPerTime: 20 * 60,  //秒, 每次通知的时间间隔, 默认20分钟
            // },
            jvm: {
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
    },
    log: {
        // dateTimeFilter: /\[\d\d\d\d\-\d\d\-\d\d\s\d\d:\d\d:\d\d(\.\d\d\d)?\]/,
        /* 用函数方式从事件的首行日志文本中解析出日期时间
        dateTimeFilter: (line) => {
            // line --> string
            // e.g: 2022-04-06 20:48:52.322 [http-nio-7455-exec-9] ERROR com.ugeez.commons.security....
 
            // 返回事件时间
            // return '2022-04-06 20:48:52';
        },
        */
        dateTimeFilter: (line) => {
            const reg = /\[\d\d\d\d\-\d\d\-\d\d\s\d\d:\d\d:\d\d(\.\d\d\d)?\]/;
            let parts = line.match(reg);
            if (parts && parts[0]) {
                return parts[0].substr(1, parts[0].length - 2);
            }
            return undefined;
        },
        logFilter: /^(\[\d\d\d\d\-\d\d\-\d\d\s\d\d:\d\d:\d\d(\.\d\d\d)?\]\s+\[.+\]\s+(ERROR|INFO|DEBUG|WARN)\s+)/,
        /* 用函数方式判断一行日志文本是否是事件的开头
        logFilter: (line) => {
            // line --> string
            // e.g: 2022-04-06 20:48:52.322 [http-nio-7455-exec-9] ERROR com.ugeez.commons.security....
 
            // return true / false;
        },
        */
        errorLogFilter: /^(\[\d\d\d\d\-\d\d\-\d\d\s\d\d:\d\d:\d\d(\.\d\d\d)?\]\s+\[.+\]\s+ERROR\s+)/,
        /* 用函数方式判断一行日志文本是否是异常事件的开头
        errorLogFilter: (line) => {
            // line --> string
            // e.g: 2022-04-06 20:48:52.322 [http-nio-7455-exec-9] ERROR com.ugeez.commons.security....

            // return true / false;
        },
        */
        timeCheck: false,       //是否开启日志时间检查, 默认false
                                //为false时, pocket-apm不会在采集阶段处理日志时间(即不会将 dateTimeFilter 解析出的结果再变成时间戳), 以便获得更好的性能
                                //如果日志时间字符串无法变成时间戳(dayjs无法解析), 则跳过日志时间检查
                                //为true时, pocket-apm会解析每条目标日志(即满足 errorLogFilter 的日志)的时间,
                                //并丢弃不满足时间连续性的日志(即新采集到的日志的时间不得早于之前已采集日志的时间)
                                //第一条被采集日志的时间将和watch的启动时间做对比
        debounce: {
            delay: 6,   //秒, 比如第一条错误日志出现时开始计时, 在随后的N秒内如果还出现其他错误日志, 则等到最后一并发送通知
            maxNum: 5,   //最多保留几条日志
        },
        throttle: {
            maxTimesInWindow: 2,  //在时间窗口中最多发送几次, 默认2次
            windowTime: 15,  //秒，时间窗口, 默认1小时
            durationPerTime: 20 * 60,  //秒, 每次通知的时间间隔, 默认20分钟
        },
        watch: [
            //支持字符串类型, 直接设置日志文件路径, 默认使用全局的日志过滤器配置
            'test/test1.log',
            'test/test2.log',
            //自定义配置
            {
                file: 'test/test.log',
                // 每一个要监控的日志文件，都可以拥有独立的日志配置，默认使用全局的日志配置
                // timeCheck: boolean;
                // debounce: {...},
                // throttle: {...},
                // dateTimeFilter: /\[\d\d\d\d\-\d\d\-\d\d\s\d\d:\d\d:\d\d(\.\d\d\d)?\]/,
                // logFilter: /^(\[\d\d\d\d\-\d\d\-\d\d\s\d\d:\d\d:\d\d(\.\d\d\d)?\]\s+\[.+\]\s+(ERROR|INFO|DEBUG|WARN)\s+)/,
                // errorLogFilter: /^(\[\d\d\d\d\-\d\d\-\d\d\s\d\d:\d\d:\d\d(\.\d\d\d)?\]\s+\[.+\]\s+ERROR\s+)/,
            },
        ]
    },
};