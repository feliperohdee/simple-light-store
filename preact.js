const assign = require('lodash/assign');
const forEach = require('lodash/forEach');
const isFunction = require('lodash/isFunction');
const isString = require('lodash/isString');
const throttle = require('lodash/throttle');
const {
	h,
	Component
} = require('preact');

function select(properties = []) {
	if (isString(properties)) {
		properties = properties.split(/\s*,\s*/);
	}

	return state => {
		let selected = {};

		for (let i = 0; i < properties.length; i++) {
			selected[properties[i]] = state[properties[i]];
		}

		return selected;
	};
}

function connect(mapStateToProps) {
	if (!isFunction(mapStateToProps)) {
		mapStateToProps = select(mapStateToProps);
	}

	return Child => class extends Component {
		constructor(props, context) {
			super(props, context);

			this.state = mapStateToProps(context.store.getState(), props);
			this.forceUpdateThrottled = throttle(this.forceUpdate.bind(this), 50);
		}

		update() {
			const mapped = mapStateToProps(this.context.store.getState(), this.props);

			forEach(mapped, (value, key) => {
				if (value !== this.state[key]) {
					this.state = mapped;

					return this.forceUpdateThrottled();
				}
			});

			forEach(this.state, (value, key) => {
				if (!(key in mapped)) {
					this.state = mapped;

					return this.forceUpdateThrottled();
				}
			});
		}

		componentDidMount() {
			const {
				store
			} = this.context;

			this.update();
			this.unsubscribe = store.subscribe(() => this.update());
		}

		componentWillUnmount() {
			this.unsubscribe && this.unsubscribe();
		}

		render() {
			return h(Child, assign({}, this.props, this.state))
		}
	}
}

function Provider(props) {
	this.getChildContext = () => ({
		store: props.store
	});

	return props.children[0];
}

module.exports = {
	connect,
	Provider
};
