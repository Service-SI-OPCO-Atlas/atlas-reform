import { AsyncValidationError, AsyncValidationStatus } from "@dsid-opcoatlas/yop";
import { BaseErrorsHolder } from "./BaseErrorsHolder";

export class AsyncResultsHolder<T extends object> extends BaseErrorsHolder<T, AsyncValidationError> {

    hasAsyncResultStatus(path: string, status: (AsyncValidationStatus | undefined) | (AsyncValidationStatus | undefined)[]) {
        const error = this.get(path);
        const statuses = Array.isArray(status) ? status : [status];
        return statuses.includes(error?.status);
    }

    userContext() {
        return {
            getAsyncError: this.get.bind(this),
            hasAsyncResultStatus: this.hasAsyncResultStatus.bind(this),
        };
    }

    formContext() {
        return {
            ...this.userContext()
        };
    }

}
