import dayjs from "dayjs";
import ServiceHandler from "./ServiceHandler";
import { Log, LogLevel, ProcessLoggingAlert, SkywalkingConfig, SkywalkingLoggingCollectData, SkywalkingLoggingConfig } from "../../../types";

export default class JavaProcessLoggingHandler extends ServiceHandler {

    get service(): string {
        return 'LogReportService';
    }

    get loggingConfig(): SkywalkingLoggingConfig {
        return this.config.log;
    }
    
    levelFilter: Map<string, LogLevel> = new Map();

    override refresh(config: SkywalkingConfig): void {
        super.refresh(config);
        this.levelFilter.clear();

        this.loggingConfig.level.split('|').forEach(str => {
            str = str.trim();
            this.levelFilter.set(str, str as LogLevel);
        });
    }

    /**
     * data (ERROR) --> 
     * {
            "timestamp": "1659344636883",
            "service": "demo1",
            "serviceInstance": "617de483113148549ecb7a2f2bf4a2da@192.168.0.139",
            "endpoint": "POST:/api/account/login",
            "body": {
                "type": "TEXT",
                "text": {
                "text": "[2022-08-01 17:03:56.883] [http-nio-8181-exec-1] ERROR o.a.c.c.C.[.[localhost].[/].[dispatcherServlet] - Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.RuntimeException: something is wrong!] with root cause\njava.lang.RuntimeException: something is wrong!\n\tat jay.example.securitydemo.controller.AccountController.login$original$VlFu9Rbk(AccountController.java:44)\n\tat jay.example.securitydemo.controller.AccountController.login$original$VlFu9Rbk$accessor$SsmXI5AK(AccountController.java)\n\tat jay.example.securitydemo.controller.AccountController$auxiliary$EaO6MSTS.call(Unknown Source)\n\tat org.apache.skywalking.apm.agent.core.plugin.interceptor.enhance.InstMethodsInter.intercept(InstMethodsInter.java:86)\n\tat jay.example.securitydemo.controller.AccountController.login(AccountController.java)\n\tat sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n\tat sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)\n\tat sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)\n\tat java.lang.reflect.Method.invoke(Method.java:498)\n\tat org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:205)\n\tat org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:150)\n\tat org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:117)\n\tat org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandlerMethod(RequestMappingHandlerAdapter.java:895)\n\tat org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal(RequestMappingHandlerAdapter.java:808)\n\tat org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle(AbstractHandlerMethodAdapter.java:87)\n\tat org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:1067)\n\tat org.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:963)\n\tat org.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1006)\n\tat org.springframework.web.servlet.FrameworkServlet.doPost(FrameworkServlet.java:909)\n\tat javax.servlet.http.HttpServlet.service(HttpServlet.java:681)\n\tat org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:883)\n\tat javax.servlet.http.HttpServlet.service(HttpServlet.java:764)\n\tat org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:227)\n\tat org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\tat org.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:53)\n\tat org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\tat org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\tat org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:327)\n\tat org.springframework.security.web.access.intercept.AuthorizationFilter.doFilterInternal(AuthorizationFilter.java:73)\n\tat org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\tat org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:336)\n\tat org.springframework.security.web.access.ExceptionTranslationFilter.doFilter(ExceptionTranslationFilter.java:122)\n\tat org.springframework.security.web.access.ExceptionTranslationFilter.doFilter(ExceptionTranslationFilter.java:116)\n\tat org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:336)\n\tat org.springframework.security.web.session.SessionManagementFilter.doFilter(SessionManagementFilter.java:126)\n\tat org.springframework.security.web.session.SessionManagementFilter.doFilter(SessionManagementFilter.java:81)\n\tat org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:336)\n\tat org.springframework.security.web.authentication.AnonymousAuthenticationFilter.doFilter(AnonymousAuthenticationFilter.java:109)\n\tat org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:336)\n\tat org.springframework.security.web.servletapi.SecurityContextHolderAwareRequestFilter.doFilter(SecurityContextHolderAwareRequestFilter.java:149)\n\tat org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:336)\n\tat org.springframework.security.web.savedrequest.RequestCacheAwareFilter.doFilter(RequestCacheAwareFilter.java:63)\n\tat org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:336)\n\tat org.springframework.security.web.authentication.logout.LogoutFilter.doFilter(LogoutFilter.java:103)\n\tat org.springframework.security.web.authentication.logout.LogoutFilter.doFilter(LogoutFilter.java:89)\n\tat org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:336)\n\tat org.springframework.security.web.header.HeaderWriterFilter.doHeadersAfter(HeaderWriterFilter.java:90)\n\tat org.springframework.security.web.header.HeaderWriterFilter.doFilterInternal(HeaderWriterFilter.java:75)\n\tat org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\tat org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:336)\n\tat org.springframework.security.web.context.SecurityContextPersistenceFilter.doFilter(SecurityContextPersistenceFilter.java:112)\n\tat org.springframework.security.web.context.SecurityContextPersistenceFilter.doFilter(SecurityContextPersistenceFilter.java:82)\n\tat org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:336)\n\tat org.springframework.security.web.context.request.async.WebAsyncManagerIntegrationFilter.doFilterInternal(WebAsyncManagerIntegrationFilter.java:55)\n\tat org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\tat org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:336)\n\tat org.springframework.security.web.session.DisableEncodeUrlFilter.doFilterInternal(DisableEncodeUrlFilter.java:42)\n\tat org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\tat org.springframework.security.web.FilterChainProxy$VirtualFilterChain.doFilter(FilterChainProxy.java:336)\n\tat org.springframework.security.web.FilterChainProxy.doFilterInternal(FilterChainProxy.java:211)\n\tat org.springframework.security.web.FilterChainProxy.doFilter(FilterChainProxy.java:183)\n\tat org.springframework.web.filter.DelegatingFilterProxy.invokeDelegate(DelegatingFilterProxy.java:354)\n\tat org.springframework.web.filter.DelegatingFilterProxy.doFilter(DelegatingFilterProxy.java:267)\n\tat org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\tat org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\tat org.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:100)\n\tat org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\tat org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\tat org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\tat org.springframework.web.filter.FormContentFilter.doFilterInternal(FormContentFilter.java:93)\n\tat org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\tat org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\tat org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\tat org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:201)\n\tat org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:117)\n\tat org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:189)\n\tat org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:162)\n\tat org.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:197)\n\tat org.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:97)\n\tat org.apache.catalina.authenticator.AuthenticatorBase.invoke(AuthenticatorBase.java:541)\n\tat org.apache.catalina.core.StandardHostValve.invoke$original$A64WFX5v(StandardHostValve.java:135)\n\tat org.apache.catalina.core.StandardHostValve.invoke$original$A64WFX5v$accessor$Rn1kYeQ3(StandardHostValve.java)\n\tat org.apache.catalina.core.StandardHostValve$auxiliary$RtPzUtnV.call(Unknown Source)\n\tat org.apache.skywalking.apm.agent.core.plugin.interceptor.enhance.InstMethodsInter.intercept(InstMethodsInter.java:86)\n\tat org.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java)\n\tat org.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:92)\n\tat org.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:78)\n\tat org.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:360)\n\tat org.apache.coyote.http11.Http11Processor.service(Http11Processor.java:399)\n\tat org.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:65)\n\tat org.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:890)\n\tat org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1743)\n\tat org.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:49)\n\tat org.apache.tomcat.util.threads.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1191)\n\tat org.apache.tomcat.util.threads.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:659)\n\tat org.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61)\n\tat java.lang.Thread.run(Thread.java:748)\n"
                },
                "content": "text"
            },
            "traceContext": {
                "traceId": "d1395abef420421a8a67831dc1208976.70.16593446365660001",
                "traceSegmentId": "d1395abef420421a8a67831dc1208976.70.16593446365660000",
                "spanId": 0
            },
            "tags": {
                "data": [
                {
                    "key": "level",
                    "value": "ERROR"
                },
                {
                    "key": "logger",
                    "value": "org.apache.catalina.core.ContainerBase.[Tomcat].[localhost].[/].[dispatcherServlet]"
                },
                {
                    "key": "thread",
                    "value": "http-nio-8181-exec-1"
                }
                ]
            },
            "layer": ""
        }
     */

