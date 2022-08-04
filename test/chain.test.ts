import Chain, { ChainNode } from "../src/lib/utils/Chain";

type ValueObject = {
    id: string;
    value: number;
}

class ValueNode extends ChainNode<ValueObject> {};

describe("Chain test", () => {
    beforeAll(async () => {
        //
    });

    afterAll(async () => {
        //
    });

    test("add and size", () => {
        const chain = new Chain<ValueObject>();
        const first = new ValueNode({ id:'1', value: 100 });
        chain.add(first);
        chain.add(new ValueNode({ id:'2', value: 200 }));
        chain.add(new ValueNode({ id:'3', value: 300 }));
        const last = new ValueNode({ id:'4', value: 400 });
        chain.add(last);

        expect(chain.head).toBe(first);
        expect(chain.tail).toBe(last);
        expect(chain.length).toBe(4);
    });

    test("remove and size", () => {
        const chain = new Chain<ValueObject>();
        chain.add(new ValueNode({ id:'1', value: 100 }));
        chain.add(new ValueNode({ id:'2', value: 200 }));
        let node = new ValueNode({ id:'3', value: 300 });
        chain.add(node);
        chain.add(new ValueNode({ id:'4', value: 400 }));

        chain.remove(node);

        expect(chain.head.key).toBe('1');
        expect(chain.tail.key).toBe('4');
        expect(chain.length).toBe(3);

        node = chain.get('2');
        expect(node.left).toBe(chain.get('1'));
        expect(node.right).toBe(chain.get('4'));
    });

    test("max size", () => {
        const chain = new Chain<ValueObject>(3);
        chain.add(new ValueNode({ id:'1', value: 100 }));
        chain.add(new ValueNode({ id:'2', value: 200 }));
        chain.add(new ValueNode({ id:'3', value: 300 }));
        chain.add(new ValueNode({ id:'4', value: 400 }));

        expect(chain.head.key).toBe('2');
        expect(chain.tail.key).toBe('4');
        expect(chain.length).toBe(3);
        expect(chain.head.left).toBe(undefined);
        expect(chain.head.right).toBe(chain.get('3'));
        expect(chain.tail.left).toBe(chain.get('3'));
        expect(chain.tail.right).toBe(undefined);
    });

    test("set max size", () => {
        const chain = new Chain<ValueObject>();
        chain.add(new ValueNode({ id:'1', value: 100 }));
        chain.add(new ValueNode({ id:'2', value: 200 }));
        chain.add(new ValueNode({ id:'3', value: 300 }));
        chain.add(new ValueNode({ id:'4', value: 400 }));
        chain.add(new ValueNode({ id:'5', value: 500 }));

        chain.maxSize = 2;

        expect(chain.head.key).toBe('4');
        expect(chain.tail.key).toBe('5');
        expect(chain.length).toBe(2);
        expect(chain.head.left).toBe(undefined);
        expect(chain.head.right).toBe(chain.get('5'));
        expect(chain.tail.left).toBe(chain.get('4'));
        expect(chain.tail.right).toBe(undefined);
    });

    test("toArray", () => {
        const chain = new Chain<ValueObject>();
        chain.add(new ValueNode({ id:'1', value: 100 }));
        chain.add(new ValueNode({ id:'2', value: 200 }));
        chain.add(new ValueNode({ id:'3', value: 300 }));
        chain.add(new ValueNode({ id:'4', value: 400 }));
        chain.add(new ValueNode({ id:'5', value: 500 }));

        const list = chain.toArray();

        expect(list.length).toBe(5);
        expect(list[0].id).toBe('1');
        expect(list[1].id).toBe('2');
        expect(list[2].id).toBe('3');
        expect(list[3].id).toBe('4');
        expect(list[4].id).toBe('5');
    });
});
