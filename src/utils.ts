export type Result<T, E = Error> =
    | { value: T, error: null }
    | { value: null; error: E };

export async function toResult<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> {
    try {
        const res = await promise;
        return { value: res, error: null };
    } catch (error) {
        return { value: null, error: error as E };
    }
}