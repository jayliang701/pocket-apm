import { AppConfig } from "../types";
import { FSWatcher, watch } from 'fs';
import { readFile } from 'fs/promises';

export default class ConfigWatcher<T> {

    protected config: T;

    public getConfig(): T {
        return this.config;
    }

    protected configFile: string;

    protected configWatcher: FSWatcher;
    
    protected reloadTimer: any;

    constructor(configFile: string) {
        this.configFile = configFile;
    }

    async start() {
        this.stopWatchConfig();

        await this.reloadConfig();

        this.configWatcher = watch(this.configFile, { encoding: 'utf8' }, () => {
            this.triggeReloadConfig();
        });
    }

    protected triggeReloadConfig() {
        this.stopReload();

        this.reloadTimer = setTimeout(() => this.reloadConfig(), 3000);
    }

    protected stopReload() {
        if (this.reloadTimer) {
            clearTimeout(this.reloadTimer);
            this.reloadTimer = undefined;
        }
    }

    protected stopWatchConfig() {
        if (this.configWatcher) {
            this.configWatcher.close();
            this.configWatcher = undefined;
        }
    }

    protected checkConfigFormat(config: AppConfig) {
        
    }

    protected setConfigDefaults() {

    }

    protected async reloadConfig() {
        const content = await readFile(this.configFile, 'utf8');
        try {
            const mod = eval(content);
            this.checkConfigFormat(mod);
            this.setConfigDefaults();
            console.log('config reloaded ---> ', this.configFile);
            this.config = mod;

            await this.afterReload();

        } catch (err) {
            console.error('config reload error. ', err);
        }
    }

    protected async afterReload() {
        
    }

    async dispose() {
        this.stopReload();
        this.stopWatchConfig();
    }

}


