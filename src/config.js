module.exports = {
    apps: [
        // 'test/test.apm.config.js',
    ],
    skywalking: {
        port: 12700,
        host: '0.0.0.0',
        // enableLogging: false,   //默认false, 是否开启skywalking日志收集, 若服务配置里需要启用skywalking日志, 则需设置 true
    },
    //推送配置
    notify: {
        // //飞书机器人消息推送
        // lark: {
        //     app_id: 'xxxx',
        //     app_secret: 'xxxxx',
        //     webhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxx',
        //     // secret: 'xxxxx',
        // },
        // //邮件推送
        // email: {
        //     mailTo: 'Jay Liang<jay.liang@magicfish.cn>,Kimi<xxx@xxx.com>',   //收件人地址, 多个地址用半角逗号隔开
        //     mailFrom: 'SRE<devops@xxx.com>',  //发件人信息
        //     smtp: {
        //         pool: true,
        //         host: "smtp.xxx.com",
        //         port: 465,
        //         secure: true, // use TLS
        //         auth: {
        //             user: "xxx@xxx.com",
        //             pass: "xxx",
        //         }
        //     }
        // }
    }
};