import { ValidationError } from "@dsid-opcoatlas/yop";
import { BaseErrorsHolder } from "./BaseErrorsHolder";

export class ErrorsHolder<T extends object> extends BaseErrorsHolder<T, ValidationError> {

    userContext() {
        return {
            getError: this.get.bind(this),
            getErrorCount: this.size.bind(this),
            getErrorPaths: this.paths.bind(this),
        };
    }

    formContext() {
        return {
            ...this.userContext(),
        };
    }
}
