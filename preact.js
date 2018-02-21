const assign = require('lodash/assign');
const isFunction = require('lodash/isFunction');
const isString = require('lodash/isString');
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

	return Child => {
		function Wrapper(props, {
			store
		}) {
			let state = mapStateToProps(store ? store.getState() : {}, props);
			let update = () => {
				let mapped = mapStateToProps(store ? store.getState() : {}, this.props);

				for (let i in mapped)
					if (mapped[i] !== state[i]) {
						state = mapped;
						return this.setState(null);
					}
				for (let i in state)
					if (!(i in mapped)) {
						state = mapped;
						return this.setState(null);
					}
			};

			this.componentDidMount = () => {
				update();
				store.subscribe(update);
			};

			this.componentWillUnmount = () => {
				store.unsubscribe(update);
			};

			this.render = props => h(Child, assign({}, props, state));
		}

		Wrapper.prototype = new Component();

		return Wrapper.prototype.constructor = Wrapper;
	};
}

function Provider(props) {
	this.getChildContext = () => ({
		store: props.store
	});
}

Provider.prototype.render = props => props.children[0];

module.exports = {
	connect,
	Provider
};
