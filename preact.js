const forEach = require('lodash/forEach');
const isFunction = require('lodash/isFunction');
const pick = require('lodash/pick');
const lodashThrottle = require('lodash/throttle');
const {
	h,
	Component
} = require('preact');

module.exports = function connect({
	component,
	componentDidMount,
	componentWillMount,
	componentWillUnmount,
	store,
	updateProps,
	throttle = false
}) {
	return class extends Component {
		state = {};
		
		componentWillMount() {
			this.updateComponent = throttle ? lodashThrottle(this.forceUpdate.bind(this), isNumber(throttle) ? throttle : 50) : this.forceUpdate.bind(this);

			if (isFunction(componentWillMount)) {
				this.willMountArgs = componentWillMount(this.props);
			}
		}

		componentDidMount() {
			const _store = (this.willMountArgs && this.willMountArgs.store) || store;

			this.update();
			this.unsubscribe = _store.subscribe(() => this.update());

			if (isFunction(componentDidMount)) {
				componentDidMount({
					...this.props,
					...this.willMountArgs
				});
			}
		}

		componentWillUnmount() {
			this.unsubscribe && this.unsubscribe();

			if (isFunction(componentWillUnmount)) {
				componentWillUnmount({
					...this.props,
					...this.willMountArgs
				});
			}
		}

		update() {
			if (!updateProps) {
				return this.updateComponent();
			}

			let shouldUpdate = false;
			
			const _store = (this.willMountArgs && this.willMountArgs.store) || store;
			const mapped = pick(_store.state, updateProps);

			forEach(mapped, (value, key) => {
				if (!shouldUpdate && value !== this.state[key]) {
					this.state = mapped; /* eslint-disable-line react/no-direct-mutation-state */
					shouldUpdate = true;

					this.updateComponent();
				}
			});

			if (!shouldUpdate) {
				forEach(this.state, (value, key) => {
					if (!shouldUpdate && !(key in mapped)) {
						this.state = mapped; /* eslint-disable-line react/no-direct-mutation-state */

						this.updateComponent();
					}
				});
			}
		}

		render(props) {
			return h((this.willMountArgs && this.willMountArgs.component) || component, props);
		}
	};
};
