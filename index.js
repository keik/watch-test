var chokidar = require('chokidar')
var path = require('path')

var d = require('debug')('watch-test')

module.exports = TestWatcher

function TestWatcher(opts) {
  if (!(this instanceof TestWatcher))
    return new TestWatcher

  opts = opts || {}

  this.verbose = opts.verbose

  // Dependencies map like {module: [depended from...]}
  this.depsMap = {}

  // TODO parameterize
  this.excludePatterns = [
    /\/node_modules\//
  ]

  // TODO parameterize
  this.testModulePatterns = [
    /test-.+\.js/
  ]

  // TODO parameterize
  this.testModules = [
  ]

  this.watcher = chokidar
    .watch()
    .on('change', this.run.bind(this))

  this._stream = process.stdout

  if (this.verbose)
    setTimeout(function() {this._stream.write('\nwaiting to change files...\n')}.bind(this), 100)
}

TestWatcher.prototype.add = function() {
  d('TestWatcher#add')
}

TestWatcher.prototype.addHook = function() {
  d('TestWatcher#addHook')
  var self = this

  var Module = module.constructor
  var originalLoad = Module._load
  Module._load = function(request, parent) {
    var exports = originalLoad.apply(this, arguments)

    // start filter to hook
    if (parent == null)
      return exports

    if (self.excludePatterns.some(p => p.test(parent.id)))
      return exports

    var id
    try {
      id = require.resolve(request)
    } catch (e) {
      try {
        id = require.resolve(path.resolve(path.dirname(parent.id), request))
      } catch (e) {
        return exports
      }
    }

    var parsed = path.parse(id)
    if (parsed.root === '' && parsed.dir === '') // at core module
      return exports

    if (self.excludePatterns.some(p => p.test(id)))
        return exports
    // end to filter

    // store test modules name
    if (self.testModulePatterns.some(p => p.test(id))) {
      if (self.testModules.indexOf(id) < 0) {
        d('  add to watch "' + id + '"')
        self.testModules.push(id)
      }
    }

    // store dependencies
    self.watcher.add(id)
    self.depsMap[id] = self.depsMap[id] || []
    if (self.depsMap[id].indexOf(parent.id) < 0) {
      d('  stored dependencies of "' + id + '"')
      self.depsMap[id].push(parent.id)
    }
    return exports
  }
}

TestWatcher.prototype.run = function(changed) {
  d('TestWatcher#run', changed || '')
  if (changed) {
    this._findTestsToRerun(changed).forEach(_rerun.bind(this))
  } else {
    this.testModules.forEach(_rerun.bind(this))
  }
  if (this.verbose)
    setTimeout(function() {this._stream.write('\nwaiting to change files...\n')}.bind(this), 100)

  function _rerun(test) {
    d('TestWatcher#run _rerun')
    this._deleteModuleCache()
    this.watcher.close()
    require(test)
    this.watcher = chokidar
      .watch(Object.keys(this.depsMap))
      .on('change', this.run.bind(this))
  }
}

TestWatcher.prototype._deleteModuleCache = function() {
  d('TestWatcher._deleteModuleCache')
  d('deleting cache of test modules...')
  this.testModules.forEach(m => {
    delete(require.cache[m])
  })
  d('deleting cache of test runnner modules...')
  Object.keys(require.cache).filter(c => /tape/.test(c)).forEach(m => {
    delete(require.cache[m])
  })
}

// TODO find test entry which depends changed file
TestWatcher.prototype._findTestsToRerun = function(changed, acc) {
  d('TestWatcher#_findTestsToRerun', changed, acc)
  acc = acc || []
  changed = Array.isArray(changed) ? changed : [changed]
  changed.forEach(function(c) {
    if (this.testModules.includes(c)) {
      acc.push(c)
    } else {
      this._findTestsToRerun(this.depsMap[c], acc)
    }
  }.bind(this))
  return acc
}
