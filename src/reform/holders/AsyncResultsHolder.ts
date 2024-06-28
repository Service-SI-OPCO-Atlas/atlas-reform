import { AsyncValidationError, AsyncValidationStatus } from "@dsid-opcoatlas/yop";
import { BaseErrorsHolder } from "./BaseErrorsHolder";
import { ValuesHolder } from "./ValuesHolder";
import { isEqual } from "lodash-es";

export class AsyncResultsHolder<T extends object> extends BaseErrorsHolder<T, AsyncValidationError> {

    hasAsyncResultStatus(path: string, status: (AsyncValidationStatus | undefined) | (AsyncValidationStatus | undefined)[]) {
        const error = this.get(path);
        const statuses = Array.isArray(status) ? status : [status];
        return statuses.includes(error?.status);
    }

    isAsyncResultPending(path: string) {
        return this.get(path)?.status === 'pending'
    }

    resetChanged(values: ValuesHolder<T>) {
        for (let [path, error] of this.errors) {
            if (!["unavailable", "pending"].includes(error.status) && !isEqual(values.getAt(path), error.value))
                this.errors.delete(path);
        }
    }

    userContext() {
        return {
            getAsyncError: this.get.bind(this),
            isAsyncResultPending: this.isAsyncResultPending.bind(this),
            hasAsyncResultStatus: this.hasAsyncResultStatus.bind(this),
        };
    }

    formContext() {
        return {
            ...this.userContext()
        };
    }

}
