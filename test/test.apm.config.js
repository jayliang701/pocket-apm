module.exports = {
    name: 'demo1',
    // publicIP?: string;
    // privateIP?: string;
    skywalking: {
        service: 'demo1',
        warn: {
            timeLimit: {
                durationMinutes: 5,  //每次预警时间间隔（分钟）
            },
            jvm: {
                cpu: 0.1,  //0 ~ 100, N分钟 (timeLimit.durationMinutes) 内CPU平均使用率达到该值时将发出预警消息
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
        throttle: {
            delay: 5,   // 秒, 表示每次通知间隔是几秒, 比如第一条错误日志出现时开始计时, 在随后的N秒内如果还出现其他错误日志, 则等到30秒后一并发送通知
            maxLogsPerAlert: 10,   // 每次通知最多包括几条日志
            // maxTimesInWindow: 1,  //在时间窗口中最多发送几次
            // windowTime: 60 * 60,  // 秒，时间窗口
        },
        watch: [
            //支持字符串类型, 直接设置日志文件路径, 默认使用全局的日志过滤器配置
            '/Users/jay/Documents/projects/library/pocket-apm/test/test1.log',
            '/Users/jay/Documents/projects/library/pocket-apm/test/test2.log',
            //自定义配置
            {
                file: '/Users/jay/Documents/projects/library/pocket-apm/test/test.log',
                // 每一个要监控的日志文件，都可以独立配置日志过滤器，默认使用全局的日志过滤器配置
                // dateTimeFilter: /\[\d\d\d\d\-\d\d\-\d\d\s\d\d:\d\d:\d\d(\.\d\d\d)?\]/,
                // logFilter: /^(\[\d\d\d\d\-\d\d\-\d\d\s\d\d:\d\d:\d\d(\.\d\d\d)?\]\s+\[.+\]\s+(ERROR|INFO|DEBUG|WARN)\s+)/,
                // errorLogFilter: /^(\[\d\d\d\d\-\d\d\-\d\d\s\d\d:\d\d:\d\d(\.\d\d\d)?\]\s+\[.+\]\s+ERROR\s+)/,
            },
        ]
    },
};