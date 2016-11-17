var test = require('tape')

var TestWatcher = require('../')
var relativify = require('./utils').relativify

var cwd = process.cwd()

test('TestWatcher#addHook should store dependencies map and test modules excluding by `**/node_modules/**` by defaults (1)', function(t) {
  var watcher = new TestWatcher()
  watcher.addHook()

  require('./fixture/test-with-tape/test-b')
  t.deepEqual(relativify(watcher.depsMap, cwd),
    { 'test/fixture/b.js': [ 'test/fixture/test-with-tape/test-b.js' ] }
  )
  t.deepEqual(relativify(watcher.testModules, cwd),
    [ 'test/fixture/test-with-tape/test-b.js' ]
  )

  setTimeout(function() {
    watcher.invalidateAll()
  }, 100)
  t.end()
})

test('TestWatcher#addHook should store dependencies map and test modules excluding by `**/node_modules/**` by defaults (2)', function(t) {
  var watcher = new TestWatcher()
  watcher.addHook()

  require('./fixture/test-with-tape/test-c')
  t.deepEqual(relativify(watcher.depsMap, cwd),
    { 'test/fixture/c-1.js': [ 'test/fixture/c.js' ],
      'test/fixture/c-2-1.js': [ 'test/fixture/c-2.js' ],
      'test/fixture/c-2.js': [ 'test/fixture/c.js' ],
      'test/fixture/c.js': [ 'test/fixture/test-with-tape/test-c.js' ] }
  )
  t.deepEqual(relativify(watcher.testModules, cwd),
    [ 'test/fixture/test-with-tape/test-c.js' ]
  )

  setTimeout(function() {
    watcher.invalidateAll()
  }, 100)
  t.end()
})

test('`excludePattern` option should work TestWatcher#addHook to store dependencies map and test modules', function(t) {
  var watcher = new TestWatcher({excludePattern: ''})
  watcher.addHook()

  require('./fixture/test-with-tape/test-b')
  // dependencies of node_modules like `tape` exist
  t.deepEqual(relativify(watcher.depsMap, cwd)['node_modules/tape/index.js'],
    [ 'test/fixture/test-with-tape/test-b.js' ]
  )
  t.deepEqual(relativify(watcher.testModules, cwd),
    [ 'test/fixture/test-with-tape/test-b.js' ]
  )
  setTimeout(function() {
    watcher.invalidateAll()
  }, 100)
  t.end()
})

test('`testModulePattern` option should work TestWatcher#addHook to store dependencies map and test modules', function(t) {
  var watcher = new TestWatcher({testModulePattern: '**'})
  watcher.addHook()

  require('./fixture/test-with-tape/test-c')
  // no modules are stored as dependencies because all required modules are as `testModules` by pattern '**'
  t.deepEqual(relativify(watcher.depsMap, cwd),
    {}
  )
  // all required module are as `testModules`
  t.deepEqual(relativify(watcher.testModules, cwd),
    [ 'test/fixture/c-1.js', 'test/fixture/c-2-1.js', 'test/fixture/c-2.js', 'test/fixture/c.js', 'test/fixture/test-with-tape/test-c.js' ]
  )
  setTimeout(function() {
    watcher.invalidateAll()
  }, 100)
  t.end()
})

test.onFinish(function() {
  process.stdout.write = function() {}
})
