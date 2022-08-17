# Pocket-APM
Pocket-APM 是一个开源的、轻量的应用性能监控和预警工具. 它具有以下特性:
- 对 Java 应用和 NodeJS 应用进行性能和日志监控;
- 异常预警, 性能或日志出现异常时可通过Email或飞书webhook推送预警报告;
- 无侵入, 不需要修改应用代码;
- 轻量, 不依赖任何数据库, 不需要耗费大量的硬件资源; 
- 支持同时监控多个应用, 配置灵活, 且修改配置或增减应用时无需重启;
- 使用Typescript编写, 代码可读性, 易于维护扩展.

## 什么场景适合使用 Pocket-APM
Pocket-APM 不具备强大的数据持久化能力, 所以并不适合用来管理应用的监控数据或进行日志分析处理. Pocket-APM 的设计目的是通过无侵入的方式让工程师能够获得应用出现异常及时得到预警通知的能力, 它适用于: 
- 你不想关心那些数量繁多的但又不关键的日志, 但又希望出现错误日志时能及时得到通知;
- 你没有足够的硬件和人力资源去部署和使用那些功能强大的APM工具;
- 你不需要时刻关注应用的运行性能, 只想在出现异常时及时得到通知.

## 安装和使用
### 源码安装
请确保你已经安装了NodeJS和NPM. 首先从 github 下载/克隆源码, 然后安装 npm 依赖包:
```bash
npm install
# or
# yarn
```

运行 Pocket-APM (默认使用 12700 端口):
```bash
npm run start
```



### 配置
Pocket-APM 默认使用源代码中的 ./config.js 作为配置文件. 你也可以修改这个文件，或者通过设置环境变量 CONFIG 使用自定义的配置文件.
```bash
# 这里使用跨平台环境变量工具 cross-env 作为举例说明
cross-env CONFIG='C:\\Users\\User\\Desktop\\config.js' npm run start
```

#### 应用监控配置
Pocket-APM 支持同时监控多个应用, 只需要在配置文件中的 apps 数组增加应用监控的配置.
```javascript
// config.js

module.exports = {
    apps: [
        // 建议使用绝对路径
        'test/app1.apm.config.js',   // 针对app1这个应用的监控配置
        'test/app2.apm.config.js',   // 针对app2这个应用的监控配置
        ...
    ],
    ...
}

```

