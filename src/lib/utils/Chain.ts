export class ChainNode<T extends { id: string }> {
    public left: ChainNode<T> | undefined;
    public right: ChainNode<T> | undefined;
    protected _value: T;

    get id() {
        return this._value.id;
    }

    get value() {
        return this._value;
    }

    constructor(value: T) {
        this._value = value;
    }
}

export default class Chain<T extends { id: string }> {
    private first: ChainNode<T> | undefined;
    private last: ChainNode<T> | undefined;
    private nodes: Map<string, ChainNode<T>> = new Map();
    private size: number = 0;

    get length() {
        return this.size;
    }

    get head() {
        return this.first;
    }

    get tail() {
        return this.last;
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

        this.nodes.set(node.id, node);
        this.size ++;
    }

    remove(node) {
        if (!this.nodes.has(node.id)) return;
        const n = this.nodes.get(node.id);
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

        this.nodes.delete(node.id);
        this.size --;
    }

    clone() {
        let newChain = new Chain<T>();
        let next = this.first;
        while (next) {
            newChain.add(new ChainNode<T>(next.value));
            next = next.right;
        }
        return newChain;
    }
    
}

