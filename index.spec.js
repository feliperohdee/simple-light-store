const _ = require('lodash');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const Store = require('./');

chai.use(sinonChai);

const expect = chai.expect;

describe('index.js', () => {
    let store, storage, memoryStorage;

    beforeEach(() => {
        memoryStorage = {};
        store = new Store();
        storage = {
            getItem: sinon.stub().callsFake(key => memoryStorage[key]),
            setItem: sinon
                .stub()
                .callsFake((key, value) => (memoryStorage[key] = value)),
            removeItem: sinon
                .stub()
                .callsFake((key, value) => delete memoryStorage[key])
        };
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

        it('should let hooks', () => {
            const hooks = {};
            store = new Store({}, null, {}, hooks);

            expect(store.hooks).to.equal(hooks);
        });

        describe('with persistence', () => {
            beforeEach(() => {
                sinon.stub(Store.prototype, 'cleanFalsyPersistedKeys');
                sinon.stub(Store.prototype, 'loadPersisted');
            });

            afterEach(() => {
                Store.prototype.cleanFalsyPersistedKeys.restore();
                Store.prototype.loadPersisted.restore();
            });

            it('should not call cleanFalsyPersistedKeys and loadPersisted if not persistKeys', () => {
                store = new Store();

                expect(Store.prototype.cleanFalsyPersistedKeys).not.to.have.been.called;
                expect(Store.prototype.loadPersisted).not.to.have.been.called;
            });

            it('should not call cleanFalsyPersistedKeys and loadPersisted if persistKeys and not storage', () => {
                store = new Store({}, {
                    a: true
                });

                expect(Store.prototype.cleanFalsyPersistedKeys).not.to.have.been.called;
                expect(Store.prototype.loadPersisted).not.to.have.been.called;
            });

            it('should call cleanFalsyPersistedKeys and loadPersisted if persistKeys and storage', () => {
                store = new Store({}, {
                    a: true
                }, {});

                expect(Store.prototype.cleanFalsyPersistedKeys).to.have.been.called;
                expect(Store.prototype.loadPersisted).to.have.been.called;
            });
        });
    });

    describe('set', () => {
        beforeEach(() => {
            sinon.spy(store, 'trigger');
        });

        afterEach(() => {
            store.trigger.restore();
        });

        it('should update state', () => {
            const state = store.set({
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
            const state = store.set({
                a: 1
            });

            const state1 = store.set({
                b: 2
            }, 'actionName', true);

            const state2 = store.set({
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
            const state = store.set({
                a: 1
            });

            const state1 = store.set();
            const state2 = store.set(null);

            expect(state === state1 && state1 === state2).to.be.true;
        });

        it('should return new object', () => {
            const state = store.set({
                a: 1
            });

            const state1 = store.set({
                a: 2
            });

            expect(state).not.equal(state1);
            expect(state1).to.equal(store.state);
            expect(store.state).to.deep.equal({
                a: 2
            });
        });

        it('should trigger', () => {
            const state = store.set({
                a: 1
            });

            const state1 = store.set({
                b: 2
            }, 'actionName');

            expect(store.trigger).to.have.been.calledTwice;
            expect(store.trigger).to.have.been.calledWithExactly('set', {
                a: 1
            });
            expect(store.trigger).to.have.been.calledWithExactly('actionName', {
                b: 2
            });
        });

        it('should not trigger if silent = true', () => {
            store.set({
                a: 1
            }, 'actionName', false, true);

            expect(store.trigger).not.to.have.been.called;
        });

        describe('with persistence', () => {
            beforeEach(() => {
                sinon.spy(store, 'persistThrottled');
            });

            afterEach(() => {
                store.persistThrottled.restore();
            });

            it('should not call persistThrottled if action = loadPersisted', () => {
                store.storage = storage;
                store.persistKeys = {
                    a: true
                };

                store.set({
                    a: 1
                }, 'store.loadPersisted');

                expect(store.persistThrottled).not.to.have.been.called;
            });

            it('should not call persistThrottled if not persistKeys', () => {
                store.set({
                    a: 1
                });

                expect(store.persistThrottled).not.to.have.been.called;
            });

            it('should not call persistThrottled if persistKeys and not storage', () => {
                store.persistKeys = {
                    a: true
                };

                store.set({
                    a: 1
                });

                expect(store.persistThrottled).not.to.have.been.called;
            });

            it('should call persistThrottled if persistKeys and storage', () => {
                store.storage = storage;
                store.persistKeys = {
                    a: true
                };

                store.set({
                    a: 1
                });

                expect(store.persistThrottled).to.have.been.called;
            });
        });
    });

    describe('sync', () => {
        beforeEach(() => {
            sinon.spy(store, 'set');
        });

        afterEach(() => {
            store.set.restore();
        });

        it('should return unsubscribe', () => {
            const unsubscribe = store.sync();

            expect(store._fns.length).to.equal(1);
            unsubscribe();
            expect(store._fns.length).to.equal(0);
        });

        it('should sync', () => {
            store.sync([{
                filter: (action, changes) => changes.a,
                apply: (action, changes) => ({
                    _a: {
                        a: changes.a
                    }
                })
            }, {
                filter: (action, changes) => changes.b && changes.b.a,
                apply: (action, changes) => ({
                    _b: {
                        a: changes.b.a
                    }
                })
            }]);

            store.set({
                a: 1
            }, 'onChange');

            store.set({
                a: 2,
                b: {
                    a: 2
                }
            }, 'onChange2');

            expect(store.state).to.deep.equal({
                a: 2,
                _a: {
                    a: 2
                },
                b: {
                    a: 2
                },
                _b: {
                    a: 2
                }
            });

            expect(store.set).to.have.been.calledWithExactly({
                _a: {
                    a: 1
                },
                a: 1
            }, 'sync.onChange', true, false);

            expect(store.set).to.have.been.calledWithExactly({
                a: 2,
                _a: {
                    a: 2
                },
                b: {
                    a: 2
                },
                _b: {
                    a: 2
                }
            }, 'sync.onChange2', true, false);

            expect(store.set).to.have.callCount(4);
        });

        it('should not sync if from action starts with sync', () => {
            store.sync([{
                filter: (action, changes) => changes.a,
                apply: (action, changes) => ({
                    _a: {
                        a: changes.a
                    }
                })
            }]);

            store.set({
                a: {
                    a: 1
                }
            }, 'sync');

            store.set({
                a: {
                    a: 1
                }
            }, 'sync.onChange');

            expect(store.state).to.deep.equal({
                a: {
                    a: 1
                }
            });

            expect(store.set).to.have.been.calledTwice;
        });

        it('should not sync if nothing changes', () => {
            store.sync([{
                filter: (action, changes) => changes.a,
                apply: (action, changes) => ({
                    _a: {
                        a: changes.a
                    }
                })
            }]);

            store.set({
                b: {
                    a: 2
                }
            }, 'onChange');

            expect(store.state).to.deep.equal({
                b: {
                    a: 2
                }
            });

            expect(store.set).not.to.have.been.calledWithExactly(store.s, true, 'sync');
            expect(store.set).to.have.been.calledOnce;
        });

        it('should not sync state if no sync.filter', () => {
            store.sync([{
                apply: (action, changes) => ({
                    _a: {
                        a: changes.a
                    }
                })
            }]);

            store.set({
                a: 1
            }, 'onChange');

            expect(store.state).to.deep.equal({
                a: 1
            });
        });

        it('should not sync state if not sync.apply', () => {
            store.sync([{
                filter: (action, changes) => changes.a
            }]);

            store.set({
                a: 1
            }, 'onChange');

            expect(store.state).to.deep.equal({
                a: 1
            });
        });

        it('should not sync state if sync.apply not object', () => {
            store.sync([{
                filter: (action, changes) => changes.a,
                apply: () => 123
            }]);

            store.set({
                a: 1
            }, 'onChange');

            expect(store.state).to.deep.equal({
                a: 1
            });
        });

        it('should call callback', () => {
            const callback = sinon.stub();

            store.sync([{
                filter: (action, changes) => changes.a,
                apply: (action, changes) => ({
                    _a: {
                        a: changes.a.a
                    }
                })
            }], callback);

            store.set({
                a: {
                    a: 1
                }
            }, 'onChange');

            expect(callback).to.have.been.calledOnce;
            expect(callback).to.have.been.calledWithExactly(
                store.state,
                'sync.onChange'
            );
        });
    });

    describe('persistence', () => {
        beforeEach(() => {
            store = new Store({}, null, storage);
        });

        describe('cleanFalsyPersistedKeys', () => {
            it('should remove unused keys', () => {
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
                    '__p.d': 'true',
                    '__p.e': 'null'
                };

                store.persistKeys = {
                    a: false,
                    b: true,
                    c: false,
                    d: false,
                    e: false
                };

                store.cleanFalsyPersistedKeys();

                expect(_.size(memoryStorage)).to.equal(1);
            });
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

            describe('hook', () => {
                beforeEach(() => {
                    store.hooks.setPersist = sinon.stub()
                        .returns('hooked');
                });

                afterEach(() => {
                    store.hooks.setPersist = null;
                });

                it('should persist hooked data', () => {
                    store.setPersist('key', 'value');

                    expect(store.hooks.setPersist).to.have.been.calledWithExactly('"value"');
                    expect(memoryStorage).to.deep.equal({
                        '__p.key': 'hooked'
                    });
                });
            });

            describe('error', () => {
                beforeEach(() => {
                    sinon.stub(console, 'error');
                    sinon.stub(JSON, 'stringify').throws(new Error());
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

            describe('hook', () => {
                beforeEach(() => {
                    store.hooks.getPersist = sinon.stub().returns('hooked');
                });

                afterEach(() => {
                    store.hooks.getPersist = null;
                });

                it('should persist hooked data', () => {
                    expect(store.getPersist('key')).to.equal('hooked');
                    expect(store.hooks.getPersist).to.have.been.calledWithExactly('value');
                });
            });

            describe('error', () => {
                beforeEach(() => {
                    sinon.stub(console, 'error');
                    sinon.stub(JSON, 'parse').throws(new Error());
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

        describe('removePersist', () => {
            beforeEach(() => {
                store.setPersist('key', 'value');
            });

            it('should remove', () => {
                store.removePersist('key');

                expect(memoryStorage).to.deep.equal({});
            });

            describe('error', () => {
                beforeEach(() => {
                    sinon.stub(console, 'error');
                    store.storage.removeItem = () => {
                        throw new Error();
                    };
                });

                afterEach(() => {
                    console.error.restore();
                });

                it('should return undefined', () => {
                    store.removePersist('key');

                    expect(memoryStorage).to.deep.equal({
                        '__p.key': '"value"'
                    });
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
                    '__p.d': 'true',
                    '__p.e': 'null'
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

            it('should include', () => {
                store.persistKeys = {
                    b: {
                        include: ['c', 'd', 'e.c', 'e.d']
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
                    })
                });
            });

            it('should exclude', () => {
                store.persistKeys = {
                    b: {
                        exclude: ['a', 'b', 'e.a', 'e.b']
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
                    })
                });
            });

            describe('hook', () => {
                beforeEach(() => {
                    store.persistKeys = {
                        v: true
                    };

                    store.hooks.persist = sinon.stub()
                        .returns('hooked');
                });

                afterEach(() => {
                    store.hooks.persist = null;
                });

                it('should persist hooked data', () => {
                    store.persist({
                        v: 'value'
                    });

                    expect(store.hooks.persist).to.have.been.calledWithExactly('value');
                    expect(memoryStorage).to.deep.equal({
                        '__p.v': '"hooked"'
                    });
                });
            });
        });

        describe('loadPersisted', () => {
            beforeEach(() => {
                sinon.spy(store, 'set');

                memoryStorage = {
                    '__p.a': '1',
                    '__p.b': JSON.stringify({
                        a: 1,
                        b: 2,
                        c: 3,
                        d: 4
                    }),
                    '__p.c': JSON.stringify([1, 2, 3]),
                    '__p.d': 'true',
                    '__p.e': 'null'
                };

                store.persistKeys = {
                    a: true,
                    b: true,
                    c: true,
                    d: true,
                    e: true
                };
            });

            afterEach(() => {
                store.set.restore();
            });

            it('should not load if no persistKeys', () => {
                store.persistKeys = null;
                store.loadPersisted();

                expect(store.state).to.deep.equal({});
            });

            it('should call set silently', () => {
                store.loadPersisted();

                expect(store.set).to.have.callCount(5);
                expect(store.set).to.have.been.calledWith(
                    sinon.match.object,
                    'store.loadPersisted',
                    false,
                    true
                );
            });

            it('should load', () => {
                store.loadPersisted();
                expect(store.state).to.deep.equal({
                    a: 1,
                    b: {
                        a: 1,
                        b: 2,
                        c: 3,
                        d: 4
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

                store.loadPersisted();
                expect(store.state).to.deep.equal({
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

                store.loadPersisted();
                expect(store.state).to.deep.equal({
                    a: 1,
                    b: {
                        a: 1,
                        b: 2,
                        c: 3,
                        d: 4,
                        e: {
                            a: 5
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

                store.loadPersisted();
                expect(store.state).to.deep.equal({
                    b: {
                        e: {
                            a: 5
                        }
                    }
                });
            });

            describe('hook', () => {
                beforeEach(() => {
                    store.hooks.mergePersisted = sinon.spy(_, 'merge');
                });

                afterEach(() => {
                    _.merge.restore();
                });

                it('should use hooked merge', () => {
                    store.loadPersisted();
                    expect(_.merge).to.have.been.called;
                });
            });
        });
    });
});