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

