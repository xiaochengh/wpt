// META: script=/common/get-host-info.sub.js
// META: script=/common/utils.js
// META: script=/common/dispatcher/dispatcher.js
// META: script=../credentialless/resources/common.js
// META: script=./resources/common.js

const db_store = token();
const db_name = token();
const db_version = 1;
const id_1 = token();
const id_2 = token();
const value_1 = token();
const value_2 = token();

// The test creates a main document and another one in an anonymous iframe. Then
// both create put one value. Then check they can both read back their own
// value without getting access to the other.
promise_test(async test => {
  // Turn a event handler into a promise.
  const Promisify = (obj, event) => new Promise(r => obj[event] = r);

  {
    // 1. Open the database:
    const request = await indexedDB.open(db_name, db_version);
    request.onerror = test.unreached_func("Unexpected request.onerror");
    request.onupgradeneeded = () => {
      request.result.createObjectStore(db_store, {keyPath: "id"});
    };
    await Promisify(request, "onsuccess");
    const db = request.result;

    // 2. Write:
    const transaction_write = db.transaction(db_store, "readwrite");
    transaction_write.objectStore(db_store).add({
      id: id_1,
      value: value_1,
    });
    await transaction_write.complete;

    db.close();
    // XXX: How to wait for the DB connection to be released?
    await new Promise(r => test.step_timeout(r, 2000));
  }

  // Do the same from within the anonymous iframe.
  const reply = token()
  const anonymous_iframe = newAnonymousIframe(window.origin);
  send(anonymous_iframe, `
    window.Promisify = (obj, event) => new Promise(r => obj[event] = r);

    // 1. Open the database:
    const request = indexedDB.open("${db_name}", "${db_version}");
    request.onupgradeneeded = () => {
      request.result.createObjectStore("${db_store}", {keyPath: "id"});
    };
    await Promisify(request, "onsuccess");
    const db = request.result;

    // 2. Write:
    const transaction_write = db.transaction("${db_store}", "readwrite");
    transaction_write.objectStore("${db_store}").add({
      id: "${id_2}",
      value: "${value_2}",
    });
    await transaction_write.complete;

    db.close();
    send("${reply}", "Done");
  `)
  assert_equals(await receive(reply), "Done");

  // XXX: How to wait for the DB connection to be released?
  await new Promise(r => test.step_timeout(r, 2000));

  {
    // 3. Re-Open the database:
    const request = await indexedDB.open(db_name, db_version);
    request.onerror = test.unreached_func("Unexpected request.onerror");
    await Promisify(request, "onsuccess");
    const db = request.result;

    // 4. Read:
    const transaction_read = db.transaction(db_store, "readonly");
    const get_all = transaction_read.objectStore(db_store).getAll();
    await Promisify(transaction_read, "oncomplete");
    assert_equals(get_all.result.length, 1);
    assert_equals(get_all.result[0].id, id_1);
    assert_equals(get_all.result[0].value, value_1);

    db.close();
    // XXX: How to wait for the DB connection to be released?
    await new Promise(r => test.step_timeout(r, 2000));
  }

  send(anonymous_iframe, `
    // 3. Open the database:
    const request = indexedDB.open("${db_name}", "${db_version}");
    await Promisify(request, "onsuccess");
    const db = request.result;

    // 4. Read:
    const transaction_read = db.transaction("${db_store}", "readonly");
    const get_all = transaction_read.objectStore("${db_store}").getAll();
    await Promisify(transaction_read, "oncomplete");
    send("${reply}", JSON.stringify(get_all.result, null, 2));
  `)

  const get_all_anonymous = JSON.parse(await receive(reply));
  assert_equals(get_all_anonymous.length, 1);
  assert_equals(get_all_anonymous[0].id, id_1);
  assert_equals(get_all_anonymous[0].value, value_1);
})
