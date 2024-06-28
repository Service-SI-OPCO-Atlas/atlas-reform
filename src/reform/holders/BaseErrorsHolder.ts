import { ValidationError } from "@dsid-opcoatlas/yop";
import { BaseHolder } from "./BaseHolder";

export abstract class BaseErrorsHolder<T extends object, E extends ValidationError> extends BaseHolder<T> {

    protected errors = new Map<string, E>();

    get(path: string) {
        return this.errors.get(path);
    }

    set(path: string, error: E) {
        return this.errors.set(path, error);
    }

    delete(path: string) {
        return this.errors.delete(path);
    }

    size() {
        return this.errors.size;
    }

    paths() {
        return Array.from(this.errors.keys());
    }

    values() {
        return Array.from(this.errors.values());
    }

    reset() {
        this.errors.clear();
    }
}
