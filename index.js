const assign = require('lodash/assign');
const isNil = require('lodash/isNil');
const isString = require('lodash/isString');
const Events = require('./Events');

module.exports = class Store extends Events {
	constructor(state = {}) {
		super();

		this.state = state;
	}

	setState(data, overwrite, action = 'setState') {
		if (!isNil(data)) {
			if (isString(overwrite)) {
				[overwrite, action] = [null, overwrite];
			}

			this.state = overwrite ? data : assign({}, this.state, data);
			this.trigger(action, this.state);
		}

		return this.state;
	}

	getState() {
		return this.state;
	}
}
