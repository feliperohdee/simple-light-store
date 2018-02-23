const forEach = require('lodash/forEach');
const pick = require('lodash/pick');
const throttle = require('lodash/throttle');
const {
	h,
	Component
} = require('preact');

module.exports = function connect(store, updateProps, Child) {
	return class extends Component {
		constructor(props, context) {
			super(props, context);

			this.forceUpdateThrottled = throttle(this.setState.bind(this), 50);
		}

		update() {
			let shouldUpdate = false;
			
			const mapped = pick(store.getState(), updateProps);

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

		componentDidMount() {
			this.update();
			this.unsubscribe = store.subscribe(() => this.update());
		}

		componentWillUnmount() {
			this.unsubscribe && this.unsubscribe();
		}

		render(props) {
			return h(Child, props);
		}
	}
}
