# SvelteKit Isolated Stores <!-- omit in toc -->

__Use stores in SvelteKit during SSR as you are used to from Svelte* without
modifying server state.__

<small>_* with minimal boilerplate code_</small>



---

- [The Issue](#the-issue)
- [The Solution](#the-solution)
- [Quickstart](#quickstart)
- [How it Works (Implementation Details)](#how-it-works-implementation-details)
- [Installation](#installation)
- [Usage](#usage)
  - [Defining Stores](#defining-stores)
    - [`defineStore()`](#definestore)
    - [`defineWritable()`](#definewritable)
    - [`defineReadable()`](#definereadable)
    - [`defineDerived()`](#definederived)
  - [Extra Context for Stores (or: Be careful with Closures)](#extra-context-for-stores-or-be-careful-with-closures)
  - [Using Stores](#using-stores)
    - [During Component Initialization](#during-component-initialization)
    - [In the template](#in-the-template)
    - [During `load`ing](#during-loading)
      - [`loadWithStores()`](#loadwithstores)
    - [Outside Component Initializion and outside `load()`](#outside-component-initializion-and-outside-load)
      - [In the Browser](#in-the-browser)
      - [On the Server](#on-the-server)
- [License](#license)

---



## The Issue

[Svelte](https://svelte.dev/) is great. But even though it is very fast to
render a page *in the browser* with Svelte, it has some drawbacks compared to
server side rendered HTML:

- Displaying pre-rendered HTML is faster
- Indexing / SEO is not going to work without executing JS
- Static pages need JS to be displayed even though they would not have to

[SvelteKit](https://kit.svelte.dev/) solves these (and more) using Server Side
Rendering (SSR). But it comes with it's own caveats:

If you define a [store](https://svelte.dev/tutorial/writable-stores) in a module
(i.e. exported from a `.ts` or `.js` file) or defined globally inside a `<script
context="module">` tag, this store will only be created when the server loads
the module for the first time

If your component uses such a store during
[loading](https://kit.svelte.dev/docs#loading) or during component
initialization while rendering on the server, then your component
depends on the state of the store on the server side.

If yor component then also writes to the store during SSR, it alters server
state! This means, that for **all upcoming requests**, the value of the store
**will be changed**. In the best case, this results in "flickering", when
reloading the page, where the SSR version of the page has old data which is
shortly displayed until the
[hydration](https://kit.svelte.dev/docs#ssr-and-javascript) replaces it with the
updated value.

**In the worst case, it leaks private information of one user to other users!**



## The Solution

SvelteKit has a concept called the
[session](https://kit.svelte.dev/docs#loading-input-session). It is a
serializable JavaScript object which is used to pass data from the server to the
client. The session object is created on the server **per request**.

The *Isolated Stores* of this package use these session objects to tell appart
different requests, and *re-creates the stores for each new session*.

As a positive side effect, it enables
[custom store functions](https://svelte.dev/tutorial/custom-stores) to use
SvelteKit's [`fetch`](https://kit.svelte.dev/docs#loading-input-fetch) method,
which serializes the responses of requests made during SSR and sends them along
the rendered page so that the client does not need to do the same request again
during [hydration](https://kit.svelte.dev/docs#ssr-and-javascript).



## Quickstart

Follow the [installation guide].

Then add the following to your top level `__layout.svelte` and any
`__layout.reset.svelte` files:

```html
<!-- src/__layout.html -->

<script lang="ts" context="module">
    import { loadWithStores } from 'svelte-kit-isolated-stores'

    export const load = loadWithStores()
</script>

<slot />
```

To learn how to use a custom `load` function and how to use stores within it,
have a look at [`loadWithStores()`](#loadwithstores).

Define stores using [`defineWritable()`](#definewritable),
[`defineReadable()](#definereadable) and [`defineDerived()](#definederived).
They work almost exactly like their svelte counterparts but the initial value is
provided through a function. Custom stores can be defined with
[`defineStore()`](#definestore):

```typescript
// src/lib/stores.ts

import { defineStore, defineWritable, defineReadable, defineDerived } from 'svelte-kit-isolated-stores'
import { writable } from 'svelte/store'

export const count = defineWritable(() => 0)

export const double = defineDerived(count, $count => $count * 2)

export const time = defineReadable(
    // The initial value creator
    () => new Date(),
    // The start function called when the first subscriber subscribes
    (set) => {
        set(new Date())
        const interval = setInterval(() => {
            set(new Date())
        }, 1000)

        // Return the stop function called when the last subscriber unsubscribes
        return () => {
            clearInterval(interval)
        }
    },
)

export const user = defineStore(({ fetch }) => {
    const { subscribe, set, update } = writable()

    async function loadUser(uid: string) {
        const data = await (await fetch(`/api/user/${uid}`)).json()
        set(data)
    }

    return {
        subscribe,
        set,
        update,

        loadUser,
    }
})
```

On your pages, you can use the stores in the `load` function using the
`loadWithStores()` function. In the template, use the store as you are used to
from Svelte.

```html
<!-- src/routes/users/[userUid].svelte -->

<script lang="ts" context="module">
    import { loadWithStores } from 'svelte-kit-isolated-stores'
    import { user } from '$lib/stores'

    export const load = loadWithStores({ user }, async ({ user }, { params }) => {
        await user.loadUser(params['userUid'])

        return {}
    })
</script>

<script lang="ts">
    import { count, double, time } from '$lib/stores'

    function increment() {
        count.update((n) => n + 1)
    }

    function decrement() {
        count.update((n) => n - 1)
    }

    $: square = $count * $count

    $count = 10
</script>

<div>
    The current date and time is {$time.toLocaleString()}
</div>

<div>
    <button on:click={decrement}>➖</button>
    {$count}
    <button on:click={increment}>➕</button>
</div>

<div>
    <div>Doubled: {$double}</div>
    <div>Squared: {square}</div>
</div>

<div>
    Loaded User:
    <pre><code>{JSON.stringify($user)}</code></pre>
</div>

```

To try the above example, create the file `src/routes/api/user/[userUid].ts` and paste
the following:

```typescript
import type { RequestHandler } from '@sveltejs/kit'

export const get: RequestHandler = ({ params }) => {
    const userUid = params['userUid']

    return {
        body: {
            uid: userUid,
            name: 'M1000',
            firstName: 'Moritz',
            lastName: 'Zimmermann',
        },
    }
}
```



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
do not exist anymore, after a request is done.

On the client side, it works the same way but of course there is always only one
session object. It would be possible to just return the store instead of the
`Proxy` on the client, although this would prevent the aforementioned ability to
use SvelteKit's `fetch` function in custom store functions (this is because with
the `Proxy`, the store is created lazily when needed and not when the store
module is loaded, which means we can pass in `fetch` from the `load` function).



## Installation

```bash
npm install -D svelte-kit-isolated-stores
```

Because this package relies on SvelteKit's generated code, you have to prevent
Vite from building it in advance:

```javascript
// svelte.config.js

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // ...
    kit: {
        // ...
        vite: {
            optimizeDeps: {
                exclude: ["svelte-kit-isolated-stores"],    // <-- Add this line
            },
            ssr: {
                noExternal: ["svelte-kit-isolated-stores"], // <-- Add this line
            },
        },
    },
}

export default config
```



## Usage

For the most part, the stores defined with `DefineStore` (or one of the helper
methods) can be used just as you are used to from Svelte. Depending on what you
want to do, there is minimal to no boilerplate necessary.



### Defining Stores



#### `defineStore()`

This package provides a `defineStore()` method that takes a function, that
creates a [custom store](https://svelte.dev/tutorial/custom-stores).

A store is defined in Svelte as an object that has at least a `subscribe()`
method which, when executed, returns an method to unsubscribe.

It can then also have other properties or methods. Common methods are `set()`
and `update()` which are used to set and update the value of the store.

But you can also include other methods. In the example below, the methods
`increment()`, `decrement()` and `reset()` are also added to the store object
to make it more easy to use the `counter`.

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
// count.ts

import { defineWritable } from 'svelte-kit-isolated-stores'

// --- Initial value creator -------vvvvvvv
export const count = defineWritable(() => 0)

```



#### `defineReadable()`

To define simple readable stores use the helper function `defineReadable()`.
Like with `defineWritable()` the initial value must be returned from a function.

The second argument is the `start` function. This should be familiar from
Svelte's `readable()` stores.

```typescript
// time.ts

import { defineReadable } from 'svelte-kit-isolated-stores'

export const time = defineReadable(
    // The initial value creator
    () => new Date(),
    // The start function called when the first subscriber subscribes
    (set) => {
        set(new Date())
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

Like with Svelte's
[`derived()`](https://svelte.dev/docs#run-time-svelte-store-derived) method, it
is possible to pass a single store or an array of one or more dependent stores
to `defineDerived()`.

When deriving from a single store, the dependent store can be provided without
being encapsulated in an array. The first argument of the callback function is
then just the store value.

```typescript
// double.ts

import { defineWritable, defineDerived } from 'svelte-kit-isolated-stores'

export const someValue = defineWritable(() => 0)

export const double = defineDerived(someValue, $someValue => $someValue * 2)
```

Multiple stores can be derived from by passing them as an array. The first
argument of the callback function is then an array of store values instead of
just a single store value. The array can be destructured to arbitrary names
(however it is convention to prefix the store names with `$` for the values).

```typescript
// rectangle.ts

import { defineWritable, defineDerived } from 'svelte-kit-isolated-stores'

export const width = defineWritable(() => 0)
export const height = defineWritable(() => 0)

export const area = defineDerived(
    [width, height],
    ([$width, $height]) => $width * $height
)
```

Contrary to Svelte's `derive()` it is also possible to pass an object containing
dependent stores to `defineDerived()`. The first argument of the callback
function is then an object of store values where each key of the stores object
is prefixed with a `$`.

This feature is added to increadse DX (developer experience), because using
objects (together with TypeScript), the intellisense can help with
destructuring. It can can also help to reduce bugs, as swapping the positions of
the stores in the input object does not silently change the order of the store
values (as they would in the array example above).

> However, keep in mind that this adds a layer around the original `derived()`
> implementation and, for *very* frequently changing stores, this *might* impact
> performance.

```typescript
// rectangle.ts

import { defineWritable, defineDerived } from 'svelte-kit-isolated-stores'

export const width = defineWritable(() => 0)
export const height = defineWritable(() => 0)

export const area = defineDerived(
    // Dependent stores are passed in as object (using object property value
    // shorthand)
    { width, height },
    // The object can directly be destructured. Keep in mind, that every key has
    // been prefixed with `$`.
    ({ $width, $height }) => $width * $height,
)

export const diagonal = defineDerived(
    { width, height },
    // Of course, you can assign different names using destructuring syntax
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
therefore would contain the date of the first request (or more precise the date
the module has first been loaded on the server).

To achieve the same behaviour as in the Svelte tutorial, you can use
`defineStore()` and return a derived store instead of a custom object:

```typescript
// time.ts

import { defineStore, defineReadable } from 'svelte-kit-isolated-stores'
import { derived } from 'svelte/store'

export const time = defineReadable(
    () => new Date(),
    (set) => {
        const interval = setInterval(() => {
            set(new Date())
        }, 1000)

        return () => { clearInterval(interval) }
    },
)

export const elapsed = defineStore(() => {
    const start = new Date()

    // Instead of returning an object with a `subscribe()` method, you can just
    // return a store. It is safe to use sveltes `derived()` here, as it will
    // be re-created when the store defined by `defineStore()` is recreated.
    return derived(
        time,
        ($time) => Math.round(($time.getTime() - start.getTime()) / 1000),
    )
})
```



### Using Stores



#### During Component Initialization

You can use the store as if it was a normal Svelte store during component
initialization:

```html
<script language="ts">
    import { counter } from '$lib/stores/counter'

    // Use auto-subscription syntax
    $counter = 10
</script>

{$counter}
```

> During component initializion the store isolation mechanism has access to
> `$app/stores` and can extract the session objectfrom there. This session is
> crucial to be able to know which stores belong to the current request.



#### In the template

Just don't think about it!

```html
<script language="ts">
    import { counter } from '$lib/stores/counter'
</script>

<h1>The count is: {$counter}</h1>

<div>
    <button on:click={counter.decrement}>➖</button>
    <button on:click={counter.increment}>➕</button>
</div>

<div>
    <label>
        Count:
        <input type="number" bind:value={$counter} />
    </label>
</div>

```



#### During `load`ing

Layouts and pages in SvelteKit can export a `load` function, which is executed
before the component is initialized (a layout / page is also just a Svelte
component).

When not in *component initialization*, the isolation mechanism does not have
access to the current session object through `$app/stores`. Therefore, we must
pass the `session` object of the input argument of the load function to the
isolation logic.

We do that by **calling** the store as if it was a function and we pass in the
`input` argument of the `load` function:

```html
<script lang="ts" context="module">
    import { counter } from '$lib/stores/counter'
    import type { Load } from '@sveltejs/kit'

    export const load: Load = (input) => {
        // This is now the real store instance
        const _counter = counter(input)

        // For some reason we want the counter value to be `1337` on this page ¯\_(ツ)_/¯
        _counter.set(1337)

        // Don't forget to return an object, otherwise you'll get a 404
        return {}
    }
</script>

{$counter}
```

This might look a bit strange at first and is also a little boilerplaty. But
don't worry, you will not need to do this too often thanks to another
convenience function:



##### `loadWithStores()`

This function is used to wrap the actual `load` function. It can be used used in
a variety of ways. But all of them include exporting the result as `load` in the
`module` context of a layout of page component.

1. You can just call it without arguments. This makes sure that the stores get
    access to SvelteKit's `fetch` function (more on that later).

    It also does some "magic" to make things easier for code that runs
    exclusively in the browser (and by "magic" I mean, it stores the session in
    a global variable, because in the browser there is no server state that can
    be modified 😉).

    It is generally a good idea to do this in the top level `__layout.svelte`
    and any `__layout.reset.svelte` files.

    ```html
    <script lang="ts" context="module">
        import { loadWithStores } from 'svelte-kit-isolated-stores'

        export const load = loadWithStores()
    </script>

    <slot />
    ```

    This will export a load function that effectively returns `{}` to prevent a
    `404` error.

2. You can also pass in a custom load function.

    ```html
    <script lang="ts" context="module">
        import { loadWithStores } from 'svelte-kit-isolated-stores'

        export const load = loadWithStores(({ params, fetch}) => {
            const userId = params['id']
            // Do some load logic here, maybe return `props` or `stuff` or whatever.

            // Don't forget to return an object, otherwise you'll get a 404
            return {}
        })
    </script>
    ```

3. You can pass in an object where each value is an isolated store as the first
    argument and a custom `load` function as second argument. This custom load
    function takes as first argument an object of real stores and as second
    argument the `LoadInput` object that a normal `load` function would take as
    the first argument.

    ```html
    <script lang="ts" context="module">
        import { loadWithStores } from 'svelte-kit-isolated-stores'
        import { counter } from '$lib/stores/counter'

        export const load = loadWithStores({ counter }, ({ counter }, { params }) => {
            // Inside this function, the `counter` variable contains the real store
            // instance, not the isolated store

            const userId = Number(params['userId'])

            // For some reason we want the counter value to be the user id on this
            // page ¯\_(ツ)_/¯
            counter.set(userId)

            // Don't forget to return an object, otherwise you'll get a 404
            return {}
        })
    </script>

    {$counter}
    ```



#### Outside Component Initializion and outside `load()`

The isolation mechanism needs to know what is the current session. Outside
component initialization and outside `load()` there is no reliable way to access
the `session` object in general.



##### In the Browser

Consider the following code:

```html
<script lang="ts">
    import { counter } from '$lib/stores/counter'
    import { onMount } from 'svelte'
    import { get } from 'svelte/store'

    let counterVal

    function incrementBy(n) {
        // ERROR: Store used outside component initialization
        counter.update((c) => {
            counterVal = c + n
            return counterVal
        })
    }
</script>

<button on:click="{() => incrementBy(1)}">+1</button>
<button on:click="{() => incrementBy(10)}">+10</button>
```

The `incrementBy()` method executed *after* component initialization. So
when it accesses the `update` property of `counter`, the isolation wrapper has
no idea what the current session is. Normally this would fail. But there is a
fix:

**While in the browser**, there is only ever one session, so it is okay to work
with global variables here. Therefore, whenever the isolation mechanism first
gets access to the `session` object, it stores a global reference to it, so it
can be accessed later.

If you use any isolated store during component initialization (e.g. you set
it to some value or you subscribe to it) then the above example would work. But
**you do not want to rely on someon else having used a store before you**.

Therefore, to ensure the isolation mechanism *always* has access to the
`session`, make sure to export a call to `loadWithStores()` (with or without
arguments) as `load` in the top level `__layout.svelte` and any
`__layout.reset.svelte` files:

```html
<!-- `__layout.svelte` or any `__layout.reset.svelte` -->
<script lang="ts" context="module">
    import { loadWithStores } from 'svelte-kit-isolated-stores'

    export const load = loadWithStores()
</script>
```



##### On the Server

Luckily most code that runs outside component initialization and outside the
`load` function is only ever run in the browser.

For example any event handlers do usually not run on the server and you should
avoid async code in your component initialization during SSR anyway, as
it will not effect the rendered page HTML.

Also Svelte's `onMount()` function is only run in the browser.

But there is at least one situation where code runs on the server outside
component initialization:

The `onDestroy()` hook is triggert during SSR (or rather when SSR is done). And
if you try to use an isolated store there, it will fail to access the `session`
object and throw an exception.

> There may be other situation where this can happen, I just didn't encounter
> others yet.

To mitigate this, you can either make sure the store is only accessed when in
the browser:

```html
<script lang="ts">
    import { onDestroy } from 'svelte'
    import { browser } from '$app/env'
    import { counter } from '$lib/stores/counter'

    onDestroy(() => {
        if (browser) {
            counter.reset()
        }
    })
</script>
```

Or you can get yourself an instance of the real store object during component
initialization and use it later:

```html
<script lang="ts">
    import { onDestroy } from 'svelte'

    // Import the counter with an alias name (can be anything, but I like to
    // prefix the name with `use` as a convention)
    import { counter as useCounter } from '$lib/stores/counter'

    // Get an instance of the real store object by calling the isolated store
    const counter = useCounter()
    // From here on, the store can be used *exactly* like in plain Svelte

    onDestroy(() => {
        counter.reset()
    })
</script>
```

This last version is only necessary if you must call a function of the store
that has side effects like calling an API. If you just want to reset the store
value like in the example, you can just skip this on the server, as the store is
garbage collected on the server after the request is done.



## License

[MIT](LICENSE)