每一个应用都有属于自己的监控配置, 请参考源代码中的 [./test/test.apm.config.js](https://github.com/jayliang701/pocket-apm/blob/main/test/test.apm.config.js) 文件.


#### 修改配置
无论是修改 config.js 或是 应用监控配置, 都无需重启 Pocket-APM 服务. Pocket-APM 会监控配置文件, 一旦配置文件被修改保存, Pocket-APM 将在数秒钟后自动加载最新的配置. 当你配置了多个应用监控时, 修改其中一个应用监控的配置不会导致其他应用监控的重新加载. 


### 应用性能监控
#### Java 应用性能监控
Pocket-APM 使用了 [Apache Skywalking 的部分 Google Proto 数据协议包](https://github.com/apache/skywalking-data-collect-protocol/tree/v9.1.0), 并使用 [Skywalking Java Agent](https://github.com/apache/skywalking-java) 作为 Java 应用的监控数据采集器. Agent 采集器将定时地通过 gRPC 向 Pocket-APM 发送 Java 应用的 CPU / 内存 / 线程 使用数据.

简单的使用方法:
1. 下载 [Skywalking Java Agent](https://github.com/apache/skywalking-java)
2. 在 Java 应用的 JVM 启动参数里增加以下配置:
```bash
-javaagent=/xx/xx/xx/skywalking-agent.jar 
-DSW_AGENT_NAME="my-java-app"  # 你自定义的应用的名称, 和 Pocket-APM 应用监控配置文件中的 skywalking.service 一致
-DSW_AGENT_COLLECTOR_BACKEND_SERVICES="127.0.0.1:12700"  # Pocket-APM 服务的连接地址和端口
```

#### NodeJS 应用性能监控
由于 Skywalking 官方的 NodeJS Agent 不提供对 NodeJS 应用的性能监控, 无法得知应用的 CPU 和内存使用数据, 因此我编写了 [nodejs-apm-agent](https://github.com/jayliang701/nodejs-apm-agent) 作为监控数据采集器. 目前支持 Node 原生启动方式和 pm2 托管方式.

使用方法:
1. 下载/克隆 [nodejs-apm-agent](https://github.com/jayliang701/nodejs-apm-agent) 源代码
2. 修改 agent 配置文件
```javascript
// ./agent.config.js
module.exports = {
    service: 'test-app',     //应用名称，和 Pocket-APM 的应用监控配置中的 skywalking.service 一致
    // serviceInstance: 'machine-01',   //[可选] 默认 agent 会自动生成
    serverAddress: '127.0.0.1:12700',   //Pocket-APM 服务的连接地址和端口
    collect: {
        metric: {
            enabled: true,
            duration: 5,     //秒, 每N秒发送一次 CPU 和 内存使用数据
        },
        logging: {
            enabled: true,
            globalVarName: 'logger',
        }
    }
}
```
2. 编译
```bash
npm run build
```
3. 通过修改 NodeJS 应用的启动参数注入采集器. <br/>
原生 node 启动方式
```bash
# 这里使用跨平台环境变量工具 cross-env 作为举例说明
cross-env APM_AGENT_CONFIG="{nodejs-apm-agent 下载/克隆路径}/dist/agent.config.js" node -r '{nodejs-apm-agent 下载/克隆路径}/dist/index.js' server
```
pm2 托管方式
```javascript
// pm2.json
{
    "apps": [
        {
            "name": "server",
            "script": "./server.js",
            "cwd":"./",
            "instances": 2,
            "exec_mode": "cluster",
            "node_args": "-r {nodejs-apm-agent 下载/克隆路径}/dist/index.js",
            "env": {
                "APM_AGENT_CONFIG": "{nodejs-apm-agent 下载/克隆路径}/dist/agent.config.js"
            },
            "env_production": {
               "NODE_ENV": "production"
            }
        }
    ]
}

pm2 start pm2.json
```


### 日志监控
Pocket-APM 可以作为单纯的日志异常监控工具, 一旦采集到的日志中出现异常 (或是你想要过滤的任何日志) 将自动出发预警报告. Pocket-APM 支持通过监控特定文件进行日志采集，也支持直接从应用的 Agent 通过 gRPC 方式采集日志.
#### 文件日志监控
在应用监控配置中 (如 ./test/test.apm.config.js) 配置 log.watch 即可添加你想要监控的文件:
```javascript
module.exports = {
    name: 'my-app',
    log: {
        ...
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
                ...
            }
        ]
    }
}
``` 

理论上 Pocket-APM 支持各种格式或类型的日志, 你需要根据实际情况修改 log 配置, 以便 Pocket-APM 可以正确解析日志字符串. 完整的配置说明请参考 [./test/test.apm.config.js](https://github.com/jayliang701/pocket-apm/blob/main/test/test.apm.config.js)


#### 应用日志监控
对于 [Skywalking Java Agent](https://github.com/apache/skywalking-java) 和 [nodejs-apm-agent](https://github.com/jayliang701/nodejs-apm-agent) 这两个应用采集代理, 都支持通过 gRPC 方式发送应用的日志.
首先要开启 Pocket-APM 的应用日志采集功能：
```javascript
// config.js
module.exports = {
    apps: [
        ...
    ],
    skywalking: {
        port: 12700,
        host: '0.0.0.0',
        enableLogging: true   //开启应用日志采集
    },
    ...
};
```
然后在应用监控配置中开启和配置日志采集:
```javascript
// test.apm.config.js
module.exports = {
    name: 'my-app',
    skywalking: {
        service: 'my-app',
		...,
        //开启 skywalking 日志收集, 如果不需要开启, 请删除整个 log 配置
        log: {
            level: 'ERROR',   //目标日志等级, 支持多个类型, 如 'ERROR|WARN', 默认 ERROR
            ...
        }
    },
    ...
};
```
完整的配置说明请参考 [./test/test.apm.config.js](https://github.com/jayliang701/pocket-apm/blob/main/test/test.apm.config.js)