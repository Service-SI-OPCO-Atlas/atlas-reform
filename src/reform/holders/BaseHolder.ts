import { FormManager } from "../FormManager";

export abstract class BaseHolder<T extends object> {

    protected form: FormManager<T>;

    constructor(form: FormManager<T>) {
        this.form = form;
    }

    abstract userContext(): object;
    abstract formContext(): object;
}
