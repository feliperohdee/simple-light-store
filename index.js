const assign = require('lodash/assign');
const forEach = require('lodash/forEach');
const isArray = require('lodash/isArray');
const isFunction = require('lodash/isFunction');
const isNil = require('lodash/isNil');
const isObject = require('lodash/isObject');
const isString = require('lodash/isString');
const isUndefined = require('lodash/isUndefined');
const merge = require('lodash/merge');
const omit = require('lodash/omit');
const size = require('lodash/size');

const Events = require('./Events');
const isObjectOnly = obj => isObject(obj) && !isArray(obj);

module.exports = class Store extends Events {
	constructor(state = {}, persistKeys = null, storage = null) {
		super();

		this.persistKeys = persistKeys;
		this.storage = storage;
		this.state = state;

		if (isObjectOnly(this.persistKeys) && storage) {
			this.hydratePersisted();
		}
	}

	setState(data, overwrite, action = 'setState', silent = false) {
		if (!isNil(data)) {
			if (isString(overwrite) || isFunction(overwrite)) {
				[overwrite, action] = [null, overwrite];
			}

			this.state = overwrite ? data : assign({}, this.state, data);

			if (!silent) {
				this.trigger(action, this.state);
			}

			if (isObjectOnly(this.persistKeys) && this.storage) {
				this.persist(data);
			}
		}

		return this.state;
	}

	getState() {
		return this.state;
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

			return isString(value) ? JSON.parse(value) : null;
		} catch (err) {
			console.error(`can't get persisted ${key}, reason:`, err);

			return null;
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

	hydratePersisted() {
		forEach(this.persistKeys, (persist, key) => {
			if (persist) {
				const value = this.getPersist(key);

				this.setState({
					[key]: isObjectOnly(value) ? merge({}, this.state[key], omit(value, persist._ignore)) : value
				}, 'hydratePersisted', true);
			}
		});
	}
}