    private levelIndex: number = 0;
    private prevLogTime: number = 0;
    
    private pendingAlerts: Record<string, Log[]> = {};
    private timers: Record<string, any> = {};

    collect(data: SkywalkingLoggingCollectData): void {
        const { timestamp, serviceInstance } = data;
        if (Number(timestamp) < this.prevLogTime) {
            return;
        }
        const level = this.parseLoggingLevel(data);

        if (!this.levelFilter.has(level)) {
            return;
        }
        if (this.loggingConfig.filter && !this.loggingConfig.filter(data, level)) {
            return;
        }

        const log = this.parseLog(data);
        if (!this.pendingAlerts[serviceInstance]) {
            this.pendingAlerts[serviceInstance] = [];
        }
        this.pendingAlerts[serviceInstance].push(log);

        this.checkAlert(serviceInstance);
    }

    private checkAlert(serviceInstance: string,): void {
        const logs = this.pendingAlerts[serviceInstance];
        if (!logs || logs.length < 1) return;

        if (!this.timers[serviceInstance]) {
            this.timers[serviceInstance] = setTimeout(async () => {
                delete this.timers[serviceInstance];
                try {
                    let alerts = [...logs];
                    logs.length = 0;

                    const payload: ProcessLoggingAlert = {
                        service: this.config.service,
                        serviceInstance,
                        alerts,
                    };
                    this.emitUpdate(payload);
                } catch (err) {
                    console.error(err);
                }
            }, (this.loggingConfig?.throttle?.delay) * 1000);
        }
    }

    private parseDateTime(data: SkywalkingLoggingCollectData): string {
        return dayjs(Number(data.timestamp)).format('YYYY-MM-DD HH:mm:ss.sss');
    }

    private parseLogText(data: SkywalkingLoggingCollectData): string {
        if (data.body.text) {
            return data.body.text.text;
        }
        return `${data.body.json || data.body.yaml}`;
    }

    private parseLog(data: SkywalkingLoggingCollectData): Log {
        const time = this.parseDateTime(data);
        const text = this.parseLogText(data);
        return {
            time,
            lines: [ text ],
        }
    }

    private parseLoggingLevel(data: SkywalkingLoggingCollectData): LogLevel {
        const { tags } = data;
        let type: LogLevel = 'INFO';
        if (tags && tags.data && tags.data.length > 0) {
            let tag = tags.data.length > this.levelIndex ? tags.data[this.levelIndex] : undefined;
            if (tag && tag.key === 'level') {
                type = tag.value as LogLevel;
            } else {
                for (let i = 0; i < tags.data.length; i ++) {
                    let tagItem = tags.data[i];
                    if (tagItem && tagItem.key === 'level') {
                        type = tagItem.value as LogLevel;
                        this.levelIndex = i;
                        break;
                    }
                }
            }
        }
        return type;
    }

}
