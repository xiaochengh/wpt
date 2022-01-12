// The test functions called in the bfcache test. They rely on artifacts defined
// in
// '/html/browsers/browsing-the-web/back-forward-cache/resources/helper.sub.js'
// which should be include before this file to use these functions.

function runBFCacheCounterTest(params, description) {
  const defaultParams = {
    // This function is to make and obtain the bfcache counter value for a
    // performance entries of mark and meature type. It is to be extended for
    // other types of performance entry in future.
    funcBeforeNavigation: () => {
      window.performance.mark('mark_bfcache_counter');
      return window.performance.getEntriesByName('mark_bfcache_counter')[0].bfcacheCount;
    },
    funcAfterBFCacheLoad: (expectedBFCacheCount) => {
      window.performance.mark('mark_bfcache_counter' + expectedBFCacheCount);
      window.performance.measure('measure_bfcache_counter' + expectedBFCacheCount, 'mark_bfcache_counter', 'mark_bfcache_counter' + expectedBFCacheCount);
      return [window.performance.getEntriesByName('mark_bfcache_counter' + expectedBFCacheCount)[0].bfcacheCount, window.performance.getEntriesByName('measure_bfcache_counter' + expectedBFCacheCount)[0].bfcacheCount];
    },
  }
  params = { ...defaultParams, ...params };
  runBfcacheWithMultipleNavigationTest(params, description);
}

function runBfcacheWithMultipleNavigationTest(params, description) {
  const defaultParams = {
    openFunc: url => window.open(url, '_blank', 'noopener'),
    scripts: [],
    funcBeforeNavigation: () => { },
    targetOrigin: originCrossSite,
    navigationTimes: 1,
    funcAfterAssertion: () => { },
  }
  // Apply defaults.
  params = { ...defaultParams, ...params };

  promise_test(async t => {
    const pageA = new RemoteContext(token());
    const pageB = new RemoteContext(token());

    const urlA = executorPath + pageA.context_id;
    const urlB = params.targetOrigin + executorPath + pageB.context_id;

    params.openFunc(urlA);

    await pageA.execute_script(waitForPageShow);

    // Assert bfcache counter is 0 when the document is loaded first time.
    let bfcacheCount = await pageA.execute_script(params.funcBeforeNavigation)
    assert_implements_optional(bfcacheCount === 0, "BFCacheCount should be 0.");

    for (i = 0; i < params.navigationTimes; i++) {
      await navigateAndThenBack(pageA, pageB, urlB);

      let bfcacheCounts = await pageA.execute_script(params.funcAfterBFCacheLoad, [i + 1]);
      assert_implements_optional(bfcacheCounts.every(t => t === (i + 1)), "BFCacheCounts should all be " + (i + 1) + ".");
    }
  }, description);
}
