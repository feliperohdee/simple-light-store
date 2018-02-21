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
	});

	describe('getState', () => {
		it('should return state', () => {
			const state = store.setState({
				a: 1
			});

			expect(store.getState()).to.equal(state);
		});
	});
});
