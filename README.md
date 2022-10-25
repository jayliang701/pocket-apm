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

## 设计实现
Pocket-APM 会根据配置文件, 为每一个需要监控的应用创建 (fork) 一个独立的 child_process 监控进程. 每一个监控进程将独自管理对应的应用配置, 处理日志文件监控. 对于来自应用 Agent 采集器的 gRPC 数据, 由 Pocket-APM 主进程接收并根据应用的名称, 分发到对应的 child_process 监控进程中, 由监控进程处理 gRPC 采集数据, 以及决定是否要发出异常预警报告. 
| :zap:         每一个应用监控都是独立的, 且与其他应用监控隔离. |
|--------------------------------------------------------|

![Pocket-APM 设计实现](https://raw.githubusercontent.com/jayliang701/pocket-apm/main/doc/imgs/how-pocket-apm-works.jpg "How Pocket-APM works")

## 安装和使用
### 源码方式
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

### Docker方式
Pocket-APM 仍处于测试阶段, 因此我并没有将它打包上传到 Docker Hub，如果你想以 Docker 方式运行, 请参考以下步骤:
```bash
# 从 github 下载/克隆源码, 然后安装 npm 依赖包
npm install
# or
# yarn

# 打包 Docker 镜像
npm run build:docker

# 启动 Docker 镜像
docker run --name pocket-apm -p 12700:12700 -v "some_where_in_host/conf:/pocket-apm/conf" -d pocket-apm:latest
```
在宿主机上创建一个目录, 用于存放 config.js 和应用配置js文件, 例如:
```
|-- some_where_in_host
|   |-- conf
|   |   |-- config.js
|   |   |-- apps
|   |   |   |-- app1.apm.config.js
|   |   |   |-- app2.apm.config.js
|   |   |   |-- app3.apm.config.js
```
在 config.js 配置文件中使用 /pocket-apm/conf 作为应用配置文件的绝对路径:
```javascript
// config.js

module.exports = {
    apps: [
        '/pocket-apm/conf/apps/app1.apm.config.js',
        '/pocket-apm/conf/apps/app2.apm.config.js',
        ...
    ],
    ...
}

``` 
请设置好配置文件后, 再启动 Docker 镜像:
```bash
docker run --name pocket-apm -p 12700:12700 -v "some_where_in_host/conf:/pocket-apm/conf" -d pocket-apm:latest
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

### 预警报告推送
Pocket-APM 的设计目的就是在应用出现异常时能迅速的将异常信息推送给工程师. 目前 Pocket-APM 支持飞书机器人和 Email 推送. 
#### 飞书机器人推送
飞书机器人推送指的是通过调用飞书机器人 webhook 接口, 向飞书群组发送预警报告. 飞书机器人配置请参考 [飞书自定义机器人指南](https://open.feishu.cn/document/ukTMukTMukTM/ucTM5YjL3ETO24yNxkjN). 如果你不需要飞书推送, 请删除整个 notify.lark 配置.
```javascript
// config.js

module.exports = {
    ...
    notify: {
        //[可选] 飞书机器人消息推送
        lark: {
            app_id: '飞书应用app_id',   //[可选]
            app_secret: '飞书应用秘钥',   //[可选]
            webhook: '飞书机器人webhook接口地址',
            secret: 'webhook接口秘钥',   //[可选]
        },
        ...
    }
}
```
飞书应用 app_id 和秘钥并不是必须的, 但如果你希望收到的预警报告带有图表图片, 那么你才需要创建一个飞书应用并设置 app_id 和秘钥, 否则 Pocket-APM 将只推送文字信息. 请注意, 配置飞书应用后, 需要开通应用的上传图片权限, 并发布应用. 请参考 [飞书应用权限](https://open.feishu.cn/document/ukTMukTMukTM/uQjN3QjL0YzN04CN2cDN?lang=zh-CN).


#### Email 推送
如果你不需要 Email 推送, 请删除整个 notify.email 配置.
```javascript
// config.js

module.exports = {
    ...
    notify: {
        ...
        //邮件推送
        email: {
            mailTo: 'Jay Liang<xxx@xxx.com>',   //收件人地址, 多个地址用半角逗号隔开
            mailFrom: 'SRE<xxxx@xxxx.com>',  //发件人信息
            smtp: {
                // 这里以 腾讯企业邮箱 为例
                pool: true,
                host: "smtp.exmail.qq.com",
                port: 465,
                secure: true, // use TLS
                auth: {
                    user: "xxxx@xxxx.com",
                    pass: "xxxxxxx",
                }
            }
        }
    }
}
```
Pocket-APM 使用 [nodemailer](https://www.npmjs.com/package/nodemailer) 发送邮件, email.smtp 配置可参考 [Nodermailer SMTP transport](https://nodemailer.com/smtp/).

### 应用性能监控
#### Java 应用性能监控
Pocket-APM 使用了 [Apache Skywalking 的部分 Google Proto 数据协议包](https://github.com/apache/skywalking-data-collect-protocol/tree/v9.1.0), 并使用 [Skywalking Java Agent](https://github.com/apache/skywalking-java) 作为 Java 应用的监控数据采集器. Agent 采集器将定时地通过 gRPC 向 Pocket-APM 发送 Java 应用的 CPU / 内存 / 线程 使用数据.

简单的使用方法:
1. 下载 [Skywalking Java Agent](https://github.com/apache/skywalking-java)
2. 在 Java 应用的 JVM 启动参数里增加以下配置:
```bash
-javaagent:/xx/xx/xx/skywalking-agent.jar 
-DSW_AGENT_NAME="my-java-app"  # 你自定义的应用的名称, 和 Pocket-APM 应用监控配置文件中的 skywalking.service 一致
-DSW_AGENT_COLLECTOR_BACKEND_SERVICES="127.0.0.1:12700"  # Pocket-APM 服务的连接地址和端口
3. 启动 Java 应用
```

#### NodeJS 应用性能监控
由于 Skywalking 官方的 NodeJS Agent 不提供对 NodeJS 应用的性能监控, 无法得知应用的 CPU 和内存使用数据, 因此我编写了 [nodejs-apm-agent](https://github.com/jayliang701/nodejs-apm-agent) 作为监控数据采集器. 目前支持 Node 原生启动方式和 pm2 托管方式.

使用方法请移步 [nodejs-apm-agent](https://github.com/jayliang701/nodejs-apm-agent)


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
这种日志采集方式无关日志内容是由什么应用程序生成的, 因此理论上你可以监控用任意编程语言(如 Go, C++, PHP等)编写的应用程序所产生的日志, 前提是你需要编写正确的正则表达式或函数, 使得 Pocket-APM 能够识别日志内容. 关于日志过滤器的配置, 请参考 [./test/test.apm.config.js](https://github.com/jayliang701/pocket-apm/blob/main/test/test.apm.config.js) 
> :warning: **在当前最新版本中, 如果使用 Docker 方式运行, 将无法以监控文件的方式采集日志**, 因为 Pocket-APM 在 Docker 容器中无法识别文件位置.


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
