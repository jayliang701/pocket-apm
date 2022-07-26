import { AppConfig, Config, Worker } from "../types";
import TypedEventEmitter, { TypedEvents } from "../utils/TypedEventEmitter";
import AppNode from "./AppNode";

export interface IMonitor {
    readonly id: string;
    readonly config: AppConfig;
    readonly mainConfig: Config;
}

export type MonitorEvents<T extends TypedEvents> = {
    refresh: (monitor: IMonitor) => Promise<void> | void;
} & T;

export default class Monitor<T extends MonitorEvents<{}> = MonitorEvents<{}>> extends TypedEventEmitter<T> implements Worker, IMonitor {

    protected appNode: AppNode;

    private _id: string;

    get id(): string {
        return this._id;
    }

    get config(): AppConfig {
        return this.appNode?.getConfig();
    }

    get mainConfig(): Config {
        return this.appNode?.getMainConfig();
    }
    
    protected reloadTimer: any;

    constructor(appNode: AppNode, id?:string) {
        super();
        this.appNode = appNode;
        this._id = id ? id : `${appNode.id}@${Date.now() + '-' + Math.round(Math.random() * 1000000 + Math.random() * 1000000)}`;
    }

    async start() {
        
    }

    async refresh() {      
        (this as TypedEventEmitter<MonitorEvents<{}>>).emit('refresh', this);
    }

    async dispose() {
    }

}


