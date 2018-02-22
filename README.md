[![CircleCI](https://circleci.com/gh/feliperohdee/smallorange-light-store.svg?style=svg)](https://circleci.com/gh/feliperohdee/smallorange-light-store)

## Sample

		const store = new Store();

		store.setState({}, 'actionName');
		const unsubscribe = store.subscribe(event: string @optional, context: object @optional, callback: function);
		const unsubscribe = store.subscribeOnce(event: string @optional, context: object @optional, callback: function);
		
		store.unsubscribe(event: string @optional, context: object @optional, callback: function);
