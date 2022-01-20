importScripts('/resources/testharness.js');

self.onmessage = (e) => {
  try {
    const mstg = new MediaStreamTrackGenerator({kind: 'video'});
    if ('enable' in e.data) {
      mstg.enabled = e.data.enable;
      assert_not_equals(e.data.enable, mstg.muted);
    }
    self.postMessage({result: 'Success'});
  } catch (e) {
    self.postMessage({result: 'Failure', error: e});
  }
}