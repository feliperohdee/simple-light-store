const forEach = require('lodash/forEach');
const isArray = require('lodash/isArray');
const isFunction = require('lodash/isFunction');
const isNil = require('lodash/isNil');
const isObject = require('lodash/isObject');
const isString = require('lodash/isString');
const isUndefined = require('lodash/isUndefined');
const merge = require('lodash/merge');
const omit = require('lodash/omit');
const reduce = require('lodash/reduce');
const startsWith = require('lodash/startsWith');
const throttle = require('lodash/throttle');

const Events = require('./Events');
const isObjectOnly = obj => isObject(obj) && !isArray(obj);

function assign(obj, props) {
    for (let i in props) obj[i] = props[i];
    return obj;
}

module.exports = class Store extends Events {
    constructor(state = {}, persistKeys = null, storage = null) {
        super();

        this.persistKeys = persistKeys;
        this.state = state;
        this.storage = storage;
        this.persistThrottled = throttle(this.persist.bind(this), 50);

        if (isObjectOnly(this.persistKeys) && storage) {
            this.loadPersisted();
            this.cleanFalsyPersistedKeys();
        }
    }

    get() {
        return this.state;
    }

    set(data, action = 'set', overwrite = false, silent = false) {
        if (!isNil(data)) {
            this.state = overwrite ? data : assign(assign({}, this.state), data);

            if (!silent) {
                this.trigger(action, data);
			}

            if (
                action !== 'store.loadPersisted' &&
                this.storage &&
                isObjectOnly(this.persistKeys)
            ) {
                this.persistThrottled(this.state);
            }
        }

        return this.state;
    }

    sync(filters, callback) {
        return this.subscribe((action, changes) => {
            if (startsWith(action, 'sync')) {
                return;
            }

            const newState = reduce(
                filters,
                (reduction, {
                    filter,
                    apply
                }) => {
                    if (isFunction(filter) && isFunction(apply)) {
                        if (filter(action, changes)) {
                            const data = apply(action, changes);

                            if (isObject(data)) {
                                reduction = {
                                    ...reduction,
                                    ...data
                                };
                            }
                        }
                    }

                    return reduction;
                },
                this.state
            );

            if (this.state !== newState) {
                this.set(newState, `sync.${action}`, true, false);
                isFunction(callback) && callback(newState, `sync.${action}`);
            }
        });
    }

    setPersist(key, value) {
        try {
            if (!isUndefined(value)) {
                this.storage.setItem(`__p.${key}`, JSON.stringify(value));
            }
        } catch (err) {
            console.error(`can't persist ${key}, reason:`, err);
        }
    }

    getPersist(key) {
        try {
            const value = this.storage.getItem(`__p.${key}`);

            return isString(value) ? JSON.parse(value) : undefined;
        } catch (err) {
            console.error(`can't get persisted ${key}, reason:`, err);
        }
    }

    removePersist(key) {
        try {
            this.storage.removeItem(`__p.${key}`);
        } catch (err) {
            console.error(`can't remove persisted ${key}, reason:`, err);
        }
    }

    persist(data) {
        forEach(data, (value, key) => {
            const persist = this.persistKeys && this.persistKeys[key];

            if (persist) {
                value = isObjectOnly(value) ? omit(value, persist.ignore) : value;
                this.setPersist(key, value);
            }
        });
    }

    cleanFalsyPersistedKeys() {
        forEach(this.persistKeys, (value, key) => {
            if (!value) {
                this.removePersist(key);
            }
        });
    }

    loadPersisted() {
        forEach(this.persistKeys, (persist, key) => {
            if (persist) {
                const value = this.getPersist(key);

                if (!isUndefined(value)) {
                    this.set({
                        [key]: isObjectOnly(value) ?
                            merge({}, this.state[key], omit(value, persist.ignore)) : value
                    }, 'store.loadPersisted', false, true);
                }
            }
        });
    }

    wrap(fn) {
        return (...args) => fn(this.state, ...args);
    }

    wrapAll(fns) {
        return reduce(
            fns,
            (reduction, fn, key) => ({
                ...reduction,
                [key]: this.wrap(fn)
            }), {}
        );
    }
};