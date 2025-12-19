
### 可用的三方库, 纯 TypeScript、不依赖 Node/Bun API、不依赖 DOM
* tiny event bus, github.com/developit/mitt
* function collections, github.com/lodash/lodash
* id generator, nanoid
* schema checker, github.com/colinhacks/zod
* Promise to go-like err, github.com/supermacro/neverthrow
* di, github.com/Microsoft/tsyringe
* assert, github.com/alexreardon/tiny-invariant
* rich type and zero cost, github.com/sindresorhus/type-fest
* static types operator, github.com/piotrwitek/utility-types
* FSM, github.com/statelyai/xstate
* Behavior Tree, github.com/behavior3
* functional utilities, github.com/remeda/remeda
* type utility, github.com/millsp/ts-toolbelt
* stl, github.com/js-sdsl/js-sdsl
* common collections, github.com/montagejs/collections, github.com/baloian/typescript-ds-lib
* lru, github.com/rob893/typescript-lru-cache
* A*, github.com/digitsensitive/astar-typescript, github.com/TheBoneJarmer/aestar, github.com/qiao/PathFinding.js
* serialization, github.com/jichu4n/serio


#### data-structure-typed
[docs](https://data-structure-typed-docs.vercel.app/classes/Queue.html)
```html
<script src='https://cdn.jsdelivr.net/npm/data-structure-typed/dist/umd/data-structure-typed.min.js'>
const {
  BinaryTree, Graph, Queue, Stack, PriorityQueue, BST, Trie, DoublyLinkedList,
  AVLTree, MinHeap, SinglyLinkedList, DirectedGraph, TreeMultiMap,
  DirectedVertex, AVLTreeNode
} = dataStructureTyped;
</script>
```


#### benchmark
设计不同规模的测试用例（N=1000、10000、100000）
或者使用 `benchmark.js` 库
cpu
```ts
import { performance } from "perf_hooks";
function heavyComputation(){
   return "abcdeafadfadfasdasdf;ljk;lkj;lj".indexOf("z") > 0
}

const N = 1000000
let total = 0;
for (let i = 0; i < N; i++) {
  const t0 = performance.now();
  heavyComputation();
  total += performance.now() - t0;
}
console.log("Avg time:", total / N, "ms");
```

memory
```ts
const before = process.memoryUsage().heapUsed;
runLibraryFunction();
const after = process.memoryUsage().heapUsed;
console.log("Memory delta:", (after - before)/1024, "KB");
```
