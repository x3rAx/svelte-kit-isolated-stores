# SvelteKit Isolated Stores

<i>
Use stores in SvelteKit during SSR as you are used to from Svelte* without
modifying server state.

<small>* with minimal boilerplate code</small>
</i>



## The Issue

[Svelte](https://svelte.dev/) is great. But even though it is very fast to
render a page in the browser with Svelte, it has some drawbacks:

- Displaying pre-rendered HTML is faster
- Indexing / SEO is not going to work without executing JS
- Static pages need JS to be displayed even though they would not have to

[SvelteKit](https://kit.svelte.dev/) solves these (and more) using Server Side
Rendering (SSR). But it comes with it's own caveats:

If your component uses a [store](https://svelte.dev/tutorial/writable-stores)
defined in a separate module (exported from a `.ts` or `.js` file) and uses it
during [loading](https://kit.svelte.dev/docs#loading) or during component
initialization (in short: during SSR), then your rendered component depends on
the state of the store on the server side.

If you component then also writes to the store during SSR, it alters server
state! This means, that for **all upcoming requests**, the value of the store
**will be changed**. In the best case, this results in "flickering", when
reloading the page, where the SSR version of the page has old data which is
shortly displayed until the
[hydration](https://kit.svelte.dev/docs#ssr-and-javascript) replaces it with the
updated value.

**In the worst case, it leaks private information to other users of your page /
app!**



## The Solution

SvelteKit has a concept called the
[session](https://kit.svelte.dev/docs#loading-input-session). It is a
serializable JavaScript object which is used to pass data from the server to the
client. The session object is created on the server *per request*.

The *Isolated Stores* of this package use these session objects to tell appart
different requests, and *re-creates the stores for each new session*.

As a positive side effect, it enables
[custom store functions](https://svelte.dev/tutorial/custom-stores) to use
SvelteKit's [`fetch`](https://kit.svelte.dev/docs#loading-input-fetch) method,
which serializes the responses of requests made during SSR and sends them along
the rendered page so that the client does not need to do the same request again
during [hydration](https://kit.svelte.dev/docs#ssr-and-javascript).



## How it Works (Implementation Details)

Every store defined with `DefineStore` or one of the helper functions, is
wrapped in a
[`Proxy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
and when a property of the store (eg. the `subscribe` or `set` function) is
accessed, the `Proxy` returns the property of the store that belongs to the
current session / the current request.

If the store does not exist for the current session yet, it is created and saved
to a
[`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
so the store can be retrieved if it is used again during the same request.

The `WeakMap` is used to map the *session object* to a `Map` of stores. Doing
so makes sure, that the garbage collector can clean away stores of sessions that
do not exist anymore, because the belonging to request is done.

On the client side, it works the same way but of course there is always only one
session object. It would be possible to just return the store instead of the
`Proxy` on the client, although this would prevent the aforementioned ability to
use SvelteKit's `fetch` function in custom store functions.



## Usage

For the most part, the stores defined with `DefineStore` (or one of the helper
methods) can be used just as you are used to from Svelte. Depending on what you
want to do, there is minimal to no boilerplate necessary.



### Defining Stores

This works almost exactly like it does with plain Svelte.



#### `defineStore()`

This package provides a `defineStore()` method that takes a function, to create
a [custom store](https://svelte.dev/tutorial/custom-stores).

```typescript
// counter.ts

import { defineStore } from 'svelte-kit-isolated-stores'
import { writable } from 'svelte/store'

export const counter = defineStore(() => {
    const { subscribe, set, update } = writable(0)

    function increment() {
        update(val => val + 1)
    }

    function decrement() {
        update(val => val - 1)
    }

    return {
        subscribe, // You need to return at least `subscribe`
        set,
        update,

        increment,
        decrement,
        reset: () => set(0),
    }
})
```



#### `defineWritable()`

You do however not need to create custom stores for every simple store you have.
`defineWritable()` is a helper function, that creates a writable store with an
initial value.

The difference to Svelte's `writable()` function is, that you need to provide a
function (arrow function in this example) to create the initial value. This is
necessary because the store must be re-created over and over again and if the
initial value is a reference type like an object or an array, different
instances of the same store would share this data.

```typescript
// time.ts
import { defineWritable } from 'svelte-kit-isolated-stores'

// --- Initial value creator -------vvvvvvv
export const count = defineWritable(() => 0)

```



#### `defineReadable()`

To define simple readable stores use the helper function `defineReadable()`.
Like with `defineWritable()` the initial value must be returned from a function.

```typescript
// time.ts
import { defineReadable } from 'svelte-kit-isolated-stores'

export const time = defineReadable(
    // The initial value creator
    () => new Date(),
    // The start function called when the first subscriber subscribes
    (set) => {
        const interval = setInterval(() => {
            set(new Date())
        }, 1000)

        // Return the stop function called when the last subscriber unsubscribes
        return () => {
            clearInterval(interval)
        }
    },
)
```



#### `defineDerived()`

Derived stores change their value depending on other stores. Use the helper
function `defineDerived()` to create an isolated derived store.

Like with Svelte's `derived()` method, it is possible to pass a single store or
an array of one or more dependent stores to `defineDerived()`.

First an example with just a singe dependent store:

```typescript
// time.ts

import { defineReadable } from 'svelte-kit-isolated-stores'

export const time = defineReadable(
    () => new Date(),
    (set) => {
        const interval = setInterval(() => {
            set(new Date())
        }, 1000)

        // Return the stop function called when the last subscriber unsubscribes
        return () => {
            clearInterval(interval)
        }
    },
)

// When deriving from a single store, the dependent store can be provided
// without being encapsulated in an array.
// The first argument of the callback function is then just the store value
export const timeBerlin = defineDerived(
    time,
    $time => $time.toLocaleString({ timeZone: 'Europe/Berlin' }),
)

function tokyoTime(time: Date) {
    return time.toLocaleString({ timeZone: 'Asia/Tokyo' })
}

export const timeTokyo = defineDerived(
    time,
    $time => tokyoTime($time),
    // Optional initial value provider
    () => tokyoTime(new Date()),
)
```

Now for multiple dependent stores:

```typescript
// square.ts

import { defineStore, defineReadable, defineDerived } from 'svelte-kit-isolated-stores'

export const width = defineWritable(() => 0)
export const height = defineWritable(() => 0)

// Pass multiple stores as an array.
// The first argument of the callback function is then an array of store values
// instead of just a single store value.
// The array can be destructured to arbitrary names (convention is to prefix
// store names with `$`)
export const area = defineDerived(
    [width, height],
    ([$width, $height]) => $width * $height
)

```

However, and contrary to Svelte's `derive()` it is also possible to pass an
object containing dependent stores. The first argument of the callback function
is then an object of store values where each key in the stores object is
prefixed with a `$`.

This feature is added to increadse DX (developer experience), because using
objects, the intellisense can help with destructuring. It can can also help to
reduce bugs, as swapping the positions of the stores in the input object does
not silently change the order of the store values.

> However, keep in mind that this adds a layer around the original `derived()`
> implementation and, for *very* frequently changing stores, this might impact
> performance.

```typescript
// square.ts

import { defineStore, defineReadable, defineDerived } from 'svelte-kit-isolated-stores'

export const width = defineWritable(() => 0)
export const height = defineWritable(() => 0)

// Dependent stores are passed in as object (using object property value
// shorthand)
// The object can directly be destructured. Keep in mind, that every key has
// been prefixed with `$`.
export const area = defineDerived(
    { width, height }, // <-- this is an object, not an array
    ({ $width, $height }) => $width * $height,
)

// You can assign different names using destructuring syntax
export const diagonal = defineDerived(
    { width, height },
    ({ $width: w, $height: h }) => Math.sqrt(Math.pow(w, 2) + Math.pow(h, 2)),
)
```



### Extra Context for Stores (or: Be careful with Closures)

[Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures) is
the concept of bundling togehter a function with it's surrounding state or
*context*. It let's you access variables that are defined in the outside scope
of the function.

When using stores on the server side, using closures might have some side
effects:

For example the Svelte tutorial for
[derived stores](https://svelte.dev/tutorial/derived-stores) uses a global
variable `start` which contains a `Date`. This `start` variable is initialized
when the module (the file) is first being loaded. In the browser this behaves as
expected: `start` contains the `Date` when the page has loaded.

On the server however, this would not be re-evaluated on every request and
therefore would contain the date of the first request.

To achieve the same behaviour, you can use `defineStore()` and return a derived
store instead of a custom object:

```typescript
// time.ts

import { defineStore, defineReadable, defineDerived } from 'svelte-kit-isolated-stores'

export const time = defineReadable(
    () => new Date(),
    (set) => {
        const interval = setInterval(() => {
            set(new Date())
        }, 1000)

        // Return the stop function called when the last subscriber unsubscribes
        return () => {
            clearInterval(interval)
        }
    },
)

export const elapsed = defineStore(() => {
    const start = new Date()

    return defineDerived(
        time,
        ($time) => Math.round(($time.getTime() - start.getTime()) / 1000),
    )
})
```



### During Component Initialization

You can use the store as you are used to from Svelte during component
initialization:

```html
<script language="ts">
    import { count } from '$lib/stores/count'

    // Use auto-subscribe syntax 
    $count = 0
</script>
```
