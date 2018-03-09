const forEach = require('lodash/forEach');
const isFunction = require('lodash/isFunction');
const pick = require('lodash/pick');
const throttle = require('lodash/throttle');
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
	updateProps
}) {
	return class extends Component {
		componentWillMount() {
			this.forceUpdateThrottled = throttle(this.setState.bind(this), 50);

			if (isFunction(componentWillMount)) {
				this.willMountArgs = componentWillMount(this.props);
			}
		}

		componentDidMount() {
			const _store = this.willMountArgs && this.willMountArgs.store || store;

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
				return this.forceUpdateThrottled();
			}

			let shouldUpdate = false;
			
			const _store = this.willMountArgs && this.willMountArgs.store || store;
			const mapped = pick(_store.state, updateProps);

			forEach(mapped, (value, key) => {
				if (!shouldUpdate && value !== this.state[key]) {
					this.state = mapped;
					shouldUpdate = true;

					this.forceUpdateThrottled();
				}
			});

			if (!shouldUpdate) {
				forEach(this.state, (value, key) => {
					if (!shouldUpdate && !(key in mapped)) {
						this.state = mapped;

						this.forceUpdateThrottled();
					}
				});
			}
		}

		render(props) {
			return h(this.willMountArgs && this.willMountArgs.component || component, props);
		}
	}
}
