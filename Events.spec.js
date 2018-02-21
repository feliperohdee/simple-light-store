const _ = require('lodash');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const Events = require('./Events');

chai.use(sinonChai);

const expect = chai.expect;

describe('Events.js', () => {
	let events, callback, callback2;

	beforeEach(() => {
		callback = sinon.stub();
		callback2 = sinon.stub();
		events = new Events();
	});

	describe('constructor', () => {
		it('should have _fns', () => {
			expect(events._fns).to.be.an('array');
		});
	});

	describe('destroy', () => {
		it('should null _fns', () => {
			events.destroy();

			expect(events._fns).to.be.null;
		});
	});

	describe('subscribe', () => {
		beforeEach(() => {
			sinon.spy(events, 'unsubscribe');
		});

		afterEach(() => {
			events.unsubscribe.restore();
		});

		it('should return a function', () => {
			const unsubscribe = events.subscribe(callback);

			unsubscribe();

			expect(unsubscribe).to.be.a('function');
			expect(events.unsubscribe).to.have.been.calledWithExactly(null, null, callback);
		});

		it('should subscribe by function', () => {
			events.subscribe(callback);

			expect(events._fns[0]).to.equal(callback);
			expect(events._fns[0]._event).to.be.undefined;
			expect(events._fns[0]._context).to.be.undefined;
			expect(events._fns[0]._once).to.be.undefined;
		});

		it('should subscribe by context and function', () => {
			events.subscribe(this, callback);

			expect(events._fns[0]).to.equal(callback);
			expect(events._fns[0]._event).to.be.undefined;
			expect(events._fns[0]._context).to.equal(this);
			expect(events._fns[0]._once).to.be.undefined;
		});

		it('should subscribe by event, context and function', () => {
			events.subscribe('event', this, callback);

			expect(events._fns[0]).to.equal(callback);
			expect(events._fns[0]._event).to.equal('event');
			expect(events._fns[0]._context).to.equal(this);
			expect(events._fns[0]._once).to.be.undefined;
		});

		it('should subscribe by event, context, function and once', () => {
			events.subscribe('event', this, callback, true);

			expect(events._fns[0]).to.equal(callback);
			expect(events._fns[0]._event).to.equal('event');
			expect(events._fns[0]._context).to.equal(this);
			expect(events._fns[0]._once).to.be.true;
		});
	});

	describe('subscribeOnce', () => {
		beforeEach(() => {
			sinon.spy(events, 'subscribe');
		});

		afterEach(() => {
			events.subscribe.restore();
		});

		it('should call subscribe', () => {
			events.subscribeOnce('event', this, callback);

			expect(events.subscribe).to.have.been.calledWithExactly('event', this, callback, true);
		});
	});

	describe('unsubscribe', () => {
		beforeEach(() => {
			events.subscribe('event', this, callback, true);
		});

		it('should unsubscribe all', () => {
			events.unsubscribe();

			expect(events._fns.length).to.equal(0);
		});

		it('should unsubscribe by function', () => {
			events.unsubscribe(callback);

			expect(events._fns.length).to.equal(0);
		});

		it('should unsubscribe by context', () => {
			events.unsubscribe(this);

			expect(events._fns.length).to.equal(0);
		});

		it('should unsubscribe by event', () => {
			events.unsubscribe('event');

			expect(events._fns.length).to.equal(0);
		});

		it('should unsubscribe by context and function', () => {
			events.unsubscribe(this, callback);

			expect(events._fns.length).to.equal(0);
		});

		it('should unsubscribe by event, context and function', () => {
			events.unsubscribe('event', this, callback);

			expect(events._fns.length).to.equal(0);
		});

		it('should unsubscribe by event and context', () => {
			events.unsubscribe('event', this);

			expect(events._fns.length).to.equal(0);
		});

		describe('wrong', () => {
			it('should not unsubscribe by wrong function', () => {
				events.unsubscribe(() => null);

				expect(events._fns.length).to.equal(1);
			});

			it('should not unsubscribe by wrong context', () => {
				events.unsubscribe({});

				expect(events._fns.length).to.equal(1);
			});

			it('should not unsubscribe by wrong event', () => {
				events.unsubscribe('event_');

				expect(events._fns.length).to.equal(1);
			});

			it('should not unsubscribe by wrong context and function', () => {
				events.unsubscribe({}, callback);

				expect(events._fns.length).to.equal(1);
			});

			it('should not unsubscribe by wrong event, context and function', () => {
				events.unsubscribe('event_', this, callback);

				expect(events._fns.length).to.equal(1);
			});

			it('should not unsubscribe by wrong event and context', () => {
				events.unsubscribe('event_', this);

				expect(events._fns.length).to.equal(1);
			});
		});
	});

	describe('trigger', () => {
		const data = {
			a: 1
		};

		beforeEach(() => {
			events.subscribe('event', this, callback);
			events.subscribe('event:namespace', this, callback2, true);
		});

		it('should trigger', () => {
			events.trigger('event', data);
			events.trigger('event_', data);

			expect(callback).to.have.been.calledWithExactly('event', data);
			expect(callback2).to.have.been.calledWithExactly('event', data);
			expect(events._fns.length).to.equal(1);
		});
	});
});
