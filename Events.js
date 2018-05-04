const filter = require('lodash/filter');
const isFunction = require('lodash/isFunction');
const isNull = require('lodash/isNull');
const isString = require('lodash/isString');

module.exports = class Events {
	constructor() {
		this._fns = [];
	}

	destroy() {
		this._fns = null;
	}

	subscribe(event, context, fn, once = false, async = false) {
		if (!isString(event)) {
			[event, context, fn] = [null, event, context];
		}
		
		if (isFunction(context)) {
			[context, fn] = [null, context];
		}
		
		if (event) {
			fn._hasNamespace = event.indexOf(':') >= 0;
			fn._event = event;
		}

		if (context) {
			fn._context = context;
		}

		if (once) {
			fn._once = once;
		}

		if (async) {
			fn._async = async;
		}

		this._fns.push(fn);

		return () => this.unsubscribe(event, context, fn);
	}

	subscribeAsync(event, context, fn) {
		return this.subscribe(event, context, fn, false, true);
	}

	subscribeOnce(event, context, fn) {
		return this.subscribe(event, context, fn, true);
	}

	subscribeOnceAsync(event, context, fn) {
		return this.subscribe(event, context, fn, true, true);
	}

	unsubscribe(event, context, fn) {
		if (!isString(event) && !isNull(event)) {
			[event, context, fn] = [null, event, context];
		}

		if (isFunction(context)) {
			[context, fn] = [null, context];
		}

		this._fns = filter(this._fns, _fn => {
			return (
				(event ? _fn._event !== event : false) ||
				(context ? _fn._context !== context : false) ||
				(fn ? _fn !== fn : false)
			);
		});
	}

	trigger(event, ...data) {
		const fns = this._fns;

		if(!fns) {
			return;
		}

		for (let i = 0; i < fns.length; i++) {
			const _event = fns[i]._hasNamespace ? fns[i]._event.replace(/:.*/g, '') : fns[i]._event;
			const canTrigger = _event ? _event === event : true;

			if (canTrigger) {
				if (fns[i]._once) {
					this.unsubscribe(fns[i]._event, fns[i]._context, fns[i]);
				}

				if (fns[i]._async) {
					setTimeout(() => fns[i](event, ...data));
				} else {
					fns[i](event, ...data);
				}
			}
		}
	}
};
