import { AppConfig, Worker } from "../types";
import AppNode from "./AppNode";

export default class Monitor implements Worker {

    protected appNode: AppNode;

    private _id: string;

    get id(): string {
        return this._id;
    }

    get config(): AppConfig {
        return this.appNode?.getConfig();
    }
    
    protected reloadTimer: any;

    constructor(appNode: AppNode, id?:string) {
        this.appNode = appNode;
        this._id = id ? id : `${appNode.id}@${Date.now() + '-' + Math.round(Math.random() * 1000000 + Math.random() * 1000000)}`;
    }

    async start() {
        
    }

    async refresh() {

    }

    async dispose() {
    }

}


