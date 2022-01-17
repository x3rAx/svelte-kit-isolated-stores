import 'jest'
import * as main from '../main'

describe('main exports', () => {
    it('should export only public properties', () => {
        const exportedKeys = Object.keys(main).sort()
        const publicPropertyKeys = [
            'defineDerived',
            'defineReadable',
            'defineStore',
            'defineWritable',
            'isIsolatedStore',
            'loadWithStores',
        ].sort()

        expect(exportedKeys).toEqual(publicPropertyKeys)
    })
})
