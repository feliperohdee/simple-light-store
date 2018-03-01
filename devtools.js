module.exports = function unistoreDevTools(store) {
	var extension = window.devToolsExtension || window.top.devToolsExtension;
	var ignoreState = false;

	if (!extension) {
		console.warn('Please install/enable Redux devtools extension');
		store.devtools = null;

		return store;
	}

	if (!store.devtools) {
		store.devtools = extension.connect();
		store.devtools.subscribe(function (message) {
			if (message.type === 'DISPATCH' && message.state) {
				ignoreState = (message.payload.type === 'JUMP_TO_ACTION' || message.payload.type === 'JUMP_TO_STATE');
				store.setState(JSON.parse(message.state), true);
			}
		});
		store.devtools.init(store.state);
		store.subscribe(function (action) {
			var actionName = action ? (action.name || action) : 'setState';

			if (!ignoreState) {
				store.devtools.send(actionName, store.state);
			} else {
				ignoreState = false;
			}
		});
	}

	return store;
}
