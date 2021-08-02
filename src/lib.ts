import { ident, Ident } from "./ident";
import { belong, inst, inStack, stack } from "./task";

export type Task<T extends string> = { ident: Ident, type: T }
export type BasicTask<T extends string> = Task<T> & { run: string }
export type GroupTask<T extends string, I extends BasicTask<any>[]> = Task<T> & { items: I }
export type ArgTask<T extends string> = BasicTask<T> & (() => BasicTask<T>) & (<A extends unknown[]>(...args: A) => BasicTask<T> & { args: A })

function mkgroup(ident: Ident, type: string, items: any[]): any {
    const task = inStack(stack => {
        const first = items[0]
        if (typeof first === 'function') {
            first()
            return { type }
        } else if (first instanceof Array) {
            for (const i of first) belong(i.ident, stack)
            return { type, items: first }
        } else {
            for (const i of items) belong(i.ident, stack)
            return { type, items }
        }
    })
    return inst(ident, task)
}

export function queue(group: () => void): Task<'queue'>
export function queue<I extends BasicTask<any>[]>(items: I): GroupTask<'queue', I>
export function queue<I extends BasicTask<any>[]>(...items: I): GroupTask<'queue', I>
export function queue(...items: any[]): any {
    return mkgroup(ident(), 'queue', items)
}

export function paral(group: () => void): Task<'parallel'>
export function paral<I extends BasicTask<any>[]>(items: I): GroupTask<'parallel', I>
export function paral<I extends BasicTask<any>[]>(...items: I): GroupTask<'parallel', I>
export function paral(...items: any[]): any {
    return mkgroup(ident(), 'parallel', items)
}

function tempstr(strings: TemplateStringsArray, keys: unknown[]) {
    const strs = [strings[0]]
    keys.forEach((key, i) => {
        strs.push(`${key}`, strings[i + 1])
    })
    return strs.join('')
}

export function npm(strings: TemplateStringsArray, ...keys: unknown[]): ArgTask<'npm'> {
    return build_cmd(ident(), 'npm', tempstr(strings, keys))
}

export function run(strings: TemplateStringsArray, ...keys: unknown[]): ArgTask<'run'> {
    return build_cmd(ident(), 'run', tempstr(strings, keys))
}

export function node(strings: TemplateStringsArray, ...keys: unknown[]): ArgTask<'node'> {
    return build_cmd(ident(), 'node', tempstr(strings, keys))
}

function build_cmd<T extends string>(ident: Ident, type: T, run: string): ArgTask<T> {
    return bind_cmd(ident, { ident, type, run })
}

function bind_cmd<T>(ident: Ident, cmd: T): T & (() => T) & (<A extends unknown[]>(...args: A) => T & { args: A }) {
    return inst(ident, Object.assign(option.bind(cmd, ident), cmd)) as any
}

function option<T, A extends unknown[]>(this: T, ident: Ident, ...args: A): T | (T & { args: A }) {
    if (args.length == 0) return bind_cmd(ident, this)
    return bind_cmd(ident, Object.assign({ ...this }, { args: [...(this as any)?.args ?? [], ...args] }))
}
