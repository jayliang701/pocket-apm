module.exports = {
    apps: [
        '/Users/jay/Documents/projects/library/pocket-apm/test/test.apm.config.js',
    ],
    skywalking: {
        port: 11800,
        host: '0.0.0.0',
    },
    //推送配置
    notify: {
        //飞书机器人消息推送
        lark: {
            webhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx',
            // producer: '/my_path/lark_producer.js'
        },
        //邮件推送
        email: {
            mailTo: 'Jay Liang<jay.liang@magicfish.cn>,Kimi<xxx@xxx.com>',   //收件人地址, 多个地址用半角逗号隔开
            mailFrom: 'SRE<devops@xxx.com>',  //发件人信息
            smtp: {
                pool: true,
                host: "smtp.xxx.com",
                port: 465,
                secure: true, // use TLS
                auth: {
                    user: "xxx@xxx.com",
                    pass: "xxx",
                }
            }
        }
    }
};