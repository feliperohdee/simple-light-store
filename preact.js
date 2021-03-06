const forEach = require('lodash/forEach');
const isFunction = require('lodash/isFunction');
const isNumber = require('lodash/isNumber');
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
        constructor(props, context) {
            super(props, context);

            this.stateMeta = {};
            this.updateComponent = throttle ? lodashThrottle(this.forceUpdate.bind(this), isNumber(throttle) ? throttle : 50) : this.forceUpdate.bind(this);

            if (isFunction(componentWillMount)) {
                this.willMountArgs = componentWillMount(props);
            }
        }

        componentDidMount() {
            const _store = (this.willMountArgs && this.willMountArgs.store) || store;

            this.update();
            this.unsubscribe = _store.subscribe(() => !this.destroyed && this.update());

            if (isFunction(componentDidMount)) {
                componentDidMount({
                    ...this.props,
                    ...this.willMountArgs
                });
            }
        }

        componentWillUnmount() {
            this.destroyed = true;
            this.unsubscribe && this.unsubscribe();
            this.updateComponent.cancel && this.updateComponent.cancel();

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
                if (!shouldUpdate && value !== this.stateMeta[key]) {
                    this.stateMeta = mapped;
                    shouldUpdate = true;

                    this.updateComponent();
                }
            });

            if (!shouldUpdate) {
                forEach(this.stateMeta, (value, key) => {
                    if (!shouldUpdate && !(key in mapped)) {
                        this.stateMeta = mapped;

                        this.updateComponent();
                    }
                });
            }
        }

        render(props) {
            return h((this.willMountArgs && this.willMountArgs.component) || component, this.willMountArgs ? {
                ...props,
                _state: this.willMountArgs.store.state
            } : {
                ...props,
                _state: store.state
            });
        }
    };
};