import { useCallback, useState } from "react";

export default function useRender() {

    const [, updateState] = useState({})
    
    const render = useCallback(() => {
        updateState({})
    }, [])

    return render
}