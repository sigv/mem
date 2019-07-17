'use strict';
const mimicFn = require('mimic-fn');

const cacheStore = new WeakMap();

const defaultCacheKey = function (x) {
	if (arguments.length === 1 && (x === null || x === undefined || (typeof x !== 'function' && typeof x !== 'object'))) {
		return x;
	}

	return JSON.stringify(arguments); // eslint-disable-line prefer-rest-params
};

module.exports = (fn, opts) => {
	opts = Object.assign({
		cacheKey: defaultCacheKey,
		cache: new Map()
	}, opts);

	const memoized = function () {
		const cache = cacheStore.get(memoized);
		const key = opts.cacheKey.apply(null, arguments); // eslint-disable-line prefer-rest-params
		const maxAgeDefined = typeof opts.maxAge === 'number';

		if (cache.has(key)) {
			const c = cache.get(key);

			if (Date.now() < c.maxAge) {
				return c.data;
			}

			if (typeof c.maxAgeTimeout !== 'undefined') {
				clearTimeout(c.maxAgeTimeout);
			}

			cache.delete(key);
		}

		const ret = fn.apply(null, arguments); // eslint-disable-line prefer-spread, prefer-rest-params

		cache.set(key, {
			data: ret,
			maxAge: maxAgeDefined ? Date.now() + opts.maxAge : Infinity,
			maxAgeTimeout: maxAgeDefined ? setTimeout(() => {
				cache.delete(key);
			}, opts.maxAge).unref() : undefined
		});

		return ret;
	};

	mimicFn(memoized, fn);

	cacheStore.set(memoized, opts.cache);

	return memoized;
};

module.exports.clear = fn => {
	const cache = cacheStore.get(fn);

	if (cache && typeof cache.clear === 'function') {
		cache.forEach(c => {
			if (typeof c.maxAgeTimeout !== 'undefined') {
				clearTimeout(c.maxAgeTimeout);
			}
		});

		cache.clear();
	}
};
