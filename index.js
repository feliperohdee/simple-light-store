const forEach = require('lodash/forEach');
const isArray = require('lodash/isArray');
const isFunction = require('lodash/isFunction');
const isNil = require('lodash/isNil');
const isObject = require('lodash/isObject');
const isString = require('lodash/isString');
const isUndefined = require('lodash/isUndefined');
const merge = require('lodash/merge');
const omit = require('lodash/omit');
const pick = require('lodash/pick');
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
    constructor(state = {}, persistKeys = null, storage = null, hooks = {}) {
        super();

        this.persistKeys = persistKeys;
        this.state = state;
        this.storage = storage;
        this.persistThrottled = throttle(this.persist.bind(this), 50);
        this.hooks = hooks;

        if (isObjectOnly(this.persistKeys) && storage) {
            this.loadPersisted();
            this.cleanFalsyPersistedKeys();
        }
    }

    destroy() {
        this.state = null;
        this.persistThrottled.cancel();
        super.destroy();
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

            const newState = reduce(filters, (reduction, {
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
            }, this.state);

            if (this.state !== newState) {
                this.set(newState, `sync.${action}`, true, false);
                isFunction(callback) && callback(newState, `sync.${action}`);
            }
        });
    }

    setPersist(key, value) {
        try {
            if (!isUndefined(value)) {
                value = JSON.stringify(value);

                if (isFunction(this.hooks.setPersist)) {
                    value = this.hooks.setPersist(value);
                }

                this.storage.setItem(`__p.${key}`, value);
            }
        } catch (err) {
            console.error(`can't persist ${key}, reason:`, err);
        }
    }

    getPersist(key) {
        try {
            let value = this.storage.getItem(`__p.${key}`);

            value = isString(value) ? JSON.parse(value) : undefined;

            if (isFunction(this.hooks.getPersist)) {
                return this.hooks.getPersist(value);
            }

            return value;
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
                if (isFunction(this.hooks.persist)) {
                    value = this.hooks.persist(value);
                }

                const isObject = isObjectOnly(value);

                if (isObject) {
                    if (persist.include) {
                        value = pick(value, persist.include);
                    }

                    if (persist.exclude) {
                        value = omit(value, persist.exclude);
                    }
                }

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
                        [key]: isObjectOnly(value) ? (this.hooks.mergePersisted ? this.hooks.mergePersisted(this.state[key], value) : merge({}, this.state[key], value)) : value
                    }, 'store.loadPersisted', false, true);
                }
            }
        });
    }
};