const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const Events = require('./Events');

chai.use(sinonChai);

const expect = chai.expect;

describe('Events.js', () => {
	let events, callback, callback2, callback3;

	beforeEach(() => {
		callback = sinon.stub();
		callback2 = sinon.stub();
		callback3 = sinon.stub();
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
			expect(events.unsubscribe).to.have.been.calledWithExactly(
				null,
				null,
				callback
			);
		});

		it('should subscribe by function', () => {
			events.subscribe(callback);

			expect(events._fns[0]).to.equal(callback);
			expect(events._fns[0]._event).to.be.undefined;
			expect(events._fns[0]._context).to.be.undefined;
			expect(events._fns[0]._once).to.be.undefined;
			expect(events._fns[0]._async).to.be.undefined;
		});

		it('should subscribe by context and function', () => {
			events.subscribe(this, callback);

			expect(events._fns[0]).to.equal(callback);
			expect(events._fns[0]._event).to.be.undefined;
			expect(events._fns[0]._context).to.equal(this);
			expect(events._fns[0]._once).to.be.undefined;
			expect(events._fns[0]._async).to.be.undefined;
		});

		it('should subscribe by event, context and function', () => {
			events.subscribe('event', this, callback);

			expect(events._fns[0]).to.equal(callback);
			expect(events._fns[0]._event).to.equal('event');
			expect(events._fns[0]._context).to.equal(this);
			expect(events._fns[0]._once).to.be.undefined;
			expect(events._fns[0]._async).to.be.undefined;
		});

		it('should subscribe by event, context, function and once', () => {
			events.subscribe('event', this, callback, true);

			expect(events._fns[0]).to.equal(callback);
			expect(events._fns[0]._event).to.equal('event');
			expect(events._fns[0]._context).to.equal(this);
			expect(events._fns[0]._once).to.be.true;
			expect(events._fns[0]._async).to.be.undefined;
		});

		it('should subscribe by event, context, function once and async', () => {
			events.subscribe('event', this, callback, true, true);

			expect(events._fns[0]).to.equal(callback);
			expect(events._fns[0]._event).to.equal('event');
			expect(events._fns[0]._context).to.equal(this);
			expect(events._fns[0]._once).to.be.true;
			expect(events._fns[0]._async).to.be.true;
		});
	});

	describe('subscribeAsync', () => {
		beforeEach(() => {
			sinon.spy(events, 'subscribe');
		});

		afterEach(() => {
			events.subscribe.restore();
		});

		it('should call subscribe', () => {
			events.subscribeAsync('event', this, callback);

			expect(events.subscribe).to.have.been.calledWithExactly(
				'event',
				this,
				callback,
				false,
				true
			);
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

			expect(events.subscribe).to.have.been.calledWithExactly(
				'event',
				this,
				callback,
				true
			);
		});
	});

	describe('subscribeOnceAsync', () => {
		beforeEach(() => {
			sinon.spy(events, 'subscribe');
		});

		afterEach(() => {
			events.subscribe.restore();
		});

		it('should call subscribe', () => {
			events.subscribeOnceAsync('event', this, callback);

			expect(events.subscribe).to.have.been.calledWithExactly(
				'event',
				this,
				callback,
				true,
				true
			);
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

			describe('without shortcut', () => {
				it('should not unsubscribe by wrong function', () => {
					events.unsubscribe(null, null, () => null);

					expect(events._fns.length).to.equal(1);
				});

				it('should not unsubscribe by wrong context', () => {
					events.unsubscribe(null, {});

					expect(events._fns.length).to.equal(1);
				});

				it('should not unsubscribe by wrong context and function', () => {
					events.unsubscribe(null, {}, callback);

					expect(events._fns.length).to.equal(1);
				});
			});
		});
	});

	describe('trigger', () => {
		beforeEach(() => {
			events.subscribe(callback);
			events.subscribeOnce('event:namespace', callback2);
			events.subscribeOnce('event_', callback3);
		});

		afterEach(() => {
			events.unsubscribe();
		});

		it('should trigger and unsubscribe once', () => {
			const data = {
				a: 1
			};

			events.trigger('event', data);

			expect(callback).to.have.been.calledWithExactly('event', data);
			expect(callback2).to.have.been.calledWithExactly('event', data);
			expect(callback3).not.to.have.been.called;
			expect(events._fns.length).to.equal(2);
		});

		describe('async', () => {
			beforeEach(() => {
				events.subscribeAsync(callback);
				events.subscribe(callback2);
			});

			it('should call async last', done => {
				events.trigger('event', {});
				setTimeout(() => {
					expect(callback2).to.have.been.calledBefore(callback);
					done();
				});
			});
		});
	});
});
