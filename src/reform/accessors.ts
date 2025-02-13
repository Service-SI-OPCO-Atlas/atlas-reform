import fdeEqual from "fast-deep-equal/es6"
import { Path, splitPath } from "../yop/PathUtil"

export type SetResult = undefined | {
    root: unknown
    previousValue?: unknown
}

export function get<T = any>(value: unknown, path: string | Path, cache?: Map<string, Path>): T | undefined {
    const keys = typeof path === "string" ? splitPath(path, cache) : path
    if (keys == null)
        return undefined
    let parent: any = value
    for (const key of keys) {
        if (parent == null)
            return undefined
        parent = parent[key]
    }
    return parent
}

export function set(value: unknown, path: string | Path, newValue: unknown, cache?: Map<string, Path>, options: {
    clone?: boolean
    condition?: (currentValue: unknown) => boolean
} = { clone: false }): SetResult {
    
    const keys = typeof path === "string" ? splitPath(path, cache) : path
    if (keys == null)
        return undefined

    if (options.clone)
        newValue = clone(newValue)
    
    const lastKey = keys.pop()
    if (lastKey == null)
        return { root: newValue }
    
    const root = (
        typeof (keys[0] ?? lastKey) === "number" ?
        Array.isArray(value) ? value : [] :
        value != null && typeof value === "object" ? value : {}
    )
    
    let parent: any = root
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const array = typeof (keys[i+1] ?? lastKey) === "number"
        
        if (parent[key] == null)
            parent[key] = array ? [] : {}
        else if (array) {
            if (!Array.isArray(parent[key]))
                parent[key] = []
        }
        else if (Object.getPrototypeOf(parent[key]) !== Object.prototype)
            parent[key] = {}
        parent = parent[key]
    }

    const previousValue = parent[lastKey]
    if (options.condition?.(previousValue) !== false)
        parent[lastKey] = newValue
    return { root, previousValue }
}

export function unset(value: unknown, path: string | Path, cache?: Map<string, Path>): boolean | undefined {
    if (value == null)
        return false
    
    const keys = typeof path === "string" ? splitPath(path, cache) : path
    if (keys == null)
        return undefined
    
    const lastKey = keys.pop()
    if (lastKey == null)
        return undefined

    let parent: any = value
    for (const key of keys) {
        if (parent == null)
            return false
        parent = parent[key]
    }

    if (parent == null || !(lastKey in parent))
        return false

    try {
        delete parent[lastKey]
    }
    catch {
        return false
    }
    return true
}

export function equal(a: unknown, b: unknown): boolean {
    return fdeEqual(a, b)
}

export function clone(value: unknown): unknown {
    return structuredClone(value)
}

