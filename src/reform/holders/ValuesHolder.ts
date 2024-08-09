import { get, set, cloneDeep, isEqual } from "lodash-es";
import { BaseHolder } from "./BaseHolder";

export class ValuesHolder<T extends object> extends BaseHolder<T> {

    private values = {} as T;

    set(values: T) {
        this.values = values;
    }

    get() {
        return this.values;
    }

    getAt(path: string | string[]) {
        return get(this.values, path);
    }

    setAt(path: string, value: any) {
        return set(this.values, path, value);
    }

    clone(): T {
        return cloneDeep(this.values) as T;
    }

    equals(values: any) {
        return isEqual(this.values, values);
    }

    userContext() {
        return {};
    }

    formContext() {
        return {
            ...this.userContext(),
            getValue: this.getAt.bind(this),
        };
    }
}
