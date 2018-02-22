const _ = require('lodash');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const Store = require('./');

chai.use(sinonChai);

const expect = chai.expect;

describe('index.js', () => {
	let store;

	beforeEach(() => {
		store = new Store();
	});

	describe('constructor', () => {
		it('should start with empty state', () => {
			expect(store.state).to.deep.equal({});
		});

		it('should start with pre state', () => {
			store = new Store({
				a: 1
			});

			expect(store.state).to.deep.equal({
				a: 1
			});
		});

		it('should let default persistKeys', () => {
			expect(store.persistKeys).to.be.null;
		});

		it('should let default storage', () => {
			expect(store.storage).to.be.null;
		});

		it('should let persistKeys', () => {
			store = new Store({}, {});

			expect(store.persistKeys).to.deep.equal({});
		});

		it('should let storage', () => {
			store = new Store({}, null, {});

			expect(store.storage).to.deep.equal({});
		});

		describe('with persistence', () => {
			beforeEach(() => {
				sinon.stub(Store.prototype, 'hydratePersisted');
			});

			afterEach(() => {
				Store.prototype.hydratePersisted.restore();
			});

			it('should not call hydratePersisted if not persistKeys', () => {
				store = new Store();

				expect(Store.prototype.hydratePersisted).not.to.have.been.called;
			});

			it('should not call hydratePersisted if persistKeys and not storage', () => {
				store = new Store({}, {
					a: true
				});

				expect(Store.prototype.hydratePersisted).not.to.have.been.called;
			});

			it('should call hydratePersisted if persistKeys and storage', () => {
				store = new Store({}, {
					a: true
				}, {});

				expect(Store.prototype.hydratePersisted).to.have.been.called;
			});
		});
	});

	describe('setState', () => {
		beforeEach(() => {
			sinon.spy(store, 'trigger');
		});

		afterEach(() => {
			store.trigger.restore();
		});

		it('should update state', () => {
			const state = store.setState({
				a: 1
			});

			expect(state).to.deep.equal({
				a: 1
			});

			expect(store.state).to.deep.equal({
				a: 1
			});
		});

		it('should replace state', () => {
			const state = store.setState({
				a: 1
			});

			const state1 = store.setState({
				b: 2
			}, true);

			const state2 = store.setState({
				c: 3
			}, 'actionName');

			expect(state1).to.deep.equal({
				b: 2
			});

			expect(state2).to.deep.equal({
				b: 2,
				c: 3
			});

			expect(store.state).to.deep.equal({
				b: 2,
				c: 3
			});
		});

		it('should do nothing if is nil', () => {
			const state = store.setState({
				a: 1
			});

			const state1 = store.setState();
			const state2 = store.setState(null);

			expect(state === state1 && state1 === state2).to.be.true;
		});

		it('should return new object', () => {
			const state = store.setState({
				a: 1
			});

			const state1 = store.setState({
				a: 2
			});

			expect(state).not.equal(state1);
			expect(state1).to.equal(store.state);
			expect(store.state).to.deep.equal({
				a: 2
			});
		});

		it('should trigger', () => {
			const state = store.setState({
				a: 1
			});

			const state1 = store.setState({
				a: 2
			}, 'actionName');

			expect(store.trigger).to.have.been.calledTwice;
			expect(store.trigger).to.have.been.calledWithExactly('setState', state);
			expect(store.trigger).to.have.been.calledWithExactly('actionName', state1);
		});

		it('should not trigger if silent = true', () => {
			store.setState({
				a: 1
			}, false, 'actionName', true);

			expect(store.trigger).not.to.have.been.called;
		});

		describe('with persistence', () => {
			beforeEach(() => {
				sinon.stub(store, 'persist');
			});

			afterEach(() => {
				store.persist.restore();
			});

			it('should not call persist if action = hydratePersisted', () => {
				store.storage = {};
				store.persistKeys = {
					a: true
				};

				store.setState({
					a: 1
				}, 'store.hydratePersisted');

				expect(store.persist).not.to.have.been.called;
			});

			it('should not call persist if not persistKeys', () => {
				store.setState({
					a: 1
				});

				expect(store.persist).not.to.have.been.called;
			});

			it('should not call persist if persistKeys and not storage', () => {
				store.persistKeys = {
					a: true
				};

				store.setState({
					a: 1
				});

				expect(store.persist).not.to.have.been.called;
			});

			it('should call persist if persistKeys and storage', () => {
				store.storage = {};
				store.persistKeys = {
					a: true
				};

				store.setState({
					a: 1
				});

				expect(store.persist).to.have.been.called;
			});
		});
	});

	describe('getState', () => {
		it('should return state', () => {
			const state = store.setState({
				a: 1
			});

			expect(store.getState()).to.equal(state);
		});
	});

	describe('persistence', () => {
		let storage;
		let memoryStorage;

		beforeEach(() => {
			memoryStorage = {};

			storage = {
				getItem: sinon.stub()
					.callsFake(key => memoryStorage[key]),
				setItem: sinon.stub()
					.callsFake((key, value) => memoryStorage[key] = value)
			}

			store = new Store({}, null, storage);
		});

		describe('setPersist', () => {
			it('should persist stringified data', () => {
				store.setPersist('key', 'value');

				expect(memoryStorage).to.deep.equal({
					'__p.key': '"value"'
				});
			});

			it('should do nothing if empty data', () => {
				store.setPersist('key');

				expect(memoryStorage).to.deep.equal({});
			});

			describe('json error', () => {
				beforeEach(() => {
					sinon.stub(console, 'error');
					sinon.stub(JSON, 'stringify')
						.throws(new Error('ops'));
				});

				afterEach(() => {
					console.error.restore();
					JSON.stringify.restore();
				});

				it('should do nothing', () => {
					store.setPersist('key', 'value');

					expect(memoryStorage).to.deep.equal({});
				});
			});
		});

		describe('getPersist', () => {
			beforeEach(() => {
				store.setPersist('key', 'value');
			});

			it('should return data', () => {
				expect(store.getPersist('key')).to.equal('value');
			});

			it('should return undefined', () => {
				expect(store.getPersist('key_')).to.be.undefined;
			});

			describe('json error', () => {
				beforeEach(() => {
					sinon.stub(console, 'error');
					sinon.stub(JSON, 'parse')
						.throws(new Error('ops'));
				});

				afterEach(() => {
					console.error.restore();
					JSON.parse.restore();
				});

				it('should return undefined', () => {
					expect(store.getPersist('key')).to.be.undefined;
				});
			});
		});

		describe('persist', () => {
			const data = {
				a: 1,
				b: {
					a: 1,
					b: 2,
					c: 3,
					d: 4,
					e: {
						a: 1,
						b: 2,
						c: 3,
						d: 4
					}
				},
				c: [1, 2, 3],
				d: true,
				e: null
			};

			it('should not persist if no persistKeys', () => {
				store.persist(data);

				expect(memoryStorage).to.deep.equal({});
			});

			it('should persist persistKeys', () => {
				store.persistKeys = {
					a: true,
					b: true,
					c: true,
					d: true,
					e: true
				};

				store.persist(data);
				expect(memoryStorage).to.deep.equal({
					'__p.a': '1',
					'__p.b': JSON.stringify({
						a: 1,
						b: 2,
						c: 3,
						d: 4,
						e: {
							a: 1,
							b: 2,
							c: 3,
							d: 4
						}
					}),
					'__p.c': JSON.stringify([1, 2, 3]),
					'__p.d': "true",
					'__p.e': "null"
				});
			});

			it('should persist truly persistKeys only', () => {
				store.persistKeys = {
					a: true,
					b: false
				};

				store.persist(data);
				expect(memoryStorage).to.deep.equal({
					'__p.a': '1'
				});
			});

			it('should ignore inner keys', () => {
				store.persistKeys = {
					b: {
						_ignore: ['a', 'b', 'e.a', 'e.b']
					}
				};

				store.persist(data);
				expect(memoryStorage).to.deep.equal({
					'__p.b': JSON.stringify({
						c: 3,
						d: 4,
						e: {
							c: 3,
							d: 4
						}
					}),
				});
			});
		});

		describe('hydratePersisted', () => {
			beforeEach(() => {
				sinon.spy(store, 'setState');

				memoryStorage = {
					'__p.a': '1',
					'__p.b': JSON.stringify({
						a: 1,
						b: 2,
						c: 3,
						d: 4,
						e: {
							a: 1,
							b: 2,
							c: 3,
							d: 4
						}
					}),
					'__p.c': JSON.stringify([1, 2, 3]),
					'__p.d': "true",
					'__p.e': "null"
				}

				store.persistKeys = {
					a: true,
					b: {
						_ignore: ['a', 'b', 'e.a', 'e.b']
					},
					c: true,
					d: true,
					e: true
				};
			});

			afterEach(() => {
				store.setState.restore();
			});

			it('should not load if no persistKeys', () => {
				store.persistKeys = null;
				store.hydratePersisted();

				expect(store.getState()).to.deep.equal({});
			});

			it('should call setState silently', () => {
				store.hydratePersisted();

				expect(store.setState).to.have.callCount(5);
				expect(store.setState).to.have.been.calledWith(sinon.match.object, 'store.hydratePersisted', true);
			});

			it('should load', () => {
				store.hydratePersisted();
				expect(store.getState()).to.deep.equal({
					a: 1,
					b: {
						c: 3,
						d: 4,
						e: {
							c: 3,
							d: 4
						}
					},
					c: [1, 2, 3],
					d: true,
					e: null
				});
			});

			it('should load truly persistKeys only', () => {
				store.persistKeys = {
					a: true,
					b: false
				};

				store.hydratePersisted();
				expect(store.getState()).to.deep.equal({
					a: 1
				});
			});

			it('should merge with existent state', () => {
				store.state = {
					b: {
						e: {
							a: 5
						}
					}
				};

				store.hydratePersisted();
				expect(store.getState()).to.deep.equal({
					a: 1,
					b: {
						c: 3,
						d: 4,
						e: {
							a: 5,
							c: 3,
							d: 4
						}
					},
					c: [1, 2, 3],
					d: true,
					e: null
				});
			});

			it('should not merge with existent state', () => {
				memoryStorage = {};
				store.state = {
					b: {
						e: {
							a: 5
						}
					}
				};

				store.hydratePersisted();
				expect(store.getState()).to.deep.equal({
					b: {
						e: {
							a: 5
						}
					}
				});
			});
		});
	});
});
