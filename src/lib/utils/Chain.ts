export class ChainNode<T extends any = { id: string }> {
    public left: ChainNode<T> | undefined;
    public right: ChainNode<T> | undefined;
    protected _value: T;

    get key() {
        return this._value['id'];
    }

    get value() {
        return this._value;
    }

    constructor(value: T) {
        this._value = value;
    }
}

export default class Chain<T extends any = { id: string }> {
    protected first: ChainNode<T> | undefined;
    protected last: ChainNode<T> | undefined;
    protected nodes: Map<string, ChainNode<T>> = new Map();
    protected size: number = 0;
    protected maxLen: number = 0;

    get length() {
        return this.size;
    }

    get head() {
        return this.first;
    }

    get tail() {
        return this.last;
    }

    get maxSize() {
        return this.maxLen;
    }

    set maxSize(maxLen: number) {
        this.maxLen = maxLen;
        while (this.maxLen > 0 && this.size > this.maxLen) {
            this.remove(this.head);
        }
    }

    constructor(maxSize: number = 0) {
        this.maxLen = maxSize;
    }

    add(node: ChainNode<T>) {
        this.remove(node);

        node.left = this.last;
        node.right = undefined;

        if (this.last) {
            this.last.right = node;
        }
        this.last = node;

        if (this.size == 0) {
            this.first = node;
        }

        this.nodes.set(node.key, node);
        this.size ++;

        if (this.maxLen > 0 && this.size > this.maxLen) {
            this.remove(this.head);
        }
    }

    remove(node: ChainNode<T>) {
        if (!this.nodes.has(node.key)) return;
        const n = this.nodes.get(node.key);
        if (n.left) {
            n.left.right = n.right;
        } else {
            this.first = n.right;
        }
        if (n.right) {
            n.right.left = n.left;
        } else {
            this.last = n.left;
        }
        n.left = undefined;
        n.right = undefined;
        node.left = undefined;
        node.right = undefined;

        this.nodes.delete(node.key);
        this.size --;
    }

    removeAll() {
        this.nodes.forEach((node) => {
            node.left = undefined;
            node.right = undefined;
        });
        this.nodes.clear();
        this.first = undefined;
        this.last = undefined;
        this.size = 0;
    }

    toArray(): T[] {
        const list: T[] = [];
        let node = this.first;
        while (node) {
            list.push(node.value);
            node = node.right;
        }
        return list;
    }
    
}

