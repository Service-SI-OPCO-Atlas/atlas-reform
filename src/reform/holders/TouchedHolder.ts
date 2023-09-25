import { get, set, unset } from "lodash";
import { BaseHolder } from "./BaseHolder";

export class TouchedHolder<T extends object> extends BaseHolder<T> {

    private touched: object | null = null;

    get<T = any>(path: string): T {
        return get(this.touched, path);
    }

    isTouched(path?: string) {
        if (path == null || path === "")
            return this.touched != null;
        return get(this.touched, path) !== undefined;
    }

    touch(path?: string) {
        let modified = false;
        if (this.touched == null) {
            this.touched = {};
            modified = true;
        }
        if (path != null && path !== "" && get(this.touched, path) === undefined) {
            set(this.touched, path, true);
            modified = true;
        }
        return modified;
    }

    untouch(path?: string) {
        if (this.touched == null)
            return false;
        if (path == null || path === "") {
            this.touched = null;
            return true;
        }
        if (get(this.touched, path) !== undefined) {
            unset(this.touched, path);
            return true;
        }
        return false;
    }

    reset() {
        this.touched = null;
    }

    userContext() {
        return {
            isTouched: this.isTouched.bind(this),
        };
    }

    formContext() {
        return {
            ...this.userContext(),
            touch: this.touch.bind(this),
            untouch: this.untouch.bind(this),
        };
    }
}
