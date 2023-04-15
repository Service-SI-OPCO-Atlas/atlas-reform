import { useReducer } from "react"

export function useRender(): () => void {
    return useReducer(() => ({}), {})[1] as () => void
}