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
const size = require('lodash/size');
const throttle = require('lodash/throttle');

const Events = require('./Events');
const isObjectOnly = obj => isObject(obj) && !isArray(obj);
const get = (fn, defaultValue = null, args) => {
	try {
		const result = fn(args);

		return result !== undefined && result !== null ? result : defaultValue;
	} catch (e) {
		return defaultValue;
	}
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

	set(data, action = 'set', overwrite = false, silent = false) {
		if (!isNil(data)) {
			this.state = overwrite ? data : {
				...this.state,
				...data
			};

			if (!silent) {
				this.trigger(action, this.state, data);
			}

			if (action !== 'store.loadPersisted' && isObjectOnly(this.persistKeys) && this.storage) {
				this.persistThrottled(this.state);
			}
		}

		return this.state;
	}

	sync(filters, callback) {
		return this.subscribe((action, state, changes) => {
			if(startsWith(action, 'sync')) {
				return;
			}

			const newState = reduce(filters, (reduction, {
				filter,
				apply
			}) => {
				if (isFunction(filter) && isFunction(apply)) {
					if (filter(action, state, changes)) {
						const data = apply(action, state, changes);

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

	get(fn, defaultValue = null) {
		if (!fn) {
			return this.state;
		}

		return get(fn, defaultValue, this.state);
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
			this.storage.removeItem(`__p.${key}`)
		} catch (err) {
			console.error(`can't remove persisted ${key}, reason:`, err);
		}
	}

	persist(data) {
		forEach(data, (value, key) => {
			const persist = this.persistKeys && this.persistKeys[key];

			if (persist) {
				value = isObjectOnly(value) ? omit(value, persist._ignore) : value;
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
						[key]: isObjectOnly(value) ? merge({}, this.state[key], omit(value, persist._ignore)) : value
					}, 'store.loadPersisted', false, true);
				}
			}
		});
	}
}
