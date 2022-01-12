export class OverloadError extends Error {
    constructor(message: string = '') {
        if (message.length) {
            message = ' ' + message
        }
        super('No overload matched the provided arguments.' + message)
    }
}
