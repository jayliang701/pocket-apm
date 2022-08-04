import { Log } from "../types";
import { ChainNode } from "./Chain";


export default class LogNode extends ChainNode<Log> {
    private id: string;

    override get key() {
        return this.id;
    }

    constructor(value: Log) {
        super(value);
        //尽可能保证id唯一性
        let str: string = value.lines[value.lines.length - 1];
        str = str.length > 8 ? str.substring(str.length - 8) : str;
        this.id = value.time + str;
    }
}