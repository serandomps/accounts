/**
 * Require the module at `name`.
 *
 * @param {String} name
 * @return {Object} exports
 * @api public
 */

function require(name) {
  var module = require.modules[name];
  if (!module) throw new Error('failed to require "' + name + '"');

  if (!('exports' in module) && typeof module.definition === 'function') {
    module.client = module.component = true;
    module.definition.call(this, module.exports = {}, module);
    delete module.definition;
  }

  return module.exports;
}

/**
 * Meta info, accessible in the global scope unless you use AMD option.
 */

require.loader = 'component';

/**
 * Internal helper object, contains a sorting function for semantiv versioning
 */
require.helper = {};
require.helper.semVerSort = function(a, b) {
  var aArray = a.version.split('.');
  var bArray = b.version.split('.');
  for (var i=0; i<aArray.length; ++i) {
    var aInt = parseInt(aArray[i], 10);
    var bInt = parseInt(bArray[i], 10);
    if (aInt === bInt) {
      var aLex = aArray[i].substr((""+aInt).length);
      var bLex = bArray[i].substr((""+bInt).length);
      if (aLex === '' && bLex !== '') return 1;
      if (aLex !== '' && bLex === '') return -1;
      if (aLex !== '' && bLex !== '') return aLex > bLex ? 1 : -1;
      continue;
    } else if (aInt > bInt) {
      return 1;
    } else {
      return -1;
    }
  }
  return 0;
}

/**
 * Find and require a module which name starts with the provided name.
 * If multiple modules exists, the highest semver is used.
 * This function can only be used for remote dependencies.

 * @param {String} name - module name: `user~repo`
 * @param {Boolean} returnPath - returns the canonical require path if true,
 *                               otherwise it returns the epxorted module
 */
require.latest = function (name, returnPath) {
  function showError(name) {
    throw new Error('failed to find latest module of "' + name + '"');
  }
  // only remotes with semvers, ignore local files conataining a '/'
  var versionRegexp = /(.*)~(.*)@v?(\d+\.\d+\.\d+[^\/]*)$/;
  var remoteRegexp = /(.*)~(.*)/;
  if (!remoteRegexp.test(name)) showError(name);
  var moduleNames = Object.keys(require.modules);
  var semVerCandidates = [];
  var otherCandidates = []; // for instance: name of the git branch
  for (var i=0; i<moduleNames.length; i++) {
    var moduleName = moduleNames[i];
    if (new RegExp(name + '@').test(moduleName)) {
        var version = moduleName.substr(name.length+1);
        var semVerMatch = versionRegexp.exec(moduleName);
        if (semVerMatch != null) {
          semVerCandidates.push({version: version, name: moduleName});
        } else {
          otherCandidates.push({version: version, name: moduleName});
        }
    }
  }
  if (semVerCandidates.concat(otherCandidates).length === 0) {
    showError(name);
  }
  if (semVerCandidates.length > 0) {
    var module = semVerCandidates.sort(require.helper.semVerSort).pop().name;
    if (returnPath === true) {
      return module;
    }
    return require(module);
  }
  // if the build contains more than one branch of the same module
  // you should not use this funciton
  var module = otherCandidates.sort(function(a, b) {return a.name > b.name})[0].name;
  if (returnPath === true) {
    return module;
  }
  return require(module);
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Register module at `name` with callback `definition`.
 *
 * @param {String} name
 * @param {Function} definition
 * @api private
 */

require.register = function (name, definition) {
  require.modules[name] = {
    definition: definition
  };
};

/**
 * Define a module's exports immediately with `exports`.
 *
 * @param {String} name
 * @param {Generic} exports
 * @api private
 */

require.define = function (name, exports) {
  require.modules[name] = {
    exports: exports
  };
};
require.register("juliangruber~isarray@0.0.1", function (exports, module) {
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

});

require.register("pillarjs~path-to-regexp@v1.2.1", function (exports, module) {
var isarray = require('juliangruber~isarray@0.0.1')

/**
 * Expose `pathToRegexp`.
 */
module.exports = pathToRegexp
module.exports.parse = parse
module.exports.compile = compile
module.exports.tokensToFunction = tokensToFunction
module.exports.tokensToRegExp = tokensToRegExp

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
  // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
  // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
  '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
].join('|'), 'g')

/**
 * Parse a string for the raw tokens.
 *
 * @param  {String} str
 * @return {Array}
 */
function parse (str) {
  var tokens = []
  var key = 0
  var index = 0
  var path = ''
  var res

  while ((res = PATH_REGEXP.exec(str)) != null) {
    var m = res[0]
    var escaped = res[1]
    var offset = res.index
    path += str.slice(index, offset)
    index = offset + m.length

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1]
      continue
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path)
      path = ''
    }

    var prefix = res[2]
    var name = res[3]
    var capture = res[4]
    var group = res[5]
    var suffix = res[6]
    var asterisk = res[7]

    var repeat = suffix === '+' || suffix === '*'
    var optional = suffix === '?' || suffix === '*'
    var delimiter = prefix || '/'
    var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?')

    tokens.push({
      name: name || key++,
      prefix: prefix || '',
      delimiter: delimiter,
      optional: optional,
      repeat: repeat,
      pattern: escapeGroup(pattern)
    })
  }

  // Match any characters still remaining.
  if (index < str.length) {
    path += str.substr(index)
  }

  // If the path exists, push it onto the end.
  if (path) {
    tokens.push(path)
  }

  return tokens
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {String}   str
 * @return {Function}
 */
function compile (str) {
  return tokensToFunction(parse(str))
}

/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction (tokens) {
  // Compile all the tokens into regexps.
  var matches = new Array(tokens.length)

  // Compile all the patterns before compilation.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object') {
      matches[i] = new RegExp('^' + tokens[i].pattern + '$')
    }
  }

  return function (obj) {
    var path = ''
    var data = obj || {}

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i]

      if (typeof token === 'string') {
        path += token

        continue
      }

      var value = data[token.name]
      var segment

      if (value == null) {
        if (token.optional) {
          continue
        } else {
          throw new TypeError('Expected "' + token.name + '" to be defined')
        }
      }

      if (isarray(value)) {
        if (!token.repeat) {
          throw new TypeError('Expected "' + token.name + '" to not repeat, but received "' + value + '"')
        }

        if (value.length === 0) {
          if (token.optional) {
            continue
          } else {
            throw new TypeError('Expected "' + token.name + '" to not be empty')
          }
        }

        for (var j = 0; j < value.length; j++) {
          segment = encodeURIComponent(value[j])

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
          }

          path += (j === 0 ? token.prefix : token.delimiter) + segment
        }

        continue
      }

      segment = encodeURIComponent(value)

      if (!matches[i].test(segment)) {
        throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
      }

      path += token.prefix + segment
    }

    return path
  }
}

/**
 * Escape a regular expression string.
 *
 * @param  {String} str
 * @return {String}
 */
function escapeString (str) {
  return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1')
}

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {String} group
 * @return {String}
 */
function escapeGroup (group) {
  return group.replace(/([=!:$\/()])/g, '\\$1')
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {RegExp} re
 * @param  {Array}  keys
 * @return {RegExp}
 */
function attachKeys (re, keys) {
  re.keys = keys
  return re
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {String}
 */
function flags (options) {
  return options.sensitive ? '' : 'i'
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {RegExp} path
 * @param  {Array}  keys
 * @return {RegExp}
 */
function regexpToRegexp (path, keys) {
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g)

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        pattern: null
      })
    }
  }

  return attachKeys(path, keys)
}

/**
 * Transform an array into a regexp.
 *
 * @param  {Array}  path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function arrayToRegexp (path, keys, options) {
  var parts = []

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options).source)
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options))

  return attachKeys(regexp, keys)
}

/**
 * Create a path regexp from string input.
 *
 * @param  {String} path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function stringToRegexp (path, keys, options) {
  var tokens = parse(path)
  var re = tokensToRegExp(tokens, options)

  // Attach keys back to the regexp.
  for (var i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] !== 'string') {
      keys.push(tokens[i])
    }
  }

  return attachKeys(re, keys)
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {Array}  tokens
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function tokensToRegExp (tokens, options) {
  options = options || {}

  var strict = options.strict
  var end = options.end !== false
  var route = ''
  var lastToken = tokens[tokens.length - 1]
  var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken)

  // Iterate over the tokens and create our regexp string.
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i]

    if (typeof token === 'string') {
      route += escapeString(token)
    } else {
      var prefix = escapeString(token.prefix)
      var capture = token.pattern

      if (token.repeat) {
        capture += '(?:' + prefix + capture + ')*'
      }

      if (token.optional) {
        if (prefix) {
          capture = '(?:' + prefix + '(' + capture + '))?'
        } else {
          capture = '(' + capture + ')?'
        }
      } else {
        capture = prefix + '(' + capture + ')'
      }

      route += capture
    }
  }

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?'
  }

  if (end) {
    route += '$'
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithSlash ? '' : '(?=\\/|$)'
  }

  return new RegExp('^' + route, flags(options))
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(String|RegExp|Array)} path
 * @param  {Array}                 [keys]
 * @param  {Object}                [options]
 * @return {RegExp}
 */
function pathToRegexp (path, keys, options) {
  keys = keys || []

  if (!isarray(keys)) {
    options = keys
    keys = []
  } else if (!options) {
    options = {}
  }

  if (path instanceof RegExp) {
    return regexpToRegexp(path, keys, options)
  }

  if (isarray(path)) {
    return arrayToRegexp(path, keys, options)
  }

  return stringToRegexp(path, keys, options)
}

});

require.register("visionmedia~page.js@1.7.1", function (exports, module) {
  /* globals require, module */

  'use strict';

  /**
   * Module dependencies.
   */

  var pathtoRegexp = require('pillarjs~path-to-regexp@v1.2.1');

  /**
   * Module exports.
   */

  module.exports = page;

  /**
   * Detect click event
   */
  var clickEvent = ('undefined' !== typeof document) && document.ontouchstart ? 'touchstart' : 'click';

  /**
   * To work properly with the URL
   * history.location generated polyfill in https://github.com/devote/HTML5-History-API
   */

  var location = ('undefined' !== typeof window) && (window.history.location || window.location);

  /**
   * Perform initial dispatch.
   */

  var dispatch = true;


  /**
   * Decode URL components (query string, pathname, hash).
   * Accommodates both regular percent encoding and x-www-form-urlencoded format.
   */
  var decodeURLComponents = true;

  /**
   * Base path.
   */

  var base = '';

  /**
   * Running flag.
   */

  var running;

  /**
   * HashBang option
   */

  var hashbang = false;

  /**
   * Previous context, for capturing
   * page exit events.
   */

  var prevContext;

  /**
   * Register `path` with callback `fn()`,
   * or route `path`, or redirection,
   * or `page.start()`.
   *
   *   page(fn);
   *   page('*', fn);
   *   page('/user/:id', load, user);
   *   page('/user/' + user.id, { some: 'thing' });
   *   page('/user/' + user.id);
   *   page('/from', '/to')
   *   page();
   *
   * @param {string|!Function|!Object} path
   * @param {Function=} fn
   * @api public
   */

  function page(path, fn) {
    // <callback>
    if ('function' === typeof path) {
      return page('*', path);
    }

    // route <path> to <callback ...>
    if ('function' === typeof fn) {
      var route = new Route(/** @type {string} */ (path));
      for (var i = 1; i < arguments.length; ++i) {
        page.callbacks.push(route.middleware(arguments[i]));
      }
      // show <path> with [state]
    } else if ('string' === typeof path) {
      page['string' === typeof fn ? 'redirect' : 'show'](path, fn);
      // start [options]
    } else {
      page.start(path);
    }
  }

  /**
   * Callback functions.
   */

  page.callbacks = [];
  page.exits = [];

  /**
   * Current path being processed
   * @type {string}
   */
  page.current = '';

  /**
   * Number of pages navigated to.
   * @type {number}
   *
   *     page.len == 0;
   *     page('/login');
   *     page.len == 1;
   */

  page.len = 0;

  /**
   * Get or set basepath to `path`.
   *
   * @param {string} path
   * @api public
   */

  page.base = function(path) {
    if (0 === arguments.length) return base;
    base = path;
  };

  /**
   * Bind with the given `options`.
   *
   * Options:
   *
   *    - `click` bind to click events [true]
   *    - `popstate` bind to popstate [true]
   *    - `dispatch` perform initial dispatch [true]
   *
   * @param {Object} options
   * @api public
   */

  page.start = function(options) {
    options = options || {};
    if (running) return;
    running = true;
    if (false === options.dispatch) dispatch = false;
    if (false === options.decodeURLComponents) decodeURLComponents = false;
    if (false !== options.popstate) window.addEventListener('popstate', onpopstate, false);
    if (false !== options.click) {
      document.addEventListener(clickEvent, onclick, false);
    }
    if (true === options.hashbang) hashbang = true;
    if (!dispatch) return;
    var url = (hashbang && ~location.hash.indexOf('#!')) ? location.hash.substr(2) + location.search : location.pathname + location.search + location.hash;
    page.replace(url, null, true, dispatch);
  };

  /**
   * Unbind click and popstate event handlers.
   *
   * @api public
   */

  page.stop = function() {
    if (!running) return;
    page.current = '';
    page.len = 0;
    running = false;
    document.removeEventListener(clickEvent, onclick, false);
    window.removeEventListener('popstate', onpopstate, false);
  };

  /**
   * Show `path` with optional `state` object.
   *
   * @param {string} path
   * @param {Object=} state
   * @param {boolean=} dispatch
   * @param {boolean=} push
   * @return {!Context}
   * @api public
   */

  page.show = function(path, state, dispatch, push) {
    var ctx = new Context(path, state);
    page.current = ctx.path;
    if (false !== dispatch) page.dispatch(ctx);
    if (false !== ctx.handled && false !== push) ctx.pushState();
    return ctx;
  };

  /**
   * Goes back in the history
   * Back should always let the current route push state and then go back.
   *
   * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
   * @param {Object=} state
   * @api public
   */

  page.back = function(path, state) {
    if (page.len > 0) {
      // this may need more testing to see if all browsers
      // wait for the next tick to go back in history
      history.back();
      page.len--;
    } else if (path) {
      setTimeout(function() {
        page.show(path, state);
      });
    }else{
      setTimeout(function() {
        page.show(base, state);
      });
    }
  };


  /**
   * Register route to redirect from one path to other
   * or just redirect to another route
   *
   * @param {string} from - if param 'to' is undefined redirects to 'from'
   * @param {string=} to
   * @api public
   */
  page.redirect = function(from, to) {
    // Define route from a path to another
    if ('string' === typeof from && 'string' === typeof to) {
      page(from, function(e) {
        setTimeout(function() {
          page.replace(/** @type {!string} */ (to));
        }, 0);
      });
    }

    // Wait for the push state and replace it with another
    if ('string' === typeof from && 'undefined' === typeof to) {
      setTimeout(function() {
        page.replace(from);
      }, 0);
    }
  };

  /**
   * Replace `path` with optional `state` object.
   *
   * @param {string} path
   * @param {Object=} state
   * @param {boolean=} init
   * @param {boolean=} dispatch
   * @return {!Context}
   * @api public
   */


  page.replace = function(path, state, init, dispatch) {
    var ctx = new Context(path, state);
    page.current = ctx.path;
    ctx.init = init;
    ctx.save(); // save before dispatching, which may redirect
    if (false !== dispatch) page.dispatch(ctx);
    return ctx;
  };

  /**
   * Dispatch the given `ctx`.
   *
   * @param {Context} ctx
   * @api private
   */
  page.dispatch = function(ctx) {
    var prev = prevContext,
      i = 0,
      j = 0;

    prevContext = ctx;

    function nextExit() {
      var fn = page.exits[j++];
      if (!fn) return nextEnter();
      fn(prev, nextExit);
    }

    function nextEnter() {
      var fn = page.callbacks[i++];

      if (ctx.path !== page.current) {
        ctx.handled = false;
        return;
      }
      if (!fn) return unhandled(ctx);
      fn(ctx, nextEnter);
    }

    if (prev) {
      nextExit();
    } else {
      nextEnter();
    }
  };

  /**
   * Unhandled `ctx`. When it's not the initial
   * popstate then redirect. If you wish to handle
   * 404s on your own use `page('*', callback)`.
   *
   * @param {Context} ctx
   * @api private
   */
  function unhandled(ctx) {
    if (ctx.handled) return;
    var current;

    if (hashbang) {
      current = base + location.hash.replace('#!', '');
    } else {
      current = location.pathname + location.search;
    }

    if (current === ctx.canonicalPath) return;
    page.stop();
    ctx.handled = false;
    location.href = ctx.canonicalPath;
  }

  /**
   * Register an exit route on `path` with
   * callback `fn()`, which will be called
   * on the previous context when a new
   * page is visited.
   */
  page.exit = function(path, fn) {
    if (typeof path === 'function') {
      return page.exit('*', path);
    }

    var route = new Route(path);
    for (var i = 1; i < arguments.length; ++i) {
      page.exits.push(route.middleware(arguments[i]));
    }
  };

  /**
   * Remove URL encoding from the given `str`.
   * Accommodates whitespace in both x-www-form-urlencoded
   * and regular percent-encoded form.
   *
   * @param {string} val - URL component to decode
   */
  function decodeURLEncodedURIComponent(val) {
    if (typeof val !== 'string') { return val; }
    return decodeURLComponents ? decodeURIComponent(val.replace(/\+/g, ' ')) : val;
  }

  /**
   * Initialize a new "request" `Context`
   * with the given `path` and optional initial `state`.
   *
   * @constructor
   * @param {string} path
   * @param {Object=} state
   * @api public
   */

  function Context(path, state) {
    if ('/' === path[0] && 0 !== path.indexOf(base)) path = base + (hashbang ? '#!' : '') + path;
    var i = path.indexOf('?');

    this.canonicalPath = path;
    this.path = path.replace(base, '') || '/';
    if (hashbang) this.path = this.path.replace('#!', '') || '/';

    this.title = document.title;
    this.state = state || {};
    this.state.path = path;
    this.querystring = ~i ? decodeURLEncodedURIComponent(path.slice(i + 1)) : '';
    this.pathname = decodeURLEncodedURIComponent(~i ? path.slice(0, i) : path);
    this.params = {};

    // fragment
    this.hash = '';
    if (!hashbang) {
      if (!~this.path.indexOf('#')) return;
      var parts = this.path.split('#');
      this.path = parts[0];
      this.hash = decodeURLEncodedURIComponent(parts[1]) || '';
      this.querystring = this.querystring.split('#')[0];
    }
  }

  /**
   * Expose `Context`.
   */

  page.Context = Context;

  /**
   * Push state.
   *
   * @api private
   */

  Context.prototype.pushState = function() {
    page.len++;
    history.pushState(this.state, this.title, hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
  };

  /**
   * Save the context state.
   *
   * @api public
   */

  Context.prototype.save = function() {
    history.replaceState(this.state, this.title, hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
  };

  /**
   * Initialize `Route` with the given HTTP `path`,
   * and an array of `callbacks` and `options`.
   *
   * Options:
   *
   *   - `sensitive`    enable case-sensitive routes
   *   - `strict`       enable strict matching for trailing slashes
   *
   * @constructor
   * @param {string} path
   * @param {Object=} options
   * @api private
   */

  function Route(path, options) {
    options = options || {};
    this.path = (path === '*') ? '(.*)' : path;
    this.method = 'GET';
    this.regexp = pathtoRegexp(this.path,
      this.keys = [],
      options);
  }

  /**
   * Expose `Route`.
   */

  page.Route = Route;

  /**
   * Return route middleware with
   * the given callback `fn()`.
   *
   * @param {Function} fn
   * @return {Function}
   * @api public
   */

  Route.prototype.middleware = function(fn) {
    var self = this;
    return function(ctx, next) {
      if (self.match(ctx.path, ctx.params)) return fn(ctx, next);
      next();
    };
  };

  /**
   * Check if this route matches `path`, if so
   * populate `params`.
   *
   * @param {string} path
   * @param {Object} params
   * @return {boolean}
   * @api private
   */

  Route.prototype.match = function(path, params) {
    var keys = this.keys,
      qsIndex = path.indexOf('?'),
      pathname = ~qsIndex ? path.slice(0, qsIndex) : path,
      m = this.regexp.exec(decodeURIComponent(pathname));

    if (!m) return false;

    for (var i = 1, len = m.length; i < len; ++i) {
      var key = keys[i - 1];
      var val = decodeURLEncodedURIComponent(m[i]);
      if (val !== undefined || !(hasOwnProperty.call(params, key.name))) {
        params[key.name] = val;
      }
    }

    return true;
  };


  /**
   * Handle "populate" events.
   */

  var onpopstate = (function () {
    var loaded = false;
    if ('undefined' === typeof window) {
      return;
    }
    if (document.readyState === 'complete') {
      loaded = true;
    } else {
      window.addEventListener('load', function() {
        setTimeout(function() {
          loaded = true;
        }, 0);
      });
    }
    return function onpopstate(e) {
      if (!loaded) return;
      if (e.state) {
        var path = e.state.path;
        page.replace(path, e.state);
      } else {
        page.show(location.pathname + location.hash, undefined, undefined, false);
      }
    };
  })();
  /**
   * Handle "click" events.
   */

  function onclick(e) {

    if (1 !== which(e)) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.defaultPrevented) return;



    // ensure link
    // use shadow dom when available
    var el = e.path ? e.path[0] : e.target;
    while (el && 'A' !== el.nodeName) el = el.parentNode;
    if (!el || 'A' !== el.nodeName) return;



    // Ignore if tag has
    // 1. "download" attribute
    // 2. rel="external" attribute
    if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

    // ensure non-hash for the same path
    var link = el.getAttribute('href');
    if (!hashbang && el.pathname === location.pathname && (el.hash || '#' === link)) return;



    // Check for mailto: in the href
    if (link && link.indexOf('mailto:') > -1) return;

    // check target
    if (el.target) return;

    // x-origin
    if (!sameOrigin(el.href)) return;



    // rebuild path
    var path = el.pathname + el.search + (el.hash || '');

    // strip leading "/[drive letter]:" on NW.js on Windows
    if (typeof process !== 'undefined' && path.match(/^\/[a-zA-Z]:\//)) {
      path = path.replace(/^\/[a-zA-Z]:\//, '/');
    }

    // same page
    var orig = path;

    if (path.indexOf(base) === 0) {
      path = path.substr(base.length);
    }

    if (hashbang) path = path.replace('#!', '');

    if (base && orig === path) return;

    e.preventDefault();
    page.show(orig);
  }

  /**
   * Event button.
   */

  function which(e) {
    e = e || window.event;
    return null === e.which ? e.button : e.which;
  }

  /**
   * Check if `href` is the same origin.
   */

  function sameOrigin(href) {
    var origin = location.protocol + '//' + location.hostname;
    if (location.port) origin += ':' + location.port;
    return (href && (0 === href.indexOf(origin)));
  }

  page.sameOrigin = sameOrigin;

});

require.register("serandomps~async@master", function (exports, module) {
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
        previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function () {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = setImmediate;
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {
        };
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(function (err) {
                if (err) {
                    callback(err);
                    callback = function () {
                    };
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                }
            }));
        });
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {
        };
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {
                    };
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {
            };
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish() {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {
                            };
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function (limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function (limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {
                    };
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {
                    };
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {
                    };
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {
        };
        var keys = _keys(tasks);
        if (!keys.length) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function () {
                };
            }
        });

        _each(keys, function (k) {
            var task = (tasks[k] instanceof Function) ? [tasks[k]] : tasks[k];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function (rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {
                    };
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {
        };
        if (tasks.constructor !== Array) {
            var err = new Error('First argument to waterfall must be an array of functions');
            return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {
                    };
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function (eachfn, tasks, callback) {
        callback = callback || function () {
        };
        if (tasks.constructor === Array) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function (tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {
        };
        if (tasks.constructor === Array) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1) : null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (test()) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (!test()) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
            if (data.constructor !== Array) {
                data = [data];
            }
            _each(data, function (task) {
                var item = {
                    data: task,
                    callback: typeof callback === 'function' ? callback : null
                };

                if (pos) {
                    q.tasks.unshift(item);
                } else {
                    q.tasks.push(item);
                }

                if (q.saturated && q.tasks.length === concurrency) {
                    q.saturated();
                }
                async.setImmediate(q.process);
            });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                _insert(q, data, false, callback);
            },
            unshift: function (data, callback) {
                _insert(q, data, true, callback);
            },
            process: function () {
                if (workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working = false,
            tasks = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                if (data.constructor !== Array) {
                    data = [data];
                }
                _each(data, function (task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if (cargo.drain) cargo.drain();
                    return;
                }

                var ts = typeof payload === 'number'
                    ? tasks.splice(0, payload)
                    : tasks.splice(0);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if (cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
     async.warn = _console_fn('warn');
     async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                callback.apply(null, memo[key]);
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                        q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
        return function () {
            return (fn.unmemoized || fn).apply(null, arguments);
        };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.compose = function (/* functions... */) {
        var fns = Array.prototype.reverse.call(arguments);
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                    fn.apply(that, newargs.concat([function () {
                        var err = arguments[0];
                        var nextargs = Array.prototype.slice.call(arguments, 1);
                        cb(err, nextargs);
                    }]))
                },
                function (err, results) {
                    callback.apply(that, [err].concat(results));
                });
        };
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                    fn.apply(that, args.concat([cb]));
                },
                callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }

        next();
    };

    // AMD / RequireJS
    if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // Node.js
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());
});

require.register("serandomps~dust@master/dust.js", function (exports, module) {
//
// Dust - Asynchronous Templating v2.1.0
// http://akdubya.github.com/dustjs
//
// Copyright (c) 2010, Aleksander Williams
// Released under the MIT License.
//

var dust = {};

function getGlobal(){
    return dust;
}

(function(dust) {

if(!dust) {
  return;
}
var ERROR = 'ERROR',
    WARN = 'WARN',
    INFO = 'INFO',
    DEBUG = 'DEBUG',
    levels = [DEBUG, INFO, WARN, ERROR],
    logger = function() {};

dust.isDebug = false;
dust.debugLevel = INFO;

// Try to find the console logger in window scope (browsers) or top level scope (node.js)
if (typeof window !== 'undefined' && window && window.console && window.console.log) {
  logger = window.console.log;
} else if (typeof console !== 'undefined' && console && console.log) {
  logger = console.log;
}

/**
 * If dust.isDebug is true, Log dust debug statements, info statements, warning statements, and errors.
 * This default implementation will print to the console if it exists.
 * @param {String} message the message to print
 * @param {String} type the severity of the message(ERROR, WARN, INFO, or DEBUG)
 * @public
 */
dust.log = function(message, type) {
  var type = type || INFO;
  if(dust.isDebug && levels.indexOf(type) >= levels.indexOf(dust.debugLevel)) {
    if(!dust.logQueue) {
      dust.logQueue = [];
    }
    dust.logQueue.push({message: message, type: type});
    logger.call(console || window.console, "[DUST " + type + "]: " + message);
  }
};

/**
 * If debugging is turned on(dust.isDebug=true) log the error message and throw it.
 * Otherwise try to keep rendering.  This is useful to fail hard in dev mode, but keep rendering in production.
 * @param {Error} error the error message to throw
 * @param {Object} chunk the chunk the error was thrown from
 * @public
 */
dust.onError = function(error, chunk) {
  dust.log(error.message || error, ERROR);
  if(dust.isDebug) {
    throw error;
  } else {
    return chunk;
  }
};

dust.helpers = {};

dust.cache = {};

dust.register = function(name, tmpl) {
  if (!name) return;
  dust.cache[name] = tmpl;
};

dust.render = function(name, context, callback) {
  var chunk = new Stub(callback).head;
  try {
    dust.load(name, chunk, Context.wrap(context, name)).end();
  } catch (err) {
    dust.onError(err, chunk);
  }
};

dust.stream = function(name, context) {
  var stream = new Stream();
  dust.nextTick(function() {
    try {
      dust.load(name, stream.head, Context.wrap(context, name)).end();
    } catch (err) {
      dust.onError(err, stream.head);
    }
  });
  return stream;
};

dust.renderSource = function(source, context, callback) {
  return dust.compileFn(source)(context, callback);
};

dust.compileFn = function(source, name) {
  var tmpl = dust.loadSource(dust.compile(source, name));
  return function(context, callback) {
    var master = callback ? new Stub(callback) : new Stream();
    dust.nextTick(function() {
      if(typeof tmpl === 'function') {
        tmpl(master.head, Context.wrap(context, name)).end();
      }
      else {
        dust.onError(new Error('Template [' + name + '] cannot be resolved to a Dust function'));
      }
    });
    return master;
  };
};

dust.load = function(name, chunk, context) {
  var tmpl = dust.cache[name];
  if (tmpl) {
    return tmpl(chunk, context);
  } else {
    if (dust.onLoad) {
      return chunk.map(function(chunk) {
        dust.onLoad(name, function(err, src) {
          if (err) return chunk.setError(err);
          if (!dust.cache[name]) dust.loadSource(dust.compile(src, name));
          dust.cache[name](chunk, context).end();
        });
      });
    }
    return chunk.setError(new Error("Template Not Found: " + name));
  }
};

dust.loadSource = function(source, path) {
  return eval(source);
};

if (Array.isArray) {
  dust.isArray = Array.isArray;
} else {
  dust.isArray = function(arr) {
    return Object.prototype.toString.call(arr) === "[object Array]";
  };
}

dust.nextTick = (function() {
  if (typeof process !== "undefined") {
    return process.nextTick;
  } else {
    return function(callback) {
      setTimeout(callback,0);
    };
  }
} )();

dust.isEmpty = function(value) {
  if (dust.isArray(value) && !value.length) return true;
  if (value === 0) return false;
  return (!value);
};

// apply the filter chain and return the output string
dust.filter = function(string, auto, filters) {
  if (filters) {
    for (var i=0, len=filters.length; i<len; i++) {
      var name = filters[i];
      if (name === "s") {
        auto = null;
        dust.log('Using unescape filter on [' + string + ']', DEBUG);
      }
      else if (typeof dust.filters[name] === 'function') {
        string = dust.filters[name](string);
      }
      else {
        dust.onError(new Error('Invalid filter [' + name + ']'));
      }
    }
  }
  // by default always apply the h filter, unless asked to unescape with |s
  if (auto) {
    string = dust.filters[auto](string);
  }
  return string;
};

dust.filters = {
  h: function(value) { return dust.escapeHtml(value); },
  j: function(value) { return dust.escapeJs(value); },
  u: encodeURI,
  uc: encodeURIComponent,
  js: function(value) {
    if (!JSON) {
      dust.log('JSON is undefined.  JSON stringify has not been used on [' + value + ']', WARN);
      return value;
    } else {
      return JSON.stringify(value);
    }
  },
  jp: function(value) {
    if (!JSON) {dust.log('JSON is undefined.  JSON parse has not been used on [' + value + ']', WARN);
      return value;
    } else {
      return JSON.parse(value);
    }
  }
};

function Context(stack, global, blocks, templateName) {
  this.stack  = stack;
  this.global = global;
  this.blocks = blocks;
  this.templateName = templateName;
}

dust.makeBase = function(global) {
  return new Context(new Stack(), global);
};

Context.wrap = function(context, name) {
  if (context instanceof Context) {
    return context;
  }
  return new Context(new Stack(context), {}, null, name);
};

Context.prototype.get = function(key) {
  var ctx = this.stack, value, globalValue;
  dust.log('Searching for reference [{' + key + '}] in template [' + this.templateName + ']', DEBUG);
  while(ctx) {
    if (ctx.isObject) {
      value = ctx.head[key];
      if (!(value === undefined)) {
        return value;
      }
    }
    ctx = ctx.tail;
  }
  globalValue = this.global ? this.global[key] : undefined;
  if(typeof globalValue === 'undefined') {
    dust.log('Cannot find the value for reference [{' + key + '}] in template [' + this.templateName + ']');
  }
  return globalValue;
};

//supports dot path resolution, function wrapped apply, and searching global paths
Context.prototype.getPath = function(cur, down) {
  var ctx = this.stack, ctxThis,
      len = down.length,
      tail = cur ? undefined : this.stack.tail;

  dust.log('Searching for reference [{' + down.join('.') + '}] in template [' + this.templateName + ']', DEBUG);
  if (cur && len === 0) return ctx.head;
  ctx = ctx.head;
  var i = 0;
  while(ctx && i < len) {
  	ctxThis = ctx;
    ctx = ctx[down[i]];
    i++;
    while (!ctx && !cur){
	// i is the count of number of path elements matched. If > 1 then we have a partial match
	// and do not continue to search for the rest of the path.
	// Note: a falsey value at the end of a matched path also comes here.
	// This returns the value or undefined if we just have a partial match.
    	if (i > 1) return ctx;
    	if (tail){
    	  ctx = tail.head;
    	  tail = tail.tail;
    	  i=0;
    	} else if (!cur) {
    	  //finally search this.global.  we set cur to true to halt after
      	  ctx = this.global;
      	  cur = true;
    	  i=0;
    	}
    }
  }
  if (typeof ctx == 'function'){
  	//wrap to preserve context 'this' see #174
  	return function(){
  	  return ctx.apply(ctxThis,arguments);
  	};
  }
  else {
    return ctx;
  }
};

Context.prototype.push = function(head, idx, len) {
  return new Context(new Stack(head, this.stack, idx, len), this.global, this.blocks, this.templateName);
};

Context.prototype.rebase = function(head) {
  return new Context(new Stack(head), this.global, this.blocks, this.templateName);
};

Context.prototype.current = function() {
  return this.stack.head;
};

Context.prototype.getBlock = function(key, chk, ctx) {
  if (typeof key === "function") {
    var tempChk = new Chunk();
    key = key(tempChk, this).data.join("");
  }

  var blocks = this.blocks;

  if (!blocks) {
    dust.log('No blocks for context[{' + key + '}] in template [' + this.templateName + ']', DEBUG);
    return;
  }
  var len = blocks.length, fn;
  while (len--) {
    fn = blocks[len][key];
    if (fn) return fn;
  }
};

Context.prototype.shiftBlocks = function(locals) {
  var blocks = this.blocks,
      newBlocks;

  if (locals) {
    if (!blocks) {
      newBlocks = [locals];
    } else {
      newBlocks = blocks.concat([locals]);
    }
    return new Context(this.stack, this.global, newBlocks, this.templateName);
  }
  return this;
};

function Stack(head, tail, idx, len) {
  this.tail = tail;
  this.isObject = !dust.isArray(head) && head && typeof head === "object";
  this.head = head;
  this.index = idx;
  this.of = len;
}

function Stub(callback) {
  this.head = new Chunk(this);
  this.callback = callback;
  this.out = '';
}

Stub.prototype.flush = function() {
  var chunk = this.head;

  while (chunk) {
    if (chunk.flushable) {
      this.out += chunk.data.join(""); //ie7 perf
    } else if (chunk.error) {
      this.callback(chunk.error);
      dust.onError(new Error('Chunk error [' + chunk.error + '] thrown. Ceasing to render this template.'));
      this.flush = function() {};
      return;
    } else {
      return;
    }
    chunk = chunk.next;
    this.head = chunk;
  }
  this.callback(null, this.out);
};

function Stream() {
  this.head = new Chunk(this);
}

Stream.prototype.flush = function() {
  var chunk = this.head;

  while(chunk) {
    if (chunk.flushable) {
      this.emit('data', chunk.data.join("")); //ie7 perf
    } else if (chunk.error) {
      this.emit('error', chunk.error);
      dust.onError(new Error('Chunk error [' + chunk.error + '] thrown. Ceasing to render this template.'));
      this.flush = function() {};
      return;
    } else {
      return;
    }
    chunk = chunk.next;
    this.head = chunk;
  }
  this.emit('end');
};

Stream.prototype.emit = function(type, data) {
  if (!this.events) {
    dust.log('No events to emit', INFO);
    return false;
  }
  var handler = this.events[type];
  if (!handler) {
    dust.log('Event type [' + type + '] does not exist', WARN);
    return false;
  }
  if (typeof handler === 'function') {
    handler(data);
  } else if (dust.isArray(handler)) {
    var listeners = handler.slice(0);
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i](data);
    }
  } else {
    dust.onError(new Error('Event Handler [' + handler + '] is not of a type that is handled by emit'));
  }
};

Stream.prototype.on = function(type, callback) {
  if (!this.events) {
    this.events = {};
  }
  if (!this.events[type]) {
    dust.log('Event type [' + type + '] does not exist. Using just the specified callback.', WARN);
    if(callback) {
      this.events[type] = callback;
    } else {
      dust.log('Callback for type [' + type + '] does not exist. Listener not registered.', WARN);
    }
  } else if(typeof this.events[type] === 'function') {
    this.events[type] = [this.events[type], callback];
  } else {
    this.events[type].push(callback);
  }
  return this;
};

Stream.prototype.pipe = function(stream) {
  this.on("data", function(data) {
    try {
      stream.write(data, "utf8");
    } catch (err) {
      dust.onError(err, stream.head);
    }
  }).on("end", function() {
    try {
      return stream.end();
    } catch (err) {
      dust.onError(err, stream.head);
    }
  }).on("error", function(err) {
    stream.error(err);
  });
  return this;
};

function Chunk(root, next, taps) {
  this.root = root;
  this.next = next;
  this.data = []; //ie7 perf
  this.flushable = false;
  this.taps = taps;
}

Chunk.prototype.write = function(data) {
  var taps  = this.taps;

  if (taps) {
    data = taps.go(data);
  }
  this.data.push(data);
  return this;
};

Chunk.prototype.end = function(data) {
  if (data) {
    this.write(data);
  }
  this.flushable = true;
  this.root.flush();
  return this;
};

Chunk.prototype.map = function(callback) {
  var cursor = new Chunk(this.root, this.next, this.taps),
      branch = new Chunk(this.root, cursor, this.taps);

  this.next = branch;
  this.flushable = true;
  callback(branch);
  return cursor;
};

Chunk.prototype.tap = function(tap) {
  var taps = this.taps;

  if (taps) {
    this.taps = taps.push(tap);
  } else {
    this.taps = new Tap(tap);
  }
  return this;
};

Chunk.prototype.untap = function() {
  this.taps = this.taps.tail;
  return this;
};

Chunk.prototype.render = function(body, context) {
  return body(this, context);
};

Chunk.prototype.reference = function(elem, context, auto, filters) {
  if (typeof elem === "function") {
    elem.isFunction = true;
    // Changed the function calling to use apply with the current context to make sure
    // that "this" is wat we expect it to be inside the function
    elem = elem.apply(context.current(), [this, context, null, {auto: auto, filters: filters}]);
    if (elem instanceof Chunk) {
      return elem;
    }
  }
  if (!dust.isEmpty(elem)) {
    return this.write(dust.filter(elem, auto, filters));
  } else {
    return this;
  }
};

Chunk.prototype.section = function(elem, context, bodies, params) {
  // anonymous functions
  if (typeof elem === "function") {
    elem = elem.apply(context.current(), [this, context, bodies, params]);
    // functions that return chunks are assumed to have handled the body and/or have modified the chunk
    // use that return value as the current chunk and go to the next method in the chain
    if (elem instanceof Chunk) {
      return elem;
    }
  }
  var body = bodies.block,
      skip = bodies['else'];

  // a.k.a Inline parameters in the Dust documentations
  if (params) {
    context = context.push(params);
  }

  /*
  Dust's default behavior is to enumerate over the array elem, passing each object in the array to the block.
  When elem resolves to a value or object instead of an array, Dust sets the current context to the value
  and renders the block one time.
  */
  //non empty array is truthy, empty array is falsy
  if (dust.isArray(elem)) {
     if (body) {
      var len = elem.length, chunk = this;
      if (len > 0) {
        // any custom helper can blow up the stack
        // and store a flattened context, guard defensively
        if(context.stack.head) {
          context.stack.head['$len'] = len;
        }
        for (var i=0; i<len; i++) {
          if(context.stack.head) {
           context.stack.head['$idx'] = i;
          }
          chunk = body(chunk, context.push(elem[i], i, len));
        }
        if(context.stack.head) {
         context.stack.head['$idx'] = undefined;
         context.stack.head['$len'] = undefined;
        }
        return chunk;
      }
      else if (skip) {
         return skip(this, context);
      }
     }
   }
   // true is truthy but does not change context
   else if (elem  === true) {
     if (body) {
        return body(this, context);
     }
   }
   // everything that evaluates to true are truthy ( e.g. Non-empty strings and Empty objects are truthy. )
   // zero is truthy
   // for anonymous functions that did not returns a chunk, truthiness is evaluated based on the return value
   //
   else if (elem || elem === 0) {
     if (body) return body(this, context.push(elem));
   // nonexistent, scalar false value, scalar empty string, null,
   // undefined are all falsy
  } else if (skip) {
     return skip(this, context);
  }
  dust.log('Not rendering section (#) block in template [' + context.templateName + '], because above key was not found', DEBUG);
  return this;
};

Chunk.prototype.exists = function(elem, context, bodies) {
  var body = bodies.block,
      skip = bodies['else'];

  if (!dust.isEmpty(elem)) {
    if (body) return body(this, context);
  } else if (skip) {
    return skip(this, context);
  }
  dust.log('Not rendering exists (?) block in template [' + context.templateName + '], because above key was not found', DEBUG);
  return this;
};

Chunk.prototype.notexists = function(elem, context, bodies) {
  var body = bodies.block,
      skip = bodies['else'];

  if (dust.isEmpty(elem)) {
    if (body) return body(this, context);
  } else if (skip) {
    return skip(this, context);
  }
  dust.log('Not rendering not exists (^) block check in template [' + context.templateName + '], because above key was found', DEBUG);
  return this;
};

Chunk.prototype.block = function(elem, context, bodies) {
  var body = bodies.block;

  if (elem) {
    body = elem;
  }

  if (body) {
    return body(this, context);
  }
  return this;
};

Chunk.prototype.partial = function(elem, context, params) {
  var partialContext;
  //put the params context second to match what section does. {.} matches the current context without parameters
  // start with an empty context
  partialContext = dust.makeBase(context.global);
  partialContext.blocks = context.blocks;
  if (context.stack && context.stack.tail){
    // grab the stack(tail) off of the previous context if we have it
    partialContext.stack = context.stack.tail;
  }
  if (params){
    //put params on
    partialContext = partialContext.push(params);
  }
  // templateName can be static (string) or dynamic (function)
  // e.g. {>"static_template"/}
  //      {>"{dynamic_template}"/}
  if (elem) {
    partialContext.templateName = elem;
  }

  //reattach the head
  partialContext = partialContext.push(context.stack.head);

  var partialChunk;
   if (typeof elem === "function") {
     partialChunk = this.capture(elem, partialContext, function(name, chunk) {
       dust.load(name, chunk, partialContext).end();
     });
   }
   else {
     partialChunk = dust.load(elem, this, partialContext);
   }
   return partialChunk;
};

Chunk.prototype.helper = function(name, context, bodies, params) {
  var chunk = this;
  // handle invalid helpers, similar to invalid filters
  try {
    if(dust.helpers[name]) {
      return dust.helpers[name](chunk, context, bodies, params);
    } else {
      return dust.onError(new Error('Invalid helper [' + name + ']'), chunk);
    }
  } catch (err) {
    return dust.onError(err, chunk);
  }
};

Chunk.prototype.capture = function(body, context, callback) {
  return this.map(function(chunk) {
    var stub = new Stub(function(err, out) {
      if (err) {
        chunk.setError(err);
      } else {
        callback(out, chunk);
      }
    });
    body(stub.head, context).end();
  });
};

Chunk.prototype.setError = function(err) {
  this.error = err;
  this.root.flush();
  return this;
};

function Tap(head, tail) {
  this.head = head;
  this.tail = tail;
}

Tap.prototype.push = function(tap) {
  return new Tap(tap, this);
};

Tap.prototype.go = function(value) {
  var tap = this;

  while(tap) {
    value = tap.head(value);
    tap = tap.tail;
  }
  return value;
};

var HCHARS = new RegExp(/[&<>\"\']/),
    AMP    = /&/g,
    LT     = /</g,
    GT     = />/g,
    QUOT   = /\"/g,
    SQUOT  = /\'/g;

dust.escapeHtml = function(s) {
  if (typeof s === "string") {
    if (!HCHARS.test(s)) {
      return s;
    }
    return s.replace(AMP,'&amp;').replace(LT,'&lt;').replace(GT,'&gt;').replace(QUOT,'&quot;').replace(SQUOT, '&#39;');
  }
  return s;
};

var BS = /\\/g,
    FS = /\//g,
    CR = /\r/g,
    LS = /\u2028/g,
    PS = /\u2029/g,
    NL = /\n/g,
    LF = /\f/g,
    SQ = /'/g,
    DQ = /"/g,
    TB = /\t/g;

dust.escapeJs = function(s) {
  if (typeof s === "string") {
    return s
      .replace(BS, '\\\\')
      .replace(FS, '\\/')
      .replace(DQ, '\\"')
      .replace(SQ, "\\'")
      .replace(CR, '\\r')
      .replace(LS, '\\u2028')
      .replace(PS, '\\u2029')
      .replace(NL, '\\n')
      .replace(LF, '\\f')
      .replace(TB, "\\t");
  }
  return s;
};

})(dust);

var dustCompiler = (function(dust) {

dust.compile = function(source, name) {
  try {
    var ast = filterAST(dust.parse(source));
    return compile(ast, name);
  }
  catch(err)
  {
    if(!err.line || !err.column) throw err;
    throw new SyntaxError(err.message + " At line : " + err.line + ", column : " + err.column);
  }
};

function filterAST(ast) {
  var context = {};
  return dust.filterNode(context, ast);
};

dust.filterNode = function(context, node) {
  return dust.optimizers[node[0]](context, node);
};

dust.optimizers = {
  body:      compactBuffers,
  buffer:    noop,
  special:   convertSpecial,
  format:    nullify,        // TODO: convert format
  reference: visit,
  "#":       visit,
  "?":       visit,
  "^":       visit,
  "<":       visit,
  "+":       visit,
  "@":       visit,
  "%":       visit,
  partial:   visit,
  context:   visit,
  params:    visit,
  bodies:    visit,
  param:     visit,
  filters:   noop,
  key:       noop,
  path:      noop,
  literal:   noop,
  comment:   nullify,
  line: nullify,
  col: nullify
};

dust.pragmas = {
  esc: function(compiler, context, bodies, params) {
    var old = compiler.auto;
    if (!context) context = 'h';
    compiler.auto = (context === 's') ? '' : context;
    var out = compileParts(compiler, bodies.block);
    compiler.auto = old;
    return out;
  }
};

function visit(context, node) {
  var out = [node[0]];
  for (var i=1, len=node.length; i<len; i++) {
    var res = dust.filterNode(context, node[i]);
    if (res) out.push(res);
  }
  return out;
};

// Compacts consecutive buffer nodes into a single node
function compactBuffers(context, node) {
  var out = [node[0]], memo;
  for (var i=1, len=node.length; i<len; i++) {
    var res = dust.filterNode(context, node[i]);
    if (res) {
      if (res[0] === 'buffer') {
        if (memo) {
          memo[1] += res[1];
        } else {
          memo = res;
          out.push(res);
        }
      } else {
        memo = null;
        out.push(res);
      }
    }
  }
  return out;
};

var specialChars = {
  "s": " ",
  "n": "\n",
  "r": "\r",
  "lb": "{",
  "rb": "}"
};

function convertSpecial(context, node) { return ['buffer', specialChars[node[1]]] };
function noop(context, node) { return node };
function nullify(){};

function compile(ast, name) {
  var context = {
    name: name,
    bodies: [],
    blocks: {},
    index: 0,
    auto: "h"
  }

  return "(function(){dust.register("
    + (name ? "\"" + name + "\"" : "null") + ","
    + dust.compileNode(context, ast)
    + ");"
    + compileBlocks(context)
    + compileBodies(context)
    + "return body_0;"
    + "})();";
};

function compileBlocks(context) {
  var out = [],
      blocks = context.blocks;

  for (var name in blocks) {
    out.push("'" + name + "':" + blocks[name]);
  }
  if (out.length) {
    context.blocks = "ctx=ctx.shiftBlocks(blocks);";
    return "var blocks={" + out.join(',') + "};";
  }
  return context.blocks = "";
};

function compileBodies(context) {
  var out = [],
      bodies = context.bodies,
      blx = context.blocks;

  for (var i=0, len=bodies.length; i<len; i++) {
    out[i] = "function body_" + i + "(chk,ctx){"
      + blx + "return chk" + bodies[i] + ";}";
  }
  return out.join('');
};

function compileParts(context, body) {
  var parts = '';
  for (var i=1, len=body.length; i<len; i++) {
    parts += dust.compileNode(context, body[i]);
  }
  return parts;
};

dust.compileNode = function(context, node) {
  return dust.nodes[node[0]](context, node);
};

dust.nodes = {
  body: function(context, node) {
    var id = context.index++, name = "body_" + id;
    context.bodies[id] = compileParts(context, node);
    return name;
  },

  buffer: function(context, node) {
    return ".write(" + escape(node[1]) + ")";
  },

  format: function(context, node) {
    return ".write(" + escape(node[1] + node[2]) + ")";
  },

  reference: function(context, node) {
    return ".reference(" + dust.compileNode(context, node[1])
      + ",ctx," + dust.compileNode(context, node[2]) + ")";
  },

  "#": function(context, node) {
    return compileSection(context, node, "section");
  },

  "?": function(context, node) {
    return compileSection(context, node, "exists");
  },

  "^": function(context, node) {
    return compileSection(context, node, "notexists");
  },

  "<": function(context, node) {
    var bodies = node[4];
    for (var i=1, len=bodies.length; i<len; i++) {
      var param = bodies[i],
          type = param[1][1];
      if (type === "block") {
        context.blocks[node[1].text] = dust.compileNode(context, param[2]);
        return '';
      }
    }
    return '';
  },

  "+": function(context, node) {
    if(typeof(node[1].text) === "undefined"  && typeof(node[4]) === "undefined"){
      return ".block(ctx.getBlock("
      + dust.compileNode(context, node[1])
      + ",chk, ctx)," + dust.compileNode(context, node[2]) + ", {},"
      + dust.compileNode(context, node[3])
      + ")";
    }else {
      return ".block(ctx.getBlock("
      + escape(node[1].text)
      + ")," + dust.compileNode(context, node[2]) + ","
      + dust.compileNode(context, node[4]) + ","
      + dust.compileNode(context, node[3])
      + ")";
    }
  },

  "@": function(context, node) {
    return ".helper("
      + escape(node[1].text)
      + "," + dust.compileNode(context, node[2]) + ","
      + dust.compileNode(context, node[4]) + ","
      + dust.compileNode(context, node[3])
      + ")";
  },

  "%": function(context, node) {
    // TODO: Move these hacks into pragma precompiler
    var name = node[1][1];
    if (!dust.pragmas[name]) return '';

    var rawBodies = node[4];
    var bodies = {};
    for (var i=1, len=rawBodies.length; i<len; i++) {
      var b = rawBodies[i];
      bodies[b[1][1]] = b[2];
    }

    var rawParams = node[3];
    var params = {};
    for (var i=1, len=rawParams.length; i<len; i++) {
      var p = rawParams[i];
      params[p[1][1]] = p[2][1];
    }

    var ctx = node[2][1] ? node[2][1].text : null;

    return dust.pragmas[name](context, ctx, bodies, params);
  },

  partial: function(context, node) {
    return ".partial("
      + dust.compileNode(context, node[1])
      + "," + dust.compileNode(context, node[2])
      + "," + dust.compileNode(context, node[3]) + ")";
  },

  context: function(context, node) {
    if (node[1]) {
      return "ctx.rebase(" + dust.compileNode(context, node[1]) + ")";
    }
    return "ctx";
  },

  params: function(context, node) {
    var out = [];
    for (var i=1, len=node.length; i<len; i++) {
      out.push(dust.compileNode(context, node[i]));
    }
    if (out.length) {
      return "{" + out.join(',') + "}";
    }
    return "null";
  },

  bodies: function(context, node) {
    var out = [];
    for (var i=1, len=node.length; i<len; i++) {
      out.push(dust.compileNode(context, node[i]));
    }
    return "{" + out.join(',') + "}";
  },

  param: function(context, node) {
    return dust.compileNode(context, node[1]) + ":" + dust.compileNode(context, node[2]);
  },

  filters: function(context, node) {
    var list = [];
    for (var i=1, len=node.length; i<len; i++) {
      var filter = node[i];
      list.push("\"" + filter + "\"");
    }
    return "\"" + context.auto + "\""
      + (list.length ? ",[" + list.join(',') + "]" : '');
  },

  key: function(context, node) {
    return "ctx.get(\"" + node[1] + "\")";
  },

  path: function(context, node) {
    var current = node[1],
        keys = node[2],
        list = [];

    for (var i=0,len=keys.length; i<len; i++) {
      if (dust.isArray(keys[i]))
        list.push(dust.compileNode(context, keys[i]));
      else
        list.push("\"" + keys[i] + "\"");
    }
    return "ctx.getPath(" + current + ",[" + list.join(',') + "])";
  },

  literal: function(context, node) {
    return escape(node[1]);
  }
};

function compileSection(context, node, cmd) {
  return "." + cmd + "("
    + dust.compileNode(context, node[1])
    + "," + dust.compileNode(context, node[2]) + ","
    + dust.compileNode(context, node[4]) + ","
    + dust.compileNode(context, node[3])
    + ")";
};

var escape = (typeof JSON === "undefined")
  ? function(str) { return "\"" + dust.escapeJs(str) + "\"" }
  : JSON.stringify;

  return dust;

});

dustCompiler(getGlobal());

(function(dust){

var parser = (function(){
  /*
   * Generated by PEG.js 0.7.0.
   *
   * http://pegjs.majda.cz/
   */

  function quote(s) {
    /*
     * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
     * string literal except for the closing quote character, backslash,
     * carriage return, line separator, paragraph separator, and line feed.
     * Any character may appear in the form of an escape sequence.
     *
     * For portability, we also escape escape all control and non-ASCII
     * characters. Note that "\0" and "\v" escape sequences are not used
     * because JSHint does not like the first and IE the second.
     */
     return '"' + s
      .replace(/\\/g, '\\\\')  // backslash
      .replace(/"/g, '\\"')    // closing quote character
      .replace(/\x08/g, '\\b') // backspace
      .replace(/\t/g, '\\t')   // horizontal tab
      .replace(/\n/g, '\\n')   // line feed
      .replace(/\f/g, '\\f')   // form feed
      .replace(/\r/g, '\\r')   // carriage return
      .replace(/[\x00-\x07\x0B\x0E-\x1F\x80-\uFFFF]/g, escape)
      + '"';
  }

  var result = {
    /*
     * Parses the input with a generated parser. If the parsing is successfull,
     * returns a value explicitly or implicitly specified by the grammar from
     * which the parser was generated (see |PEG.buildParser|). If the parsing is
     * unsuccessful, throws |PEG.parser.SyntaxError| describing the error.
     */
    parse: function(input, startRule) {
      var parseFunctions = {
        "body": parse_body,
        "part": parse_part,
        "section": parse_section,
        "sec_tag_start": parse_sec_tag_start,
        "end_tag": parse_end_tag,
        "context": parse_context,
        "params": parse_params,
        "bodies": parse_bodies,
        "reference": parse_reference,
        "partial": parse_partial,
        "filters": parse_filters,
        "special": parse_special,
        "identifier": parse_identifier,
        "number": parse_number,
        "float": parse_float,
        "integer": parse_integer,
        "path": parse_path,
        "key": parse_key,
        "array": parse_array,
        "array_part": parse_array_part,
        "inline": parse_inline,
        "inline_part": parse_inline_part,
        "buffer": parse_buffer,
        "literal": parse_literal,
        "esc": parse_esc,
        "comment": parse_comment,
        "tag": parse_tag,
        "ld": parse_ld,
        "rd": parse_rd,
        "lb": parse_lb,
        "rb": parse_rb,
        "eol": parse_eol,
        "ws": parse_ws
      };

      if (startRule !== undefined) {
        if (parseFunctions[startRule] === undefined) {
          throw new Error("Invalid rule name: " + quote(startRule) + ".");
        }
      } else {
        startRule = "body";
      }

      var pos = { offset: 0, line: 1, column: 1, seenCR: false };
      var reportFailures = 0;
      var rightmostFailuresPos = { offset: 0, line: 1, column: 1, seenCR: false };
      var rightmostFailuresExpected = [];

      function padLeft(input, padding, length) {
        var result = input;

        var padLength = length - input.length;
        for (var i = 0; i < padLength; i++) {
          result = padding + result;
        }

        return result;
      }

      function escape(ch) {
        var charCode = ch.charCodeAt(0);
        var escapeChar;
        var length;

        if (charCode <= 0xFF) {
          escapeChar = 'x';
          length = 2;
        } else {
          escapeChar = 'u';
          length = 4;
        }

        return '\\' + escapeChar + padLeft(charCode.toString(16).toUpperCase(), '0', length);
      }

      function clone(object) {
        var result = {};
        for (var key in object) {
          result[key] = object[key];
        }
        return result;
      }

      function advance(pos, n) {
        var endOffset = pos.offset + n;

        for (var offset = pos.offset; offset < endOffset; offset++) {
          var ch = input.charAt(offset);
          if (ch === "\n") {
            if (!pos.seenCR) { pos.line++; }
            pos.column = 1;
            pos.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            pos.line++;
            pos.column = 1;
            pos.seenCR = true;
          } else {
            pos.column++;
            pos.seenCR = false;
          }
        }

        pos.offset += n;
      }

      function matchFailed(failure) {
        if (pos.offset < rightmostFailuresPos.offset) {
          return;
        }

        if (pos.offset > rightmostFailuresPos.offset) {
          rightmostFailuresPos = clone(pos);
          rightmostFailuresExpected = [];
        }

        rightmostFailuresExpected.push(failure);
      }

      function parse_body() {
        var result0, result1;
        var pos0;

        pos0 = clone(pos);
        result0 = [];
        result1 = parse_part();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_part();
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, p) { return ["body"].concat(p).concat([['line', line], ['col', column]]) })(pos0.offset, pos0.line, pos0.column, result0);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }

      function parse_part() {
        var result0;

        result0 = parse_comment();
        if (result0 === null) {
          result0 = parse_section();
          if (result0 === null) {
            result0 = parse_partial();
            if (result0 === null) {
              result0 = parse_special();
              if (result0 === null) {
                result0 = parse_reference();
                if (result0 === null) {
                  result0 = parse_buffer();
                }
              }
            }
          }
        }
        return result0;
      }

      function parse_section() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1;

        reportFailures++;
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_sec_tag_start();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_ws();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_ws();
          }
          if (result1 !== null) {
            result2 = parse_rd();
            if (result2 !== null) {
              result3 = parse_body();
              if (result3 !== null) {
                result4 = parse_bodies();
                if (result4 !== null) {
                  result5 = parse_end_tag();
                  result5 = result5 !== null ? result5 : "";
                  if (result5 !== null) {
                    result6 = (function(offset, line, column, t, b, e, n) {if( (!n) || (t[1].text !== n.text) ) { throw new Error("Expected end tag for "+t[1].text+" but it was not found. At line : "+line+", column : " + column)} return true;})(pos.offset, pos.line, pos.column, result0, result3, result4, result5) ? "" : null;
                    if (result6 !== null) {
                      result0 = [result0, result1, result2, result3, result4, result5, result6];
                    } else {
                      result0 = null;
                      pos = clone(pos1);
                    }
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, t, b, e, n) { e.push(["param", ["literal", "block"], b]); t.push(e); return t.concat([['line', line], ['col', column]]) })(pos0.offset, pos0.line, pos0.column, result0[0], result0[3], result0[4], result0[5]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          result0 = parse_sec_tag_start();
          if (result0 !== null) {
            result1 = [];
            result2 = parse_ws();
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_ws();
            }
            if (result1 !== null) {
              if (input.charCodeAt(pos.offset) === 47) {
                result2 = "/";
                advance(pos, 1);
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"/\"");
                }
              }
              if (result2 !== null) {
                result3 = parse_rd();
                if (result3 !== null) {
                  result0 = [result0, result1, result2, result3];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, t) { t.push(["bodies"]); return t.concat([['line', line], ['col', column]]) })(pos0.offset, pos0.line, pos0.column, result0[0]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("section");
        }
        return result0;
      }

      function parse_sec_tag_start() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;

        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_ld();
        if (result0 !== null) {
          if (/^[#?^<+@%]/.test(input.charAt(pos.offset))) {
            result1 = input.charAt(pos.offset);
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("[#?^<+@%]");
            }
          }
          if (result1 !== null) {
            result2 = [];
            result3 = parse_ws();
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_ws();
            }
            if (result2 !== null) {
              result3 = parse_identifier();
              if (result3 !== null) {
                result4 = parse_context();
                if (result4 !== null) {
                  result5 = parse_params();
                  if (result5 !== null) {
                    result0 = [result0, result1, result2, result3, result4, result5];
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, t, n, c, p) { return [t, n, c, p] })(pos0.offset, pos0.line, pos0.column, result0[1], result0[3], result0[4], result0[5]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }

      function parse_end_tag() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;

        reportFailures++;
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_ld();
        if (result0 !== null) {
          if (input.charCodeAt(pos.offset) === 47) {
            result1 = "/";
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result1 !== null) {
            result2 = [];
            result3 = parse_ws();
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_ws();
            }
            if (result2 !== null) {
              result3 = parse_identifier();
              if (result3 !== null) {
                result4 = [];
                result5 = parse_ws();
                while (result5 !== null) {
                  result4.push(result5);
                  result5 = parse_ws();
                }
                if (result4 !== null) {
                  result5 = parse_rd();
                  if (result5 !== null) {
                    result0 = [result0, result1, result2, result3, result4, result5];
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, n) { return n })(pos0.offset, pos0.line, pos0.column, result0[3]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("end tag");
        }
        return result0;
      }

      function parse_context() {
        var result0, result1;
        var pos0, pos1, pos2;

        pos0 = clone(pos);
        pos1 = clone(pos);
        pos2 = clone(pos);
        if (input.charCodeAt(pos.offset) === 58) {
          result0 = ":";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\":\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_identifier();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos2);
          }
        } else {
          result0 = null;
          pos = clone(pos2);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, n) {return n})(pos1.offset, pos1.line, pos1.column, result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos1);
        }
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result0 = (function(offset, line, column, n) { return n ? ["context", n] : ["context"] })(pos0.offset, pos0.line, pos0.column, result0);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }

      function parse_params() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1, pos2;

        reportFailures++;
        pos0 = clone(pos);
        result0 = [];
        pos1 = clone(pos);
        pos2 = clone(pos);
        result2 = parse_ws();
        if (result2 !== null) {
          result1 = [];
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_ws();
          }
        } else {
          result1 = null;
        }
        if (result1 !== null) {
          result2 = parse_key();
          if (result2 !== null) {
            if (input.charCodeAt(pos.offset) === 61) {
              result3 = "=";
              advance(pos, 1);
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("\"=\"");
              }
            }
            if (result3 !== null) {
              result4 = parse_number();
              if (result4 === null) {
                result4 = parse_identifier();
                if (result4 === null) {
                  result4 = parse_inline();
                }
              }
              if (result4 !== null) {
                result1 = [result1, result2, result3, result4];
              } else {
                result1 = null;
                pos = clone(pos2);
              }
            } else {
              result1 = null;
              pos = clone(pos2);
            }
          } else {
            result1 = null;
            pos = clone(pos2);
          }
        } else {
          result1 = null;
          pos = clone(pos2);
        }
        if (result1 !== null) {
          result1 = (function(offset, line, column, k, v) {return ["param", ["literal", k], v]})(pos1.offset, pos1.line, pos1.column, result1[1], result1[3]);
        }
        if (result1 === null) {
          pos = clone(pos1);
        }
        while (result1 !== null) {
          result0.push(result1);
          pos1 = clone(pos);
          pos2 = clone(pos);
          result2 = parse_ws();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_ws();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result2 = parse_key();
            if (result2 !== null) {
              if (input.charCodeAt(pos.offset) === 61) {
                result3 = "=";
                advance(pos, 1);
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"=\"");
                }
              }
              if (result3 !== null) {
                result4 = parse_number();
                if (result4 === null) {
                  result4 = parse_identifier();
                  if (result4 === null) {
                    result4 = parse_inline();
                  }
                }
                if (result4 !== null) {
                  result1 = [result1, result2, result3, result4];
                } else {
                  result1 = null;
                  pos = clone(pos2);
                }
              } else {
                result1 = null;
                pos = clone(pos2);
              }
            } else {
              result1 = null;
              pos = clone(pos2);
            }
          } else {
            result1 = null;
            pos = clone(pos2);
          }
          if (result1 !== null) {
            result1 = (function(offset, line, column, k, v) {return ["param", ["literal", k], v]})(pos1.offset, pos1.line, pos1.column, result1[1], result1[3]);
          }
          if (result1 === null) {
            pos = clone(pos1);
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, p) { return ["params"].concat(p) })(pos0.offset, pos0.line, pos0.column, result0);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("params");
        }
        return result0;
      }

      function parse_bodies() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1, pos2;

        reportFailures++;
        pos0 = clone(pos);
        result0 = [];
        pos1 = clone(pos);
        pos2 = clone(pos);
        result1 = parse_ld();
        if (result1 !== null) {
          if (input.charCodeAt(pos.offset) === 58) {
            result2 = ":";
            advance(pos, 1);
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result2 !== null) {
            result3 = parse_key();
            if (result3 !== null) {
              result4 = parse_rd();
              if (result4 !== null) {
                result5 = parse_body();
                if (result5 !== null) {
                  result1 = [result1, result2, result3, result4, result5];
                } else {
                  result1 = null;
                  pos = clone(pos2);
                }
              } else {
                result1 = null;
                pos = clone(pos2);
              }
            } else {
              result1 = null;
              pos = clone(pos2);
            }
          } else {
            result1 = null;
            pos = clone(pos2);
          }
        } else {
          result1 = null;
          pos = clone(pos2);
        }
        if (result1 !== null) {
          result1 = (function(offset, line, column, k, v) {return ["param", ["literal", k], v]})(pos1.offset, pos1.line, pos1.column, result1[2], result1[4]);
        }
        if (result1 === null) {
          pos = clone(pos1);
        }
        while (result1 !== null) {
          result0.push(result1);
          pos1 = clone(pos);
          pos2 = clone(pos);
          result1 = parse_ld();
          if (result1 !== null) {
            if (input.charCodeAt(pos.offset) === 58) {
              result2 = ":";
              advance(pos, 1);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\":\"");
              }
            }
            if (result2 !== null) {
              result3 = parse_key();
              if (result3 !== null) {
                result4 = parse_rd();
                if (result4 !== null) {
                  result5 = parse_body();
                  if (result5 !== null) {
                    result1 = [result1, result2, result3, result4, result5];
                  } else {
                    result1 = null;
                    pos = clone(pos2);
                  }
                } else {
                  result1 = null;
                  pos = clone(pos2);
                }
              } else {
                result1 = null;
                pos = clone(pos2);
              }
            } else {
              result1 = null;
              pos = clone(pos2);
            }
          } else {
            result1 = null;
            pos = clone(pos2);
          }
          if (result1 !== null) {
            result1 = (function(offset, line, column, k, v) {return ["param", ["literal", k], v]})(pos1.offset, pos1.line, pos1.column, result1[2], result1[4]);
          }
          if (result1 === null) {
            pos = clone(pos1);
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, p) { return ["bodies"].concat(p) })(pos0.offset, pos0.line, pos0.column, result0);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("bodies");
        }
        return result0;
      }

      function parse_reference() {
        var result0, result1, result2, result3;
        var pos0, pos1;

        reportFailures++;
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_ld();
        if (result0 !== null) {
          result1 = parse_identifier();
          if (result1 !== null) {
            result2 = parse_filters();
            if (result2 !== null) {
              result3 = parse_rd();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, n, f) { return ["reference", n, f].concat([['line', line], ['col', column]]) })(pos0.offset, pos0.line, pos0.column, result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("reference");
        }
        return result0;
      }

      function parse_partial() {
        var result0, result1, result2, result3, result4, result5, result6, result7, result8;
        var pos0, pos1, pos2;

        reportFailures++;
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_ld();
        if (result0 !== null) {
          if (input.charCodeAt(pos.offset) === 62) {
            result1 = ">";
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\">\"");
            }
          }
          if (result1 === null) {
            if (input.charCodeAt(pos.offset) === 43) {
              result1 = "+";
              advance(pos, 1);
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"+\"");
              }
            }
          }
          if (result1 !== null) {
            result2 = [];
            result3 = parse_ws();
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_ws();
            }
            if (result2 !== null) {
              pos2 = clone(pos);
              result3 = parse_key();
              if (result3 !== null) {
                result3 = (function(offset, line, column, k) {return ["literal", k]})(pos2.offset, pos2.line, pos2.column, result3);
              }
              if (result3 === null) {
                pos = clone(pos2);
              }
              if (result3 === null) {
                result3 = parse_inline();
              }
              if (result3 !== null) {
                result4 = parse_context();
                if (result4 !== null) {
                  result5 = parse_params();
                  if (result5 !== null) {
                    result6 = [];
                    result7 = parse_ws();
                    while (result7 !== null) {
                      result6.push(result7);
                      result7 = parse_ws();
                    }
                    if (result6 !== null) {
                      if (input.charCodeAt(pos.offset) === 47) {
                        result7 = "/";
                        advance(pos, 1);
                      } else {
                        result7 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"/\"");
                        }
                      }
                      if (result7 !== null) {
                        result8 = parse_rd();
                        if (result8 !== null) {
                          result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8];
                        } else {
                          result0 = null;
                          pos = clone(pos1);
                        }
                      } else {
                        result0 = null;
                        pos = clone(pos1);
                      }
                    } else {
                      result0 = null;
                      pos = clone(pos1);
                    }
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, s, n, c, p) { var key = (s ===">")? "partial" : s; return [key, n, c, p].concat([['line', line], ['col', column]]) })(pos0.offset, pos0.line, pos0.column, result0[1], result0[3], result0[4], result0[5]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("partial");
        }
        return result0;
      }

      function parse_filters() {
        var result0, result1, result2;
        var pos0, pos1, pos2;

        reportFailures++;
        pos0 = clone(pos);
        result0 = [];
        pos1 = clone(pos);
        pos2 = clone(pos);
        if (input.charCodeAt(pos.offset) === 124) {
          result1 = "|";
          advance(pos, 1);
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("\"|\"");
          }
        }
        if (result1 !== null) {
          result2 = parse_key();
          if (result2 !== null) {
            result1 = [result1, result2];
          } else {
            result1 = null;
            pos = clone(pos2);
          }
        } else {
          result1 = null;
          pos = clone(pos2);
        }
        if (result1 !== null) {
          result1 = (function(offset, line, column, n) {return n})(pos1.offset, pos1.line, pos1.column, result1[1]);
        }
        if (result1 === null) {
          pos = clone(pos1);
        }
        while (result1 !== null) {
          result0.push(result1);
          pos1 = clone(pos);
          pos2 = clone(pos);
          if (input.charCodeAt(pos.offset) === 124) {
            result1 = "|";
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"|\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_key();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = clone(pos2);
            }
          } else {
            result1 = null;
            pos = clone(pos2);
          }
          if (result1 !== null) {
            result1 = (function(offset, line, column, n) {return n})(pos1.offset, pos1.line, pos1.column, result1[1]);
          }
          if (result1 === null) {
            pos = clone(pos1);
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, f) { return ["filters"].concat(f) })(pos0.offset, pos0.line, pos0.column, result0);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("filters");
        }
        return result0;
      }

      function parse_special() {
        var result0, result1, result2, result3;
        var pos0, pos1;

        reportFailures++;
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_ld();
        if (result0 !== null) {
          if (input.charCodeAt(pos.offset) === 126) {
            result1 = "~";
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"~\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_key();
            if (result2 !== null) {
              result3 = parse_rd();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, k) { return ["special", k].concat([['line', line], ['col', column]]) })(pos0.offset, pos0.line, pos0.column, result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("special");
        }
        return result0;
      }

      function parse_identifier() {
        var result0;
        var pos0;

        reportFailures++;
        pos0 = clone(pos);
        result0 = parse_path();
        if (result0 !== null) {
          result0 = (function(offset, line, column, p) { var arr = ["path"].concat(p); arr.text = p[1].join('.'); return arr; })(pos0.offset, pos0.line, pos0.column, result0);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          result0 = parse_key();
          if (result0 !== null) {
            result0 = (function(offset, line, column, k) { var arr = ["key", k]; arr.text = k; return arr; })(pos0.offset, pos0.line, pos0.column, result0);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("identifier");
        }
        return result0;
      }

      function parse_number() {
        var result0;
        var pos0;

        reportFailures++;
        pos0 = clone(pos);
        result0 = parse_float();
        if (result0 === null) {
          result0 = parse_integer();
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, n) { return ['literal', n]; })(pos0.offset, pos0.line, pos0.column, result0);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("number");
        }
        return result0;
      }

      function parse_float() {
        var result0, result1, result2, result3;
        var pos0, pos1;

        reportFailures++;
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_integer();
        if (result0 !== null) {
          if (input.charCodeAt(pos.offset) === 46) {
            result1 = ".";
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\".\"");
            }
          }
          if (result1 !== null) {
            result3 = parse_integer();
            if (result3 !== null) {
              result2 = [];
              while (result3 !== null) {
                result2.push(result3);
                result3 = parse_integer();
              }
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, l, r) { return parseFloat(l + "." + r.join('')); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("float");
        }
        return result0;
      }

      function parse_integer() {
        var result0, result1;
        var pos0;

        reportFailures++;
        pos0 = clone(pos);
        if (/^[0-9]/.test(input.charAt(pos.offset))) {
          result1 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("[0-9]");
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            if (/^[0-9]/.test(input.charAt(pos.offset))) {
              result1 = input.charAt(pos.offset);
              advance(pos, 1);
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[0-9]");
              }
            }
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, digits) { return parseInt(digits.join(""), 10); })(pos0.offset, pos0.line, pos0.column, result0);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("integer");
        }
        return result0;
      }

      function parse_path() {
        var result0, result1, result2;
        var pos0, pos1;

        reportFailures++;
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_key();
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result2 = parse_array_part();
          if (result2 === null) {
            result2 = parse_array();
          }
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_array_part();
              if (result2 === null) {
                result2 = parse_array();
              }
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, k, d) {
            d = d[0];
            if (k && d) {
              d.unshift(k);
              return [false, d].concat([['line', line], ['col', column]]);
            }
            return [true, d].concat([['line', line], ['col', column]]);
          })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          if (input.charCodeAt(pos.offset) === 46) {
            result0 = ".";
            advance(pos, 1);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\".\"");
            }
          }
          if (result0 !== null) {
            result1 = [];
            result2 = parse_array_part();
            if (result2 === null) {
              result2 = parse_array();
            }
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_array_part();
              if (result2 === null) {
                result2 = parse_array();
              }
            }
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, d) {
              if (d.length > 0) {
                return [true, d[0]].concat([['line', line], ['col', column]]);
              }
              return [true, []].concat([['line', line], ['col', column]]);
            })(pos0.offset, pos0.line, pos0.column, result0[1]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("path");
        }
        return result0;
      }

      function parse_key() {
        var result0, result1, result2;
        var pos0, pos1;

        reportFailures++;
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (/^[a-zA-Z_$]/.test(input.charAt(pos.offset))) {
          result0 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[a-zA-Z_$]");
          }
        }
        if (result0 !== null) {
          result1 = [];
          if (/^[0-9a-zA-Z_$\-]/.test(input.charAt(pos.offset))) {
            result2 = input.charAt(pos.offset);
            advance(pos, 1);
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("[0-9a-zA-Z_$\\-]");
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            if (/^[0-9a-zA-Z_$\-]/.test(input.charAt(pos.offset))) {
              result2 = input.charAt(pos.offset);
              advance(pos, 1);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("[0-9a-zA-Z_$\\-]");
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, h, t) { return h + t.join('') })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("key");
        }
        return result0;
      }

      function parse_array() {
        var result0, result1, result2;
        var pos0, pos1, pos2, pos3, pos4;

        reportFailures++;
        pos0 = clone(pos);
        pos1 = clone(pos);
        pos2 = clone(pos);
        pos3 = clone(pos);
        result0 = parse_lb();
        if (result0 !== null) {
          pos4 = clone(pos);
          if (/^[0-9]/.test(input.charAt(pos.offset))) {
            result2 = input.charAt(pos.offset);
            advance(pos, 1);
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("[0-9]");
            }
          }
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              if (/^[0-9]/.test(input.charAt(pos.offset))) {
                result2 = input.charAt(pos.offset);
                advance(pos, 1);
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("[0-9]");
                }
              }
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result1 = (function(offset, line, column, n) {return n.join('')})(pos4.offset, pos4.line, pos4.column, result1);
          }
          if (result1 === null) {
            pos = clone(pos4);
          }
          if (result1 === null) {
            result1 = parse_identifier();
          }
          if (result1 !== null) {
            result2 = parse_rb();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos3);
            }
          } else {
            result0 = null;
            pos = clone(pos3);
          }
        } else {
          result0 = null;
          pos = clone(pos3);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, a) {return a; })(pos2.offset, pos2.line, pos2.column, result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos2);
        }
        if (result0 !== null) {
          result1 = parse_array_part();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, i, nk) { if(nk) { nk.unshift(i); } else {nk = [i] } return nk; })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("array");
        }
        return result0;
      }

      function parse_array_part() {
        var result0, result1, result2;
        var pos0, pos1, pos2, pos3;

        reportFailures++;
        pos0 = clone(pos);
        pos1 = clone(pos);
        pos2 = clone(pos);
        pos3 = clone(pos);
        if (input.charCodeAt(pos.offset) === 46) {
          result1 = ".";
          advance(pos, 1);
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("\".\"");
          }
        }
        if (result1 !== null) {
          result2 = parse_key();
          if (result2 !== null) {
            result1 = [result1, result2];
          } else {
            result1 = null;
            pos = clone(pos3);
          }
        } else {
          result1 = null;
          pos = clone(pos3);
        }
        if (result1 !== null) {
          result1 = (function(offset, line, column, k) {return k})(pos2.offset, pos2.line, pos2.column, result1[1]);
        }
        if (result1 === null) {
          pos = clone(pos2);
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            pos2 = clone(pos);
            pos3 = clone(pos);
            if (input.charCodeAt(pos.offset) === 46) {
              result1 = ".";
              advance(pos, 1);
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result1 !== null) {
              result2 = parse_key();
              if (result2 !== null) {
                result1 = [result1, result2];
              } else {
                result1 = null;
                pos = clone(pos3);
              }
            } else {
              result1 = null;
              pos = clone(pos3);
            }
            if (result1 !== null) {
              result1 = (function(offset, line, column, k) {return k})(pos2.offset, pos2.line, pos2.column, result1[1]);
            }
            if (result1 === null) {
              pos = clone(pos2);
            }
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result1 = parse_array();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, d, a) { if (a) { return d.concat(a); } else { return d; } })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("array_part");
        }
        return result0;
      }

      function parse_inline() {
        var result0, result1, result2;
        var pos0, pos1;

        reportFailures++;
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (input.charCodeAt(pos.offset) === 34) {
          result0 = "\"";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\\"\"");
          }
        }
        if (result0 !== null) {
          if (input.charCodeAt(pos.offset) === 34) {
            result1 = "\"";
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"\\\"\"");
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column) { return ["literal", ""].concat([['line', line], ['col', column]]) })(pos0.offset, pos0.line, pos0.column);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          if (input.charCodeAt(pos.offset) === 34) {
            result0 = "\"";
            advance(pos, 1);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"\\\"\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_literal();
            if (result1 !== null) {
              if (input.charCodeAt(pos.offset) === 34) {
                result2 = "\"";
                advance(pos, 1);
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"\\\"\"");
                }
              }
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, l) { return ["literal", l].concat([['line', line], ['col', column]]) })(pos0.offset, pos0.line, pos0.column, result0[1]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            pos0 = clone(pos);
            pos1 = clone(pos);
            if (input.charCodeAt(pos.offset) === 34) {
              result0 = "\"";
              advance(pos, 1);
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"\\\"\"");
              }
            }
            if (result0 !== null) {
              result2 = parse_inline_part();
              if (result2 !== null) {
                result1 = [];
                while (result2 !== null) {
                  result1.push(result2);
                  result2 = parse_inline_part();
                }
              } else {
                result1 = null;
              }
              if (result1 !== null) {
                if (input.charCodeAt(pos.offset) === 34) {
                  result2 = "\"";
                  advance(pos, 1);
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"\\\"\"");
                  }
                }
                if (result2 !== null) {
                  result0 = [result0, result1, result2];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
            if (result0 !== null) {
              result0 = (function(offset, line, column, p) { return ["body"].concat(p).concat([['line', line], ['col', column]]) })(pos0.offset, pos0.line, pos0.column, result0[1]);
            }
            if (result0 === null) {
              pos = clone(pos0);
            }
          }
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("inline");
        }
        return result0;
      }

      function parse_inline_part() {
        var result0;
        var pos0;

        result0 = parse_special();
        if (result0 === null) {
          result0 = parse_reference();
          if (result0 === null) {
            pos0 = clone(pos);
            result0 = parse_literal();
            if (result0 !== null) {
              result0 = (function(offset, line, column, l) { return ["buffer", l] })(pos0.offset, pos0.line, pos0.column, result0);
            }
            if (result0 === null) {
              pos = clone(pos0);
            }
          }
        }
        return result0;
      }

      function parse_buffer() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1, pos2, pos3;

        reportFailures++;
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_eol();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_ws();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_ws();
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, e, w) { return ["format", e, w.join('')].concat([['line', line], ['col', column]]) })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          pos2 = clone(pos);
          pos3 = clone(pos);
          reportFailures++;
          result1 = parse_tag();
          reportFailures--;
          if (result1 === null) {
            result1 = "";
          } else {
            result1 = null;
            pos = clone(pos3);
          }
          if (result1 !== null) {
            pos3 = clone(pos);
            reportFailures++;
            result2 = parse_comment();
            reportFailures--;
            if (result2 === null) {
              result2 = "";
            } else {
              result2 = null;
              pos = clone(pos3);
            }
            if (result2 !== null) {
              pos3 = clone(pos);
              reportFailures++;
              result3 = parse_eol();
              reportFailures--;
              if (result3 === null) {
                result3 = "";
              } else {
                result3 = null;
                pos = clone(pos3);
              }
              if (result3 !== null) {
                if (input.length > pos.offset) {
                  result4 = input.charAt(pos.offset);
                  advance(pos, 1);
                } else {
                  result4 = null;
                  if (reportFailures === 0) {
                    matchFailed("any character");
                  }
                }
                if (result4 !== null) {
                  result1 = [result1, result2, result3, result4];
                } else {
                  result1 = null;
                  pos = clone(pos2);
                }
              } else {
                result1 = null;
                pos = clone(pos2);
              }
            } else {
              result1 = null;
              pos = clone(pos2);
            }
          } else {
            result1 = null;
            pos = clone(pos2);
          }
          if (result1 !== null) {
            result1 = (function(offset, line, column, c) {return c})(pos1.offset, pos1.line, pos1.column, result1[3]);
          }
          if (result1 === null) {
            pos = clone(pos1);
          }
          if (result1 !== null) {
            result0 = [];
            while (result1 !== null) {
              result0.push(result1);
              pos1 = clone(pos);
              pos2 = clone(pos);
              pos3 = clone(pos);
              reportFailures++;
              result1 = parse_tag();
              reportFailures--;
              if (result1 === null) {
                result1 = "";
              } else {
                result1 = null;
                pos = clone(pos3);
              }
              if (result1 !== null) {
                pos3 = clone(pos);
                reportFailures++;
                result2 = parse_comment();
                reportFailures--;
                if (result2 === null) {
                  result2 = "";
                } else {
                  result2 = null;
                  pos = clone(pos3);
                }
                if (result2 !== null) {
                  pos3 = clone(pos);
                  reportFailures++;
                  result3 = parse_eol();
                  reportFailures--;
                  if (result3 === null) {
                    result3 = "";
                  } else {
                    result3 = null;
                    pos = clone(pos3);
                  }
                  if (result3 !== null) {
                    if (input.length > pos.offset) {
                      result4 = input.charAt(pos.offset);
                      advance(pos, 1);
                    } else {
                      result4 = null;
                      if (reportFailures === 0) {
                        matchFailed("any character");
                      }
                    }
                    if (result4 !== null) {
                      result1 = [result1, result2, result3, result4];
                    } else {
                      result1 = null;
                      pos = clone(pos2);
                    }
                  } else {
                    result1 = null;
                    pos = clone(pos2);
                  }
                } else {
                  result1 = null;
                  pos = clone(pos2);
                }
              } else {
                result1 = null;
                pos = clone(pos2);
              }
              if (result1 !== null) {
                result1 = (function(offset, line, column, c) {return c})(pos1.offset, pos1.line, pos1.column, result1[3]);
              }
              if (result1 === null) {
                pos = clone(pos1);
              }
            }
          } else {
            result0 = null;
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, b) { return ["buffer", b.join('')].concat([['line', line], ['col', column]]) })(pos0.offset, pos0.line, pos0.column, result0);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("buffer");
        }
        return result0;
      }

      function parse_literal() {
        var result0, result1, result2;
        var pos0, pos1, pos2, pos3;

        reportFailures++;
        pos0 = clone(pos);
        pos1 = clone(pos);
        pos2 = clone(pos);
        pos3 = clone(pos);
        reportFailures++;
        result1 = parse_tag();
        reportFailures--;
        if (result1 === null) {
          result1 = "";
        } else {
          result1 = null;
          pos = clone(pos3);
        }
        if (result1 !== null) {
          result2 = parse_esc();
          if (result2 === null) {
            if (/^[^"]/.test(input.charAt(pos.offset))) {
              result2 = input.charAt(pos.offset);
              advance(pos, 1);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("[^\"]");
              }
            }
          }
          if (result2 !== null) {
            result1 = [result1, result2];
          } else {
            result1 = null;
            pos = clone(pos2);
          }
        } else {
          result1 = null;
          pos = clone(pos2);
        }
        if (result1 !== null) {
          result1 = (function(offset, line, column, c) {return c})(pos1.offset, pos1.line, pos1.column, result1[1]);
        }
        if (result1 === null) {
          pos = clone(pos1);
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            pos1 = clone(pos);
            pos2 = clone(pos);
            pos3 = clone(pos);
            reportFailures++;
            result1 = parse_tag();
            reportFailures--;
            if (result1 === null) {
              result1 = "";
            } else {
              result1 = null;
              pos = clone(pos3);
            }
            if (result1 !== null) {
              result2 = parse_esc();
              if (result2 === null) {
                if (/^[^"]/.test(input.charAt(pos.offset))) {
                  result2 = input.charAt(pos.offset);
                  advance(pos, 1);
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("[^\"]");
                  }
                }
              }
              if (result2 !== null) {
                result1 = [result1, result2];
              } else {
                result1 = null;
                pos = clone(pos2);
              }
            } else {
              result1 = null;
              pos = clone(pos2);
            }
            if (result1 !== null) {
              result1 = (function(offset, line, column, c) {return c})(pos1.offset, pos1.line, pos1.column, result1[1]);
            }
            if (result1 === null) {
              pos = clone(pos1);
            }
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, b) { return b.join('') })(pos0.offset, pos0.line, pos0.column, result0);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("literal");
        }
        return result0;
      }

      function parse_esc() {
        var result0;
        var pos0;

        pos0 = clone(pos);
        if (input.substr(pos.offset, 2) === "\\\"") {
          result0 = "\\\"";
          advance(pos, 2);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\\\\\\"\"");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column) { return '"' })(pos0.offset, pos0.line, pos0.column);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }

      function parse_comment() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2, pos3, pos4;

        reportFailures++;
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (input.substr(pos.offset, 2) === "{!") {
          result0 = "{!";
          advance(pos, 2);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"{!\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          pos2 = clone(pos);
          pos3 = clone(pos);
          pos4 = clone(pos);
          reportFailures++;
          if (input.substr(pos.offset, 2) === "!}") {
            result2 = "!}";
            advance(pos, 2);
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\"!}\"");
            }
          }
          reportFailures--;
          if (result2 === null) {
            result2 = "";
          } else {
            result2 = null;
            pos = clone(pos4);
          }
          if (result2 !== null) {
            if (input.length > pos.offset) {
              result3 = input.charAt(pos.offset);
              advance(pos, 1);
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("any character");
              }
            }
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = clone(pos3);
            }
          } else {
            result2 = null;
            pos = clone(pos3);
          }
          if (result2 !== null) {
            result2 = (function(offset, line, column, c) {return c})(pos2.offset, pos2.line, pos2.column, result2[1]);
          }
          if (result2 === null) {
            pos = clone(pos2);
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = clone(pos);
            pos3 = clone(pos);
            pos4 = clone(pos);
            reportFailures++;
            if (input.substr(pos.offset, 2) === "!}") {
              result2 = "!}";
              advance(pos, 2);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"!}\"");
              }
            }
            reportFailures--;
            if (result2 === null) {
              result2 = "";
            } else {
              result2 = null;
              pos = clone(pos4);
            }
            if (result2 !== null) {
              if (input.length > pos.offset) {
                result3 = input.charAt(pos.offset);
                advance(pos, 1);
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("any character");
                }
              }
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = clone(pos3);
              }
            } else {
              result2 = null;
              pos = clone(pos3);
            }
            if (result2 !== null) {
              result2 = (function(offset, line, column, c) {return c})(pos2.offset, pos2.line, pos2.column, result2[1]);
            }
            if (result2 === null) {
              pos = clone(pos2);
            }
          }
          if (result1 !== null) {
            if (input.substr(pos.offset, 2) === "!}") {
              result2 = "!}";
              advance(pos, 2);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"!}\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, c) { return ["comment", c.join('')].concat([['line', line], ['col', column]]) })(pos0.offset, pos0.line, pos0.column, result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        reportFailures--;
        if (reportFailures === 0 && result0 === null) {
          matchFailed("comment");
        }
        return result0;
      }

      function parse_tag() {
        var result0, result1, result2, result3, result4, result5, result6, result7;
        var pos0, pos1, pos2;

        pos0 = clone(pos);
        result0 = parse_ld();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_ws();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_ws();
          }
          if (result1 !== null) {
            if (/^[#?^><+%:@\/~%]/.test(input.charAt(pos.offset))) {
              result2 = input.charAt(pos.offset);
              advance(pos, 1);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("[#?^><+%:@\\/~%]");
              }
            }
            if (result2 !== null) {
              result3 = [];
              result4 = parse_ws();
              while (result4 !== null) {
                result3.push(result4);
                result4 = parse_ws();
              }
              if (result3 !== null) {
                pos1 = clone(pos);
                pos2 = clone(pos);
                reportFailures++;
                result5 = parse_rd();
                reportFailures--;
                if (result5 === null) {
                  result5 = "";
                } else {
                  result5 = null;
                  pos = clone(pos2);
                }
                if (result5 !== null) {
                  pos2 = clone(pos);
                  reportFailures++;
                  result6 = parse_eol();
                  reportFailures--;
                  if (result6 === null) {
                    result6 = "";
                  } else {
                    result6 = null;
                    pos = clone(pos2);
                  }
                  if (result6 !== null) {
                    if (input.length > pos.offset) {
                      result7 = input.charAt(pos.offset);
                      advance(pos, 1);
                    } else {
                      result7 = null;
                      if (reportFailures === 0) {
                        matchFailed("any character");
                      }
                    }
                    if (result7 !== null) {
                      result5 = [result5, result6, result7];
                    } else {
                      result5 = null;
                      pos = clone(pos1);
                    }
                  } else {
                    result5 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result5 = null;
                  pos = clone(pos1);
                }
                if (result5 !== null) {
                  result4 = [];
                  while (result5 !== null) {
                    result4.push(result5);
                    pos1 = clone(pos);
                    pos2 = clone(pos);
                    reportFailures++;
                    result5 = parse_rd();
                    reportFailures--;
                    if (result5 === null) {
                      result5 = "";
                    } else {
                      result5 = null;
                      pos = clone(pos2);
                    }
                    if (result5 !== null) {
                      pos2 = clone(pos);
                      reportFailures++;
                      result6 = parse_eol();
                      reportFailures--;
                      if (result6 === null) {
                        result6 = "";
                      } else {
                        result6 = null;
                        pos = clone(pos2);
                      }
                      if (result6 !== null) {
                        if (input.length > pos.offset) {
                          result7 = input.charAt(pos.offset);
                          advance(pos, 1);
                        } else {
                          result7 = null;
                          if (reportFailures === 0) {
                            matchFailed("any character");
                          }
                        }
                        if (result7 !== null) {
                          result5 = [result5, result6, result7];
                        } else {
                          result5 = null;
                          pos = clone(pos1);
                        }
                      } else {
                        result5 = null;
                        pos = clone(pos1);
                      }
                    } else {
                      result5 = null;
                      pos = clone(pos1);
                    }
                  }
                } else {
                  result4 = null;
                }
                if (result4 !== null) {
                  result5 = [];
                  result6 = parse_ws();
                  while (result6 !== null) {
                    result5.push(result6);
                    result6 = parse_ws();
                  }
                  if (result5 !== null) {
                    result6 = parse_rd();
                    if (result6 !== null) {
                      result0 = [result0, result1, result2, result3, result4, result5, result6];
                    } else {
                      result0 = null;
                      pos = clone(pos0);
                    }
                  } else {
                    result0 = null;
                    pos = clone(pos0);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos0);
                }
              } else {
                result0 = null;
                pos = clone(pos0);
              }
            } else {
              result0 = null;
              pos = clone(pos0);
            }
          } else {
            result0 = null;
            pos = clone(pos0);
          }
        } else {
          result0 = null;
          pos = clone(pos0);
        }
        if (result0 === null) {
          result0 = parse_reference();
        }
        return result0;
      }

      function parse_ld() {
        var result0;

        if (input.charCodeAt(pos.offset) === 123) {
          result0 = "{";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"{\"");
          }
        }
        return result0;
      }

      function parse_rd() {
        var result0;

        if (input.charCodeAt(pos.offset) === 125) {
          result0 = "}";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"}\"");
          }
        }
        return result0;
      }

      function parse_lb() {
        var result0;

        if (input.charCodeAt(pos.offset) === 91) {
          result0 = "[";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"[\"");
          }
        }
        return result0;
      }

      function parse_rb() {
        var result0;

        if (input.charCodeAt(pos.offset) === 93) {
          result0 = "]";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"]\"");
          }
        }
        return result0;
      }

      function parse_eol() {
        var result0;

        if (input.charCodeAt(pos.offset) === 10) {
          result0 = "\n";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\n\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos.offset, 2) === "\r\n") {
            result0 = "\r\n";
            advance(pos, 2);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"\\r\\n\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos.offset) === 13) {
              result0 = "\r";
              advance(pos, 1);
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"\\r\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos.offset) === 8232) {
                result0 = "\u2028";
                advance(pos, 1);
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"\\u2028\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos.offset) === 8233) {
                  result0 = "\u2029";
                  advance(pos, 1);
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"\\u2029\"");
                  }
                }
              }
            }
          }
        }
        return result0;
      }

      function parse_ws() {
        var result0;

        if (/^[\t\x0B\f \xA0\uFEFF]/.test(input.charAt(pos.offset))) {
          result0 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[\\t\\x0B\\f \\xA0\\uFEFF]");
          }
        }
        if (result0 === null) {
          result0 = parse_eol();
        }
        return result0;
      }


      function cleanupExpected(expected) {
        expected.sort();

        var lastExpected = null;
        var cleanExpected = [];
        for (var i = 0; i < expected.length; i++) {
          if (expected[i] !== lastExpected) {
            cleanExpected.push(expected[i]);
            lastExpected = expected[i];
          }
        }
        return cleanExpected;
      }



      var result = parseFunctions[startRule]();

      /*
       * The parser is now in one of the following three states:
       *
       * 1. The parser successfully parsed the whole input.
       *
       *    - |result !== null|
       *    - |pos.offset === input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 2. The parser successfully parsed only a part of the input.
       *
       *    - |result !== null|
       *    - |pos.offset < input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 3. The parser did not successfully parse any part of the input.
       *
       *   - |result === null|
       *   - |pos.offset === 0|
       *   - |rightmostFailuresExpected| contains at least one failure
       *
       * All code following this comment (including called functions) must
       * handle these states.
       */
      if (result === null || pos.offset !== input.length) {
        var offset = Math.max(pos.offset, rightmostFailuresPos.offset);
        var found = offset < input.length ? input.charAt(offset) : null;
        var errorPosition = pos.offset > rightmostFailuresPos.offset ? pos : rightmostFailuresPos;

        throw new parser.SyntaxError(
          cleanupExpected(rightmostFailuresExpected),
          found,
          offset,
          errorPosition.line,
          errorPosition.column
        );
      }

      return result;
    },

    /* Returns the parser source code. */
    toSource: function() { return this._source; }
  };

  /* Thrown when a parser encounters a syntax error. */

  result.SyntaxError = function(expected, found, offset, line, column) {
    function buildMessage(expected, found) {
      var expectedHumanized, foundHumanized;

      switch (expected.length) {
        case 0:
          expectedHumanized = "end of input";
          break;
        case 1:
          expectedHumanized = expected[0];
          break;
        default:
          expectedHumanized = expected.slice(0, expected.length - 1).join(", ")
            + " or "
            + expected[expected.length - 1];
      }

      foundHumanized = found ? quote(found) : "end of input";

      return "Expected " + expectedHumanized + " but " + foundHumanized + " found.";
    }

    this.name = "SyntaxError";
    this.expected = expected;
    this.found = found;
    this.message = buildMessage(expected, found);
    this.offset = offset;
    this.line = line;
    this.column = column;
  };

  result.SyntaxError.prototype = Error.prototype;

  return result;
})();

dust.parse = parser.parse;

})(getGlobal());

module.exports = getGlobal();
});

require.register("serandomps~dust@master/helpers.js", function (exports, module) {
module.exports = {
    slice: function (chunk, context, bodies, params) {
        return chunk.map(function (chunk) {
            var ctx = context.current(),
                length = ctx.length,
                start = parseInt(params.start, 10) || 0,
                end = parseInt(params.end, 10) || length,
                count = parseInt(params.count, 10) || length,
                size = parseInt(params.size, 10) || length,
                i = start,
                c = 0;
            while (i < end && c++ < count) {
                chunk.render(bodies.block, context.push(ctx.slice(i, (i += size))));
            }
            chunk.end();
        });
    },
    dump: function (chunk, context) {
        console.log(context);
        return chunk.write(JSON.stringify(context));
    }
};
});

require.register("serandomps~dust@master", function (exports, module) {
module.exports = function (helpers) {
    var dust = require('serandomps~dust@master/dust.js');
    var render = dust.render;
    var renderSource = dust.renderSource;
    var stream = dust.stream;

    dust.helpers = require('serandomps~dust@master/helpers.js');
    helpers = helpers || {};

    dust.render = function () {
        var args = Array.prototype.slice.call(arguments);
        var base = dust.makeBase(helpers);
        //args[1] = base.push(args[1]);
        return render.apply(dust, args);
    };
    /*

     dust.renderSource = function () {
     var args = Array.prototype.slice.call(arguments);
     var base = dust.makeBase(helpers);
     //args[1] = base.push(args[1]);
     return renderSource.apply(dust, args);
     };
     */

    dust.stream = function () {
        var args = Array.prototype.slice.call(arguments);
        var base = dust.makeBase(helpers);
        //args[1] = base.push(args[1]);
        return stream.apply(dust, args);
    };

    return dust;
};
});

require.register("tj~node-querystring@0.6.6", function (exports, module) {
/**
 * Object#toString() ref for stringify().
 */

var toString = Object.prototype.toString;

/**
 * Object#hasOwnProperty ref
 */

var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Array#indexOf shim.
 */

var indexOf = typeof Array.prototype.indexOf === 'function'
  ? function(arr, el) { return arr.indexOf(el); }
  : function(arr, el) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] === el) return i;
      }
      return -1;
    };

/**
 * Array.isArray shim.
 */

var isArray = Array.isArray || function(arr) {
  return toString.call(arr) == '[object Array]';
};

/**
 * Object.keys shim.
 */

var objectKeys = Object.keys || function(obj) {
  var ret = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      ret.push(key);
    }
  }
  return ret;
};

/**
 * Array#forEach shim.
 */

var forEach = typeof Array.prototype.forEach === 'function'
  ? function(arr, fn) { return arr.forEach(fn); }
  : function(arr, fn) {
      for (var i = 0; i < arr.length; i++) fn(arr[i]);
    };

/**
 * Array#reduce shim.
 */

var reduce = function(arr, fn, initial) {
  if (typeof arr.reduce === 'function') return arr.reduce(fn, initial);
  var res = initial;
  for (var i = 0; i < arr.length; i++) res = fn(res, arr[i]);
  return res;
};

/**
 * Cache non-integer test regexp.
 */

var isint = /^[0-9]+$/;

function promote(parent, key) {
  if (parent[key].length == 0) return parent[key] = {}
  var t = {};
  for (var i in parent[key]) {
    if (hasOwnProperty.call(parent[key], i)) {
      t[i] = parent[key][i];
    }
  }
  parent[key] = t;
  return t;
}

function parse(parts, parent, key, val) {
  var part = parts.shift();

  // illegal
  if (Object.getOwnPropertyDescriptor(Object.prototype, key)) return;

  // end
  if (!part) {
    if (isArray(parent[key])) {
      parent[key].push(val);
    } else if ('object' == typeof parent[key]) {
      parent[key] = val;
    } else if ('undefined' == typeof parent[key]) {
      parent[key] = val;
    } else {
      parent[key] = [parent[key], val];
    }
    // array
  } else {
    var obj = parent[key] = parent[key] || [];
    if (']' == part) {
      if (isArray(obj)) {
        if ('' != val) obj.push(val);
      } else if ('object' == typeof obj) {
        obj[objectKeys(obj).length] = val;
      } else {
        obj = parent[key] = [parent[key], val];
      }
      // prop
    } else if (~indexOf(part, ']')) {
      part = part.substr(0, part.length - 1);
      if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
      parse(parts, obj, part, val);
      // key
    } else {
      if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
      parse(parts, obj, part, val);
    }
  }
}

/**
 * Merge parent key/val pair.
 */

function merge(parent, key, val){
  if (~indexOf(key, ']')) {
    var parts = key.split('[')
      , len = parts.length
      , last = len - 1;
    parse(parts, parent, 'base', val);
    // optimize
  } else {
    if (!isint.test(key) && isArray(parent.base)) {
      var t = {};
      for (var k in parent.base) t[k] = parent.base[k];
      parent.base = t;
    }
    set(parent.base, key, val);
  }

  return parent;
}

/**
 * Compact sparse arrays.
 */

function compact(obj) {
  if ('object' != typeof obj) return obj;

  if (isArray(obj)) {
    var ret = [];

    for (var i in obj) {
      if (hasOwnProperty.call(obj, i)) {
        ret.push(obj[i]);
      }
    }

    return ret;
  }

  for (var key in obj) {
    obj[key] = compact(obj[key]);
  }

  return obj;
}

/**
 * Parse the given obj.
 */

function parseObject(obj){
  var ret = { base: {} };

  forEach(objectKeys(obj), function(name){
    merge(ret, name, obj[name]);
  });

  return compact(ret.base);
}

/**
 * Parse the given str.
 */

function parseString(str){
  var ret = reduce(String(str).split('&'), function(ret, pair){
    var eql = indexOf(pair, '=')
      , brace = lastBraceInKey(pair)
      , key = pair.substr(0, brace || eql)
      , val = pair.substr(brace || eql, pair.length)
      , val = val.substr(indexOf(val, '=') + 1, val.length);

    // ?foo
    if ('' == key) key = pair, val = '';
    if ('' == key) return ret;

    return merge(ret, decode(key), decode(val));
  }, { base: {} }).base;

  return compact(ret);
}

/**
 * Parse the given query `str` or `obj`, returning an object.
 *
 * @param {String} str | {Object} obj
 * @return {Object}
 * @api public
 */

exports.parse = function(str){
  if (null == str || '' == str) return {};
  return 'object' == typeof str
    ? parseObject(str)
    : parseString(str);
};

/**
 * Turn the given `obj` into a query string
 *
 * @param {Object} obj
 * @return {String}
 * @api public
 */

var stringify = exports.stringify = function(obj, prefix) {
  if (isArray(obj)) {
    return stringifyArray(obj, prefix);
  } else if ('[object Object]' == toString.call(obj)) {
    return stringifyObject(obj, prefix);
  } else if ('string' == typeof obj) {
    return stringifyString(obj, prefix);
  } else {
    return prefix + '=' + encodeURIComponent(String(obj));
  }
};

/**
 * Stringify the given `str`.
 *
 * @param {String} str
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyString(str, prefix) {
  if (!prefix) throw new TypeError('stringify expects an object');
  return prefix + '=' + encodeURIComponent(str);
}

/**
 * Stringify the given `arr`.
 *
 * @param {Array} arr
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyArray(arr, prefix) {
  var ret = [];
  if (!prefix) throw new TypeError('stringify expects an object');
  for (var i = 0; i < arr.length; i++) {
    ret.push(stringify(arr[i], prefix + '[' + i + ']'));
  }
  return ret.join('&');
}

/**
 * Stringify the given `obj`.
 *
 * @param {Object} obj
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyObject(obj, prefix) {
  var ret = []
    , keys = objectKeys(obj)
    , key;

  for (var i = 0, len = keys.length; i < len; ++i) {
    key = keys[i];
    if ('' == key) continue;
    if (null == obj[key]) {
      ret.push(encodeURIComponent(key) + '=');
    } else {
      ret.push(stringify(obj[key], prefix
        ? prefix + '[' + encodeURIComponent(key) + ']'
        : encodeURIComponent(key)));
    }
  }

  return ret.join('&');
}

/**
 * Set `obj`'s `key` to `val` respecting
 * the weird and wonderful syntax of a qs,
 * where "foo=bar&foo=baz" becomes an array.
 *
 * @param {Object} obj
 * @param {String} key
 * @param {String} val
 * @api private
 */

function set(obj, key, val) {
  var v = obj[key];
  if (Object.getOwnPropertyDescriptor(Object.prototype, key)) return;
  if (undefined === v) {
    obj[key] = val;
  } else if (isArray(v)) {
    v.push(val);
  } else {
    obj[key] = [v, val];
  }
}

/**
 * Locate last brace in `str` within the key.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function lastBraceInKey(str) {
  var len = str.length
    , brace
    , c;
  for (var i = 0; i < len; ++i) {
    c = str[i];
    if (']' == c) brace = false;
    if ('[' == c) brace = true;
    if ('=' == c && !brace) return i;
  }
}

/**
 * Decode `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function decode(str) {
  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch (err) {
    return str;
  }
}

});

require.register("serandomps~serand@master/layout.js", function (exports, module) {
var async = require('serandomps~async@master');
var dust = require('serandomps~dust@master')();

var cleaners = [];

var Layout = function (base, dependencies, layout) {
    this.sel = null;
    this.stack = [];
    this.base = base;
    this.dependencies = dependencies;
    this.layout = layout;
};

Layout.prototype.render = function (fn) {
    var layout = this;
    var stack = layout.stack;
    dust.renderSource(require(layout.base + '/' + layout.layout + '.html'), {}, function (err, html) {
        var tasks = [];
        var el = $(html);
        stack.forEach(function (o) {
            tasks.push(function (fn) {
                var comp = require(layout.dependencies[o.comp]);
                var area = $(o.sel, el);
                comp($('<div class="sandbox"></div>').appendTo(area), fn, o.opts);
            });
        });
        async.parallel(tasks, function (err, results, done) {
            cleaners.forEach(function (clean) {
                clean();
            });
            cleaners = [];
            $('#content').html(el);
            results.forEach(function (result) {
                if (typeof result === 'function') {
                    return cleaners.push(result);
                }
                cleaners.push(result.clean);
                var done = result.done;
                if (!done) {
                    return;
                }
                return done();
            });
            if (fn) {
                fn(err, results);
            }
        });
    });
    return this;
};

Layout.prototype.area = function (sel) {
    this.sel = sel;
    return this;
};

Layout.prototype.add = function (comp, opts) {
    this.stack.push({
        sel: this.sel,
        comp: comp,
        opts: opts
    });
    return this;
};

module.exports = Layout;
});

require.register("serandomps~serand@master", function (exports, module) {
var page = require('visionmedia~page.js@1.7.1');
var qs = require('tj~node-querystring@0.6.6');
var Layout = require('serandomps~serand@master/layout.js');

require('serandomps~serand@master/utils.js');

var listeners = [];

var configs = {};

var serand = module.exports;

page(function (ctx, next) {
    ctx.query = qs.parse(ctx.querystring);
    next();
});

var event = function (channel, event) {
    channel = listeners[channel] || (listeners[channel] = {});
    return channel[event] || (channel[event] = {on: [], once: []});
};

/**
 * Registers an event listner for the specified channel
 * @param ch channel name
 * @param e event name
 * @param fn event callback
 */
module.exports.on = function (ch, e, fn) {
    event(ch, e).on.push(fn);
};

module.exports.once = function (ch, e, fn) {
    event(ch, e).once.push(fn);
};

module.exports.off = function (ch, e, fn) {
    var arr = event(ch, e);
    var idx = arr.on.indexOf(fn);
    if (idx !== -1) {
        arr.on.splice(idx, 1);
    }
    idx = arr.once.indexOf(fn);
    if (idx !== -1) {
        arr.once.splice(idx, 1);
    }
};

/**
 * Emits the specified event on the specified channel
 * @param ch channel name
 * @param e event name
 * @param data event data
 */
module.exports.emit = function (ch, e, data) {
    var o = event(ch, e);
    var args = Array.prototype.slice.call(arguments, 2);
    o.on.forEach(function (fn) {
        fn.apply(fn, args);
    });
    o.once.forEach(function (fn) {
        fn.apply(fn, args);
    });
    o.once = [];
};

module.exports.page = function () {
    var args = Array.prototype.slice.call(arguments);
    page.apply(page, args);
};

module.exports.redirect = function (path, state) {
    setTimeout(function () {
        page(path, state);
    }, 0);
};

module.exports.reload = function () {
    console.log(window.location);
};

module.exports.boot = function (base) {
    var dep;
    var parts;
    var index;
    var name;
    var module;
    var dependencies = {};
    var comp = JSON.parse(require(base + '/component.json'));
    var deps = comp.dependencies;
    for (dep in deps) {
        if (deps.hasOwnProperty(dep)) {
            parts = dep.split('/');
            index = dep.indexOf('/');
            name = parts[1];
            module = dep.replace('/', '~') + '@' + deps[dep];
            dependencies[name] = module;
            if (parts[0] !== 'serandomps') {
                continue;
            }
            require(module);
        }
    }
    console.log(dependencies);
    return {
        base: base,
        dependencies: dependencies
    };
};

module.exports.layout = function (app) {
    return function (layout) {
        return new Layout(app.base, app.dependencies, layout);
    };
};

module.exports.current = function (path) {
    var ctx = new page.Context(window.location.pathname + window.location.search);
    if (!path) {
        return ctx;
    }
    var route = new page.Route(path);
    if (!route.match(ctx.path, ctx.params)) {
        return null;
    }
    ctx.query = qs.parse(ctx.querystring);
    return ctx;
};

module.exports.configs = configs;

module.exports.once('serand', 'ready', function () {
    page();
});

$(function () {
    $(document).on('click', '.suck', function (e) {
        e.preventDefault();
    });
});

$(window).on('storage', function (e) {
    e = e.originalEvent;
    var key = e.key;
    module.exports.emit('stored', key, module.exports.store(key));
});

module.exports.cache = function (key, val) {
    if (val) {
        sessionStorage.setItem(key, JSON.stringify(val));
        return val;
    }
    if (val === null) {
        return sessionStorage.removeItem(key);
    }
    val = sessionStorage.getItem(key);
    return val ? JSON.parse(val) : null;
};

module.exports.store = function (key, val) {
    if (val) {
        localStorage.setItem(key, JSON.stringify(val));
        return val;
    }
    var o = localStorage.getItem(key);
    if (val === null) {
        localStorage.removeItem(key);
    }
    return o ? JSON.parse(o) : null;
};

module.exports.none = function () {

};

});

require.register("serandomps~serand@master/utils.js", function (exports, module) {
var boundary = function () {
    var boundry = '---------------------------';
    boundry += Math.floor(Math.random() * 32768);
    boundry += Math.floor(Math.random() * 32768);
    boundry += Math.floor(Math.random() * 32768);
    return boundry;
};

var content = function (boundry, name, value) {
    var body = '';
    body += '--' + boundry + '\r\n' + 'Content-Disposition: form-data; name="';
    body += name;
    body += '"\r\n\r\n';
    body += value;
    return body;
};

var end = function (boundry, cont) {
    return cont + '\r\n' + '--' + boundry + '--';
};

var ajax = $.ajax;

$.ajax = function (options) {
    var headers;
    var data;
    var key;
    var boundry;
    var body = '';
    if (options.contentType === 'multipart/form-data') {
        headers = options.headers || (options.headers = {});
        if (!headers['Content-Type']) {
            data = options.data;
            boundry = boundary();
            for (key in data) {
                if (data.hasOwnProperty(key)) {
                    body += content(boundry, key, data[key]);
                }
            }
            body = end(boundry, body);
            options.data = body;
            headers['Content-Type'] = 'multipart/form-data; boundary=' + boundry;
            headers['Content-Length'] = body.length;
        }
    }
    return ajax.call($, options);
};
});

require.register("serandomps~utils@master", function (exports, module) {
var configs = function (name, done) {
    $.ajax({
        method: 'GET',
        url: '/apis/v/configs/' + name,
        headers: {
            'X-Host': 'accounts.serandives.com'
        },
        dataType: 'json',
        success: function (config) {
            done(false, config.value);
        },
        error: function () {
            console.log('error retrieving ' + name);
            done('error retrieving ' + name + ' configuration');
        }
    });
};

var id = function () {
    return Math.random().toString(36).slice(2);
};

module.exports.configs = configs;

module.exports.id = id;
});

require.register("serandomps~utils@master/permissions.js", function (exports, module) {
var tree = {
    autos: {
        '123456': {
            '': ['read', 'write'],
            'comments': {
                '': ['read'],
                '*': {
                    '': []
                },
                '0001': {
                    '': ['read', 'update'],
                    '*': ['read'],
                    'abcdef': {
                        '': ['update']
                    }
                }
            }
        },
        '*': {
            '': ['read']
        }
    }
};

var has = function (tree, perms, action) {
    var allowed;
    if (!perms.length) {
        allowed = tree[''] || [];
        return allowed.indexOf('*') !== -1 || allowed.indexOf(action) !== -1;
    }
    var all = tree['*'];
    allowed = all ? all[''] || [] : [];
    if (allowed.indexOf('*') !== -1 || allowed.indexOf(action) !== -1) {
        return true;
    }
    tree = tree[perms.shift()];
    if (!tree) {
        return false;
    }
    return has(tree, perms, action);
};

var add = function (tree, perms, actions) {
    var allowed;
    var perm = perms.shift();

    if (perms.length) {
        tree = tree[perm] || (tree[perm] = {});
        return add(tree, perms, actions);
    }

    tree = tree[perm] || (tree[perm] = {});
    allowed = tree[''] || [];
    tree[''] = allowed.concat(actions);
};

var can = function (tree, permission, action) {
    return has(tree, permission.split(':'), action);
};

var permit = function (tree, permission, actions) {
    actions = actions instanceof Array ? actions : [actions];
    return add(tree, permission.split(':'), actions);
};

module.exports.can = can;

module.exports.permit = permit;

// autos:1234
// autos:1234:*
// autos:*
// autos
// autos:*:comments
// autos:*:comments:*
// autos:*:comments:1234

/*
 console.log(can(tree, 'autos', 'read'));
 console.log(can(tree, 'autos', 'write'));
 console.log(can(tree, 'autos:123456', 'read'));
 console.log(can(tree, 'autos:123456:comments:0001:abcdef', 'update1'));
 console.log(can(tree, 'autos:0', 'read'));
 console.log(can(tree, 'autos:*', 'read'));
 console.log(can(tree, 'autos:0:comments', 'read'));

 var perms = {};
 allow(perms, 'autos', 'read');
 allow(perms, 'autos', 'write');
 allow(perms, 'autos:123456', 'read');
 allow(perms, 'autos:123456:comments:0001:abcdef', 'update1');
 allow(perms, 'autos:0', 'read');
 allow(perms, 'autos:*', 'read');
 allow(perms, 'autos:0:comments', 'read');

 console.log(can(perms, 'autos', 'read'));
 console.log(can(perms, 'autos', 'write'));
 console.log(can(perms, 'autos:123456', 'read'));
 console.log(can(perms, 'autos:123456:comments:0001:abcdef', 'update1'));
 console.log(can(perms, 'autos:0', 'read'));
 console.log(can(perms, 'autos:*', 'read'));
 console.log(can(perms, 'autos:0:comments', 'read'));
 */

});

require.register("serandomps~user@master", function (exports, module) {
var serand = require('serandomps~serand@master');
var utils = require('serandomps~utils@master');

var perms = require('serandomps~user@master/permissions.js');

var REFRESH_BEFORE = 10 * 1000;

//TODO: move these facebook etc. configs to account-signin, since this relates only to accounts.com
var context = {
    serandives: {
        login: 'https://accounts.serandives.com/signin'
    },
    facebook: {
        login: 'https://www.facebook.com/dialog/oauth',
        location: 'https://accounts.serandives.com/auth/oauth',
        scopes: ['email', 'public_profile']
    }
};

var user;

var refresher;

var ready = false;

var ajax = $.ajax;

var queue = [];

var token = false;

var boot = false;

//anon permissions
var permissions = {};

var loginUri = function (type, location) {
    var o = context[type];
    location = location || o.location;
    var url = o.login + '?client_id=' + o.client
        + (location ? '&redirect_uri=' + location : '')
        + (o.scopes ? '&scope=' + o.scopes.join(',') : '');
    console.log(url);
    return url;
};

var emit = function (usr) {
    if (!ready) {
        ready = true;
        serand.emit('user', 'ready', usr);
        return usr;
    }
    if (usr) {
        user ? serand.emit('user', 'refreshed', usr) : serand.emit('user', 'logged in', usr);
        return usr;
    }
    if (user) {
        serand.emit('user', 'logged out', null);
    }
};

var update = function (usr) {
    user = usr;
    serand.store('user', usr);
    if (!usr) {
        clearTimeout(refresher);
    }
    return usr;
};

var emitup = function (usr) {
    emit(usr);
    update(usr);
};

var later = function (task, after) {
    if (refresher) {
        clearTimeout(refresher);
    }
    refresher = setTimeout(task, after);
};

$.ajax = function (options) {
    if (token && !options.token) {
        queue.push(options);
        return;
    }
    var success = options.success || serand.none;
    var error = options.error || serand.none;
    options.success = function (data, status, xhr) {
        success.apply(null, Array.prototype.slice.call(arguments));
    };
    options.error = function (xhr, status, err) {
        if (xhr.status !== 401) {
            error.apply(null, Array.prototype.slice.call(arguments));
            return;
        }
        if (options.token) {
            error.apply(null, Array.prototype.slice.call(arguments));
            return;
        }
        console.log('transparently retrying unauthorized request');
        token = true;
        refresh(user, function (err) {
            token = false;
            if (err) {
                error({status: 401});
                queue.forEach(function (options) {
                    if (!options.error) {
                        return;
                    }
                    options.error({status: 401});
                });
                queue = [];
                serand.emit('user', 'login');
                return;
            }
            options.success = success;
            options.error = error;
            $.ajax(options);
            queue.forEach(function (options) {
                $.ajax(options);
            });
            queue = [];
        });
    };
    var headers;
    if (user) {
        headers = options.headers || (options.headers = {});
        headers['Authorization'] = headers['Authorization'] || ('Bearer ' + user.access);
    }
    console.log(options);
    return ajax.call($, options);
};

utils.configs('boot', function (err, config) {
    var name;
    var clients = config.clients;
    console.log(clients);
    for (name in clients) {
        if (!clients.hasOwnProperty(name)) {
            continue;
        }
        var o = context[name];
        o.clientId = clients[name];
        var pending = o.pending;
        if (!pending) {
            continue;
        }
        var options = pending.options;
        pending.done(false, loginUri(name, options.location));
        delete o.pending;
    }
    boot = true;
});

var expires = function (expin) {
    return new Date().getTime() + expin - REFRESH_BEFORE;
};

var next = function (expires) {
    var exp = expires - new Date().getTime();
    return exp > 0 ? exp : null;
};

var initialize = function () {
    var usr = serand.store('user');
    if (!usr) {
        return emitup(null);
    }
    console.log(usr);
    var nxt = next(usr.expires);
    if (!nxt) {
        return emitup(null);
    }
    refresh(usr, function (err, usr) {
        emitup(usr);
    });
};

var refresh = function (usr, done) {
    done = done || serand.none;
    if (!usr) {
        return done('!user');
    }
    $.ajax({
        token: true,
        method: 'POST',
        url: '/apis/v/tokens',
        headers: {
            'X-Host': 'accounts.serandives.com'
        },
        data: {
            grant_type: 'refresh_token',
            refresh_token: usr.refresh
        },
        contentType: 'application/x-www-form-urlencoded',
        dataType: 'json',
        success: function (data) {
            usr = {
                username: usr.username,
                access: data.access_token,
                refresh: data.refresh_token,
                expires: expires(data.expires_in)
            };
            emitup(usr);
            console.log('token refresh successful');
            var nxt = next(usr.expires);
            console.log('next refresh in : ' + Math.floor(nxt / 1000));
            later(function () {
                refresh(user);
            }, nxt);
            done(null, usr);
        },
        error: function (xhr) {
            console.log('token refresh error');
            emitup(null);
            done(xhr);
        }
    });
};

var authenticator = function (options, done) {
    var type = options.type || 'serandives';
    if (boot) {
        done(false, loginUri(type, options.location));
        return;
    }
    var o = context[type];
    o.pending = {
        options: options,
        done: done
    };
};

module.exports.can = function (permission, action) {
    var tree = user.permissions || permissions;
    return perms.can(tree, permission, action);
};

serand.on('user', 'logout', function () {
    if (!user) {
        return;
    }
    $.ajax({
        method: 'DELETE',
        url: '/apis/v/tokens/' + user.access,
        headers: {
            'X-Host': 'accounts.serandives.com'
        },
        dataType: 'json',
        success: function (data) {
            console.log('logout successful');
            emitup(null);
        },
        error: function () {
            console.log('logout error');
            serand.emit('user', 'logout error');
        }
    });
});

serand.on('serand', 'ready', function () {
    initialize();
});

serand.on('stored', 'user', function (usr) {
    emit(usr);
    user = usr;
});

serand.on('user', 'logged in', function (usr) {
    update(usr);
    var nxt = next(usr.expires);
    console.log('next refresh in : ' + Math.floor(nxt / 1000));
    later(function () {
        refresh(user);
    }, nxt);
});

serand.on('user', 'authenticator', function (options, done) {
    if (!done) {
        done = options;
        options = {};
    }
    authenticator(options, done);
});

serand.on('user', 'info', function (id, token, done) {
    if (!done) {
        done = token;
        token = null;
    }
    var options = {
        method: 'GET',
        url: '/apis/v/users/' + id,
        headers: {
            'X-Host': 'accounts.serandives.com'
        },
        dataType: 'json',
        success: function (user) {
            done(false, user);
        },
        error: function () {
            done('permissions error');
        }
    };
    if (token) {
        options.headers['Authorization'] = 'Bearer ' + token;
    }
    $.ajax(options);
});

//TODO: token needs to return user id etc. so, later that user id is used to retrieve user info

});

require.register("serandomps~user@master/permissions.js", function (exports, module) {
var tree = {
    autos: {
        '123456': {
            '': ['read', 'write'],
            'comments': {
                '': ['read'],
                '*': {
                    '': []
                },
                '0001': {
                    '': ['read', 'update'],
                    '*': ['read'],
                    'abcdef': {
                        '': ['update']
                    }
                }
            }
        },
        '*': {
            '': ['read']
        }
    }
};

var has = function (tree, perms, action) {
    var allowed;
    if (!perms.length) {
        allowed = tree[''] || [];
        return allowed.indexOf('*') !== -1 || allowed.indexOf(action) !== -1;
    }
    var all = tree['*'];
    allowed = all ? all[''] || [] : [];
    if (allowed.indexOf('*') !== -1 || allowed.indexOf(action) !== -1) {
        return true;
    }
    tree = tree[perms.shift()];
    if (!tree) {
        return false;
    }
    return has(tree, perms, action);
};

var add = function (tree, perms, actions) {
    var allowed;
    var perm = perms.shift();

    if (perms.length) {
        tree = tree[perm] || (tree[perm] = {});
        return add(tree, perms, actions);
    }

    tree = tree[perm] || (tree[perm] = {});
    allowed = tree[''] || [];
    tree[''] = allowed.concat(actions);
};

var can = function (tree, permission, action) {
    return has(tree, permission.split(':'), action);
};

var permit = function (tree, permission, actions) {
    actions = actions instanceof Array ? actions : [actions];
    return add(tree, permission.split(':'), actions);
};

module.exports.can = can;

module.exports.permit = permit;

// autos:1234
// autos:1234:*
// autos:*
// autos
// autos:*:comments
// autos:*:comments:*
// autos:*:comments:1234

/*
 console.log(can(tree, 'autos', 'read'));
 console.log(can(tree, 'autos', 'write'));
 console.log(can(tree, 'autos:123456', 'read'));
 console.log(can(tree, 'autos:123456:comments:0001:abcdef', 'update1'));
 console.log(can(tree, 'autos:0', 'read'));
 console.log(can(tree, 'autos:*', 'read'));
 console.log(can(tree, 'autos:0:comments', 'read'));

 var perms = {};
 allow(perms, 'autos', 'read');
 allow(perms, 'autos', 'write');
 allow(perms, 'autos:123456', 'read');
 allow(perms, 'autos:123456:comments:0001:abcdef', 'update1');
 allow(perms, 'autos:0', 'read');
 allow(perms, 'autos:*', 'read');
 allow(perms, 'autos:0:comments', 'read');

 console.log(can(perms, 'autos', 'read'));
 console.log(can(perms, 'autos', 'write'));
 console.log(can(perms, 'autos:123456', 'read'));
 console.log(can(perms, 'autos:123456:comments:0001:abcdef', 'update1'));
 console.log(can(perms, 'autos:0', 'read'));
 console.log(can(perms, 'autos:*', 'read'));
 console.log(can(perms, 'autos:0:comments', 'read'));
 */

});

require.register("serandomps~token@master", function (exports, module) {
var serand = require('serandomps~serand@master');

serand.on('token', 'info', function (id, token, done) {
    if (!done) {
        done = token;
        token = null;
    }
    var options = {
        method: 'GET',
        url: '/apis/v/tokens/' + id,
        headers: {
            'X-Host': 'accounts.serandives.com'
        },
        dataType: 'json',
        success: function (token) {
            done(false, token);
        },
        error: function () {
            done('permissions error');
        }
    };
    if (token) {
        options.headers['Authorization'] = 'Bearer ' + token;
    }
    $.ajax(options);
});
});

require.register("serandomps~autos-utils@master", function (exports, module) {
var cdn = 'https://d1vda6a1j3uyzl.cloudfront.net/';

module.exports.cdn = function () {
    return cdn;
};

module.exports.cdn288x162 = function (items) {
    if (!items) {
        return cdn + 'images/288x162/';
    }
    var o = items instanceof Array ? items : [items];
    o.forEach(function (item) {
        var photos = item.photos;
        if (!photos) {
            return;
        }
        var o = [];
        photos.forEach(function (photo, i) {
            o.push({
                id: photo,
                url: cdn + 'images/288x162/' + photo
            });
        });
        item.photos = o;
    });
    return items;
};

module.exports.cdn800x450 = function (items) {
    if (!items) {
        return cdn + 'images/800x450/';
    }
    var o = items instanceof Array ? items : [items];
    o.forEach(function (item) {
        var photos = item.photos;
        if (!photos) {
            return;
        }
        var o = [];
        photos.forEach(function (photo, i) {
            o.push({
                id: photo,
                url: cdn + 'images/800x450/' + photo
            });
        });
        item.photos = o;
    });
    return items;
};
});

require.register("serandomps~gallery@master", function (exports, module) {
!function (a) {
    "use strict";
    "function" == typeof define && define.amd ? define(["./blueimp-helper"], a) : (window.blueimp = window.blueimp || {}, window.blueimp.Gallery = a(window.blueimp.helper || window.jQuery))
}(function (a) {
    "use strict";
    function b(a, c) {
        return void 0 === document.body.style.maxHeight ? null : this && this.options === b.prototype.options ? a && a.length ? (this.list = a, this.num = a.length, this.initOptions(c), void this.initialize()) : void this.console.log("blueimp Gallery: No or empty list provided as first argument.", a) : new b(a, c)
    }

    return a.extend(b.prototype, {
        options: {
            container: "#blueimp-gallery",
            slidesContainer: "div",
            titleElement: "h3",
            displayClass: "blueimp-gallery-display",
            controlsClass: "blueimp-gallery-controls",
            singleClass: "blueimp-gallery-single",
            leftEdgeClass: "blueimp-gallery-left",
            rightEdgeClass: "blueimp-gallery-right",
            playingClass: "blueimp-gallery-playing",
            slideClass: "slide",
            slideLoadingClass: "slide-loading",
            slideErrorClass: "slide-error",
            slideContentClass: "slide-content",
            toggleClass: "toggle",
            prevClass: "prev",
            nextClass: "next",
            closeClass: "close",
            playPauseClass: "play-pause",
            typeProperty: "type",
            titleProperty: "title",
            urlProperty: "href",
            displayTransition: !0,
            clearSlides: !0,
            stretchImages: !1,
            toggleControlsOnReturn: !0,
            toggleSlideshowOnSpace: !0,
            enableKeyboardNavigation: !0,
            closeOnEscape: !0,
            closeOnSlideClick: !0,
            closeOnSwipeUpOrDown: !0,
            emulateTouchEvents: !0,
            stopTouchEventsPropagation: !1,
            hidePageScrollbars: !0,
            disableScroll: !0,
            carousel: !1,
            continuous: !0,
            unloadElements: !0,
            startSlideshow: !1,
            slideshowInterval: 5e3,
            index: 0,
            preloadRange: 2,
            transitionSpeed: 400,
            slideshowTransitionSpeed: void 0,
            event: void 0,
            onopen: void 0,
            onopened: void 0,
            onslide: void 0,
            onslideend: void 0,
            onslidecomplete: void 0,
            onclose: void 0,
            onclosed: void 0
        },
        carouselOptions: {
            hidePageScrollbars: !1,
            toggleControlsOnReturn: !1,
            toggleSlideshowOnSpace: !1,
            enableKeyboardNavigation: !1,
            closeOnEscape: !1,
            closeOnSlideClick: !1,
            closeOnSwipeUpOrDown: !1,
            disableScroll: !1,
            startSlideshow: !0
        },
        console: window.console && "function" == typeof window.console.log ? window.console : {
            log: function () {
            }
        },
        support: function (b) {
            var c = {touch: void 0 !== window.ontouchstart || window.DocumentTouch && document instanceof DocumentTouch}, d = {
                webkitTransition: {
                    end: "webkitTransitionEnd",
                    prefix: "-webkit-"
                },
                MozTransition: {end: "transitionend", prefix: "-moz-"},
                OTransition: {end: "otransitionend", prefix: "-o-"},
                transition: {end: "transitionend", prefix: ""}
            }, e = function () {
                var a, d, e = c.transition;
                document.body.appendChild(b), e && (a = e.name.slice(0, -9) + "ransform", void 0 !== b.style[a] && (b.style[a] = "translateZ(0)", d = window.getComputedStyle(b).getPropertyValue(e.prefix + "transform"), c.transform = {
                    prefix: e.prefix,
                    name: a,
                    translate: !0,
                    translateZ: !!d && "none" !== d
                })), void 0 !== b.style.backgroundSize && (c.backgroundSize = {}, b.style.backgroundSize = "contain", c.backgroundSize.contain = "contain" === window.getComputedStyle(b).getPropertyValue("background-size"), b.style.backgroundSize = "cover", c.backgroundSize.cover = "cover" === window.getComputedStyle(b).getPropertyValue("background-size")), document.body.removeChild(b)
            };
            return function (a, c) {
                var d;
                for (d in c)if (c.hasOwnProperty(d) && void 0 !== b.style[d]) {
                    a.transition = c[d], a.transition.name = d;
                    break
                }
            }(c, d), document.body ? e() : a(document).on("DOMContentLoaded", e), c
        }(document.createElement("div")),
        requestAnimationFrame: window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame,
        initialize: function () {
            return this.initStartIndex(), this.initWidget() === !1 ? !1 : (this.initEventListeners(), this.onslide(this.index), this.ontransitionend(), void(this.options.startSlideshow && this.play()))
        },
        slide: function (a, b) {
            window.clearTimeout(this.timeout);
            var c, d, e, f = this.index;
            if (f !== a && 1 !== this.num) {
                if (b || (b = this.options.transitionSpeed), this.support.transform) {
                    for (this.options.continuous || (a = this.circle(a)), c = Math.abs(f - a) / (f - a), this.options.continuous && (d = c, c = -this.positions[this.circle(a)] / this.slideWidth, c !== d && (a = -c * this.num + a)), e = Math.abs(f - a) - 1; e;)e -= 1, this.move(this.circle((a > f ? a : f) - e - 1), this.slideWidth * c, 0);
                    a = this.circle(a), this.move(f, this.slideWidth * c, b), this.move(a, 0, b), this.options.continuous && this.move(this.circle(a - c), -(this.slideWidth * c), 0)
                } else a = this.circle(a), this.animate(f * -this.slideWidth, a * -this.slideWidth, b);
                this.onslide(a)
            }
        },
        getIndex: function () {
            return this.index
        },
        getNumber: function () {
            return this.num
        },
        prev: function () {
            (this.options.continuous || this.index) && this.slide(this.index - 1)
        },
        next: function () {
            (this.options.continuous || this.index < this.num - 1) && this.slide(this.index + 1)
        },
        play: function (a) {
            var b = this;
            window.clearTimeout(this.timeout), this.interval = a || this.options.slideshowInterval, this.elements[this.index] > 1 && (this.timeout = this.setTimeout(!this.requestAnimationFrame && this.slide || function (a, c) {
                b.animationFrameId = b.requestAnimationFrame.call(window, function () {
                    b.slide(a, c)
                })
            }, [this.index + 1, this.options.slideshowTransitionSpeed], this.interval)), this.container.addClass(this.options.playingClass)
        },
        pause: function () {
            window.clearTimeout(this.timeout), this.interval = null, this.container.removeClass(this.options.playingClass)
        },
        add: function (a) {
            var b;
            for (a.concat || (a = Array.prototype.slice.call(a)), this.list.concat || (this.list = Array.prototype.slice.call(this.list)), this.list = this.list.concat(a), this.num = this.list.length, this.num > 2 && null === this.options.continuous && (this.options.continuous = !0, this.container.removeClass(this.options.leftEdgeClass)), this.container.removeClass(this.options.rightEdgeClass).removeClass(this.options.singleClass), b = this.num - a.length; b < this.num; b += 1)this.addSlide(b), this.positionSlide(b);
            this.positions.length = this.num, this.initSlides(!0)
        },
        resetSlides: function () {
            this.slidesContainer.empty(), this.slides = []
        },
        handleClose: function () {
            var a = this.options;
            this.destroyEventListeners(), this.pause(), this.container[0].style.display = "none", this.container.removeClass(a.displayClass).removeClass(a.singleClass).removeClass(a.leftEdgeClass).removeClass(a.rightEdgeClass), a.hidePageScrollbars && (document.body.style.overflow = this.bodyOverflowStyle), this.options.clearSlides && this.resetSlides(), this.options.onclosed && this.options.onclosed.call(this)
        },
        close: function () {
            var a = this, b = function (c) {
                c.target === a.container[0] && (a.container.off(a.support.transition.end, b), a.handleClose())
            };
            this.options.onclose && this.options.onclose.call(this), this.support.transition && this.options.displayTransition ? (this.container.on(this.support.transition.end, b), this.container.removeClass(this.options.displayClass)) : this.handleClose()
        },
        circle: function (a) {
            return (this.num + a % this.num) % this.num
        },
        move: function (a, b, c) {
            this.translateX(a, b, c), this.positions[a] = b
        },
        translate: function (a, b, c, d) {
            var e = this.slides[a].style, f = this.support.transition, g = this.support.transform;
            e[f.name + "Duration"] = d + "ms", e[g.name] = "translate(" + b + "px, " + c + "px)" + (g.translateZ ? " translateZ(0)" : "")
        },
        translateX: function (a, b, c) {
            this.translate(a, b, 0, c)
        },
        translateY: function (a, b, c) {
            this.translate(a, 0, b, c)
        },
        animate: function (a, b, c) {
            if (!c)return void(this.slidesContainer[0].style.left = b + "px");
            var d = this, e = (new Date).getTime(), f = window.setInterval(function () {
                var g = (new Date).getTime() - e;
                return g > c ? (d.slidesContainer[0].style.left = b + "px", d.ontransitionend(), void window.clearInterval(f)) : void(d.slidesContainer[0].style.left = (b - a) * (Math.floor(g / c * 100) / 100) + a + "px")
            }, 4)
        },
        preventDefault: function (a) {
            a.preventDefault ? a.preventDefault() : a.returnValue = !1
        },
        stopPropagation: function (a) {
            a.stopPropagation ? a.stopPropagation() : a.cancelBubble = !0
        },
        onresize: function () {
            this.initSlides(!0)
        },
        onmousedown: function (a) {
            a.which && 1 === a.which && "VIDEO" !== a.target.nodeName && (a.preventDefault(), (a.originalEvent || a).touches = [{
                pageX: a.pageX,
                pageY: a.pageY
            }], this.ontouchstart(a))
        },
        onmousemove: function (a) {
            this.touchStart && ((a.originalEvent || a).touches = [{
                pageX: a.pageX,
                pageY: a.pageY
            }], this.ontouchmove(a))
        },
        onmouseup: function (a) {
            this.touchStart && (this.ontouchend(a), delete this.touchStart)
        },
        onmouseout: function (b) {
            if (this.touchStart) {
                var c = b.target, d = b.relatedTarget;
                (!d || d !== c && !a.contains(c, d)) && this.onmouseup(b)
            }
        },
        ontouchstart: function (a) {
            this.options.stopTouchEventsPropagation && this.stopPropagation(a);
            var b = (a.originalEvent || a).touches[0];
            this.touchStart = {
                x: b.pageX,
                y: b.pageY,
                time: Date.now()
            }, this.isScrolling = void 0, this.touchDelta = {}
        },
        ontouchmove: function (a) {
            this.options.stopTouchEventsPropagation && this.stopPropagation(a);
            var b, c, d = (a.originalEvent || a).touches[0], e = (a.originalEvent || a).scale, f = this.index;
            if (!(d.length > 1 || e && 1 !== e))if (this.options.disableScroll && a.preventDefault(), this.touchDelta = {
                    x: d.pageX - this.touchStart.x,
                    y: d.pageY - this.touchStart.y
                }, b = this.touchDelta.x, void 0 === this.isScrolling && (this.isScrolling = this.isScrolling || Math.abs(b) < Math.abs(this.touchDelta.y)), this.isScrolling)this.options.closeOnSwipeUpOrDown && this.translateY(f, this.touchDelta.y + this.positions[f], 0); else for (a.preventDefault(), window.clearTimeout(this.timeout), this.options.continuous ? c = [this.circle(f + 1), f, this.circle(f - 1)] : (this.touchDelta.x = b /= !f && b > 0 || f === this.num - 1 && 0 > b ? Math.abs(b) / this.slideWidth + 1 : 1, c = [f], f && c.push(f - 1), f < this.num - 1 && c.unshift(f + 1)); c.length;)f = c.pop(), this.translateX(f, b + this.positions[f], 0)
        },
        ontouchend: function (a) {
            this.options.stopTouchEventsPropagation && this.stopPropagation(a);
            var b, c, d, e, f, g = this.index, h = this.options.transitionSpeed, i = this.slideWidth, j = Number(Date.now() - this.touchStart.time) < 250, k = j && Math.abs(this.touchDelta.x) > 20 || Math.abs(this.touchDelta.x) > i / 2, l = !g && this.touchDelta.x > 0 || g === this.num - 1 && this.touchDelta.x < 0, m = !k && this.options.closeOnSwipeUpOrDown && (j && Math.abs(this.touchDelta.y) > 20 || Math.abs(this.touchDelta.y) > this.slideHeight / 2);
            this.options.continuous && (l = !1), b = this.touchDelta.x < 0 ? -1 : 1, this.isScrolling ? m ? this.close() : this.translateY(g, 0, h) : k && !l ? (c = g + b, d = g - b, e = i * b, f = -i * b, this.options.continuous ? (this.move(this.circle(c), e, 0), this.move(this.circle(g - 2 * b), f, 0)) : c >= 0 && c < this.num && this.move(c, e, 0), this.move(g, this.positions[g] + e, h), this.move(this.circle(d), this.positions[this.circle(d)] + e, h), g = this.circle(d), this.onslide(g)) : this.options.continuous ? (this.move(this.circle(g - 1), -i, h), this.move(g, 0, h), this.move(this.circle(g + 1), i, h)) : (g && this.move(g - 1, -i, h), this.move(g, 0, h), g < this.num - 1 && this.move(g + 1, i, h))
        },
        ontouchcancel: function (a) {
            this.touchStart && (this.ontouchend(a), delete this.touchStart)
        },
        ontransitionend: function (a) {
            var b = this.slides[this.index];
            a && b !== a.target || (this.interval && this.play(), this.setTimeout(this.options.onslideend, [this.index, b]))
        },
        oncomplete: function (b) {
            var c, d = b.target || b.srcElement, e = d && d.parentNode;
            d && e && (c = this.getNodeIndex(e), a(e).removeClass(this.options.slideLoadingClass), "error" === b.type ? (a(e).addClass(this.options.slideErrorClass), this.elements[c] = 3) : this.elements[c] = 2, d.clientHeight > this.container[0].clientHeight && (d.style.maxHeight = this.container[0].clientHeight), this.interval && this.slides[this.index] === e && this.play(), this.setTimeout(this.options.onslidecomplete, [c, e]))
        },
        onload: function (a) {
            this.oncomplete(a)
        },
        onerror: function (a) {
            this.oncomplete(a)
        },
        onkeydown: function (a) {
            switch (a.which || a.keyCode) {
                case 13:
                    this.options.toggleControlsOnReturn && (this.preventDefault(a), this.toggleControls());
                    break;
                case 27:
                    this.options.closeOnEscape && this.close();
                    break;
                case 32:
                    this.options.toggleSlideshowOnSpace && (this.preventDefault(a), this.toggleSlideshow());
                    break;
                case 37:
                    this.options.enableKeyboardNavigation && (this.preventDefault(a), this.prev());
                    break;
                case 39:
                    this.options.enableKeyboardNavigation && (this.preventDefault(a), this.next())
            }
        },
        handleClick: function (b) {
            var c = this.options, d = b.target || b.srcElement, e = d.parentNode, f = function (b) {
                return a(d).hasClass(b) || a(e).hasClass(b)
            };
            f(c.toggleClass) ? (this.preventDefault(b), this.toggleControls()) : f(c.prevClass) ? (this.preventDefault(b), this.prev()) : f(c.nextClass) ? (this.preventDefault(b), this.next()) : f(c.closeClass) ? (this.preventDefault(b), this.close()) : f(c.playPauseClass) ? (this.preventDefault(b), this.toggleSlideshow()) : e === this.slidesContainer[0] ? (this.preventDefault(b), c.closeOnSlideClick ? this.close() : this.toggleControls()) : e.parentNode && e.parentNode === this.slidesContainer[0] && (this.preventDefault(b), this.toggleControls())
        },
        onclick: function (a) {
            return this.options.emulateTouchEvents && this.touchDelta && (Math.abs(this.touchDelta.x) > 20 || Math.abs(this.touchDelta.y) > 20) ? void delete this.touchDelta : this.handleClick(a)
        },
        updateEdgeClasses: function (a) {
            a ? this.container.removeClass(this.options.leftEdgeClass) : this.container.addClass(this.options.leftEdgeClass), a === this.num - 1 ? this.container.addClass(this.options.rightEdgeClass) : this.container.removeClass(this.options.rightEdgeClass)
        },
        handleSlide: function (a) {
            this.options.continuous || this.updateEdgeClasses(a), this.loadElements(a), this.options.unloadElements && this.unloadElements(a), this.setTitle(a)
        },
        onslide: function (a) {
            this.index = a, this.handleSlide(a), this.setTimeout(this.options.onslide, [a, this.slides[a]])
        },
        setTitle: function (a) {
            var b = this.slides[a].firstChild.title, c = this.titleElement;
            c.length && (this.titleElement.empty(), b && c[0].appendChild(document.createTextNode(b)))
        },
        setTimeout: function (a, b, c) {
            var d = this;
            return a && window.setTimeout(function () {
                    a.apply(d, b || [])
                }, c || 0)
        },
        imageFactory: function (b, c) {
            var d, e, f, g = this, h = this.imagePrototype.cloneNode(!1), i = b, j = this.options.stretchImages, k = function (b) {
                if (!d) {
                    if (b = {type: b.type, target: e}, !e.parentNode)return g.setTimeout(k, [b]);
                    d = !0, a(h).off("load error", k), j && "load" === b.type && (e.style.background = 'url("' + i + '") center no-repeat', e.style.backgroundSize = j), c(b)
                }
            };
            return "string" != typeof i && (i = this.getItemProperty(b, this.options.urlProperty), f = this.getItemProperty(b, this.options.titleProperty)), j === !0 && (j = "contain"), j = this.support.backgroundSize && this.support.backgroundSize[j] && j, j ? e = this.elementPrototype.cloneNode(!1) : (e = h, h.draggable = !1), f && (e.title = f), a(h).on("load error", k), h.src = i, e
        },
        createElement: function (b, c) {
            var d = b && this.getItemProperty(b, this.options.typeProperty), e = d && this[d.split("/")[0] + "Factory"] || this.imageFactory, f = b && e.call(this, b, c);
            return f || (f = this.elementPrototype.cloneNode(!1), this.setTimeout(c, [{
                type: "error",
                target: f
            }])), a(f).addClass(this.options.slideContentClass), f
        },
        loadElement: function (b) {
            this.elements[b] || (this.slides[b].firstChild ? this.elements[b] = a(this.slides[b]).hasClass(this.options.slideErrorClass) ? 3 : 2 : (this.elements[b] = 1, a(this.slides[b]).addClass(this.options.slideLoadingClass), this.slides[b].appendChild(this.createElement(this.list[b], this.proxyListener))))
        },
        loadElements: function (a) {
            var b, c = Math.min(this.num, 2 * this.options.preloadRange + 1), d = a;
            for (b = 0; c > b; b += 1)d += b * (b % 2 === 0 ? -1 : 1), d = this.circle(d), this.loadElement(d)
        },
        unloadElements: function (a) {
            var b, c, d;
            for (b in this.elements)this.elements.hasOwnProperty(b) && (d = Math.abs(a - b), d > this.options.preloadRange && d + this.options.preloadRange < this.num && (c = this.slides[b], c.removeChild(c.firstChild), delete this.elements[b]))
        },
        addSlide: function (a) {
            var b = this.slidePrototype.cloneNode(!1);
            b.setAttribute("data-index", a), this.slidesContainer[0].appendChild(b), this.slides.push(b)
        },
        positionSlide: function (a) {
            var b = this.slides[a];
            b.style.width = this.slideWidth + "px", this.support.transform && (b.style.left = a * -this.slideWidth + "px", this.move(a, this.index > a ? -this.slideWidth : this.index < a ? this.slideWidth : 0, 0))
        },
        initSlides: function (b) {
            var c, d;
            for (b || (this.positions = [], this.positions.length = this.num, this.elements = {}, this.imagePrototype = document.createElement("img"), this.elementPrototype = document.createElement("div"), this.slidePrototype = document.createElement("div"), a(this.slidePrototype).addClass(this.options.slideClass), this.slides = this.slidesContainer[0].children, c = this.options.clearSlides || this.slides.length !== this.num), this.slideWidth = this.container[0].offsetWidth, this.slideHeight = this.container[0].offsetHeight, this.slidesContainer[0].style.width = this.num * this.slideWidth + "px", c && this.resetSlides(), d = 0; d < this.num; d += 1)c && this.addSlide(d), this.positionSlide(d);
            this.options.continuous && this.support.transform && (this.move(this.circle(this.index - 1), -this.slideWidth, 0), this.move(this.circle(this.index + 1), this.slideWidth, 0)), this.support.transform || (this.slidesContainer[0].style.left = this.index * -this.slideWidth + "px")
        },
        toggleControls: function () {
            var a = this.options.controlsClass;
            this.container.hasClass(a) ? this.container.removeClass(a) : this.container.addClass(a)
        },
        toggleSlideshow: function () {
            this.interval ? this.pause() : this.play()
        },
        getNodeIndex: function (a) {
            return parseInt(a.getAttribute("data-index"), 10)
        },
        getNestedProperty: function (a, b) {
            return b.replace(/\[(?:'([^']+)'|"([^"]+)"|(\d+))\]|(?:(?:^|\.)([^\.\[]+))/g, function (b, c, d, e, f) {
                var g = f || c || d || e && parseInt(e, 10);
                b && a && (a = a[g])
            }), a
        },
        getDataProperty: function (b, c) {
            if (b.getAttribute) {
                var d = b.getAttribute("data-" + c.replace(/([A-Z])/g, "-$1").toLowerCase());
                if ("string" == typeof d) {
                    if (/^(true|false|null|-?\d+(\.\d+)?|\{[\s\S]*\}|\[[\s\S]*\])$/.test(d))try {
                        return a.parseJSON(d)
                    } catch (e) {
                    }
                    return d
                }
            }
        },
        getItemProperty: function (a, b) {
            var c = a[b];
            return void 0 === c && (c = this.getDataProperty(a, b), void 0 === c && (c = this.getNestedProperty(a, b))), c
        },
        initStartIndex: function () {
            var a, b = this.options.index, c = this.options.urlProperty;
            if (b && "number" != typeof b)for (a = 0; a < this.num; a += 1)if (this.list[a] === b || this.getItemProperty(this.list[a], c) === this.getItemProperty(b, c)) {
                b = a;
                break
            }
            this.index = this.circle(parseInt(b, 10) || 0)
        },
        initEventListeners: function () {
            var b = this, c = this.slidesContainer, d = function (a) {
                var c = b.support.transition && b.support.transition.end === a.type ? "transitionend" : a.type;
                b["on" + c](a)
            };
            a(window).on("resize", d), a(document.body).on("keydown", d), this.container.on("click", d), this.support.touch ? c.on("touchstart touchmove touchend touchcancel", d) : this.options.emulateTouchEvents && this.support.transition && c.on("mousedown mousemove mouseup mouseout", d), this.support.transition && c.on(this.support.transition.end, d), this.proxyListener = d
        },
        destroyEventListeners: function () {
            var b = this.slidesContainer, c = this.proxyListener;
            a(window).off("resize", c), a(document.body).off("keydown", c), this.container.off("click", c), this.support.touch ? b.off("touchstart touchmove touchend touchcancel", c) : this.options.emulateTouchEvents && this.support.transition && b.off("mousedown mousemove mouseup mouseout", c), this.support.transition && b.off(this.support.transition.end, c)
        },
        handleOpen: function () {
            this.options.onopened && this.options.onopened.call(this)
        },
        initWidget: function () {
            var b = this, c = function (a) {
                a.target === b.container[0] && (b.container.off(b.support.transition.end, c), b.handleOpen())
            };
            return this.container = a(this.options.container), this.container.length ? (this.slidesContainer = this.container.find(this.options.slidesContainer).first(), this.slidesContainer.length ? (this.titleElement = this.container.find(this.options.titleElement).first(), 1 === this.num && this.container.addClass(this.options.singleClass), this.options.onopen && this.options.onopen.call(this), this.support.transition && this.options.displayTransition ? this.container.on(this.support.transition.end, c) : this.handleOpen(), this.options.hidePageScrollbars && (this.bodyOverflowStyle = document.body.style.overflow, document.body.style.overflow = "hidden"), this.container[0].style.display = "block", this.initSlides(), void this.container.addClass(this.options.displayClass)) : (this.console.log("blueimp Gallery: Slides container not found.", this.options.slidesContainer), !1)) : (this.console.log("blueimp Gallery: Widget container not found.", this.options.container), !1)
        },
        initOptions: function (b) {
            this.options = a.extend({}, this.options), (b && b.carousel || this.options.carousel && (!b || b.carousel !== !1)) && a.extend(this.options, this.carouselOptions), a.extend(this.options, b), this.num < 3 && (this.options.continuous = this.options.continuous ? null : !1), this.support.transition || (this.options.emulateTouchEvents = !1), this.options.event && this.preventDefault(this.options.event)
        }
    }), b
}), function (a) {
    "use strict";
    "function" == typeof define && define.amd ? define(["./blueimp-helper", "./blueimp-gallery"], a) : a(window.blueimp.helper || window.jQuery, window.blueimp.Gallery)
}(function (a, b) {
    "use strict";
    a.extend(b.prototype.options, {fullScreen: !1});
    var c = b.prototype.initialize, d = b.prototype.close;
    return a.extend(b.prototype, {
        getFullScreenElement: function () {
            return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement
        }, requestFullScreen: function (a) {
            a.requestFullscreen ? a.requestFullscreen() : a.webkitRequestFullscreen ? a.webkitRequestFullscreen() : a.mozRequestFullScreen ? a.mozRequestFullScreen() : a.msRequestFullscreen && a.msRequestFullscreen()
        }, exitFullScreen: function () {
            document.exitFullscreen ? document.exitFullscreen() : document.webkitCancelFullScreen ? document.webkitCancelFullScreen() : document.mozCancelFullScreen ? document.mozCancelFullScreen() : document.msExitFullscreen && document.msExitFullscreen()
        }, initialize: function () {
            c.call(this), this.options.fullScreen && !this.getFullScreenElement() && this.requestFullScreen(this.container[0])
        }, close: function () {
            this.getFullScreenElement() === this.container[0] && this.exitFullScreen(), d.call(this)
        }
    }), b
}), function (a) {
    "use strict";
    "function" == typeof define && define.amd ? define(["./blueimp-helper", "./blueimp-gallery"], a) : a(window.blueimp.helper || window.jQuery, window.blueimp.Gallery)
}(function (a, b) {
    "use strict";
    a.extend(b.prototype.options, {
        indicatorContainer: "ol",
        activeIndicatorClass: "active",
        thumbnailProperty: "thumbnail",
        thumbnailIndicators: !0
    });
    var c = b.prototype.initSlides, d = b.prototype.addSlide, e = b.prototype.resetSlides, f = b.prototype.handleClick, g = b.prototype.handleSlide, h = b.prototype.handleClose;
    return a.extend(b.prototype, {
        createIndicator: function (b) {
            var c, d, e = this.indicatorPrototype.cloneNode(!1), f = this.getItemProperty(b, this.options.titleProperty), g = this.options.thumbnailProperty;
            return this.options.thumbnailIndicators && (d = b.getElementsByTagName && a(b).find("img")[0], d ? c = d.src : g && (c = this.getItemProperty(b, g)), c && (e.style.backgroundImage = 'url("' + c + '")')), f && (e.title = f), e
        }, addIndicator: function (a) {
            if (this.indicatorContainer.length) {
                var b = this.createIndicator(this.list[a]);
                b.setAttribute("data-index", a), this.indicatorContainer[0].appendChild(b), this.indicators.push(b)
            }
        }, setActiveIndicator: function (b) {
            this.indicators && (this.activeIndicator && this.activeIndicator.removeClass(this.options.activeIndicatorClass), this.activeIndicator = a(this.indicators[b]), this.activeIndicator.addClass(this.options.activeIndicatorClass))
        }, initSlides: function (a) {
            a || (this.indicatorContainer = this.container.find(this.options.indicatorContainer), this.indicatorContainer.length && (this.indicatorPrototype = document.createElement("li"), this.indicators = this.indicatorContainer[0].children)), c.call(this, a)
        }, addSlide: function (a) {
            d.call(this, a), this.addIndicator(a)
        }, resetSlides: function () {
            e.call(this), this.indicatorContainer.empty(), this.indicators = []
        }, handleClick: function (a) {
            var b = a.target || a.srcElement, c = b.parentNode;
            if (c === this.indicatorContainer[0])this.preventDefault(a), this.slide(this.getNodeIndex(b)); else {
                if (c.parentNode !== this.indicatorContainer[0])return f.call(this, a);
                this.preventDefault(a), this.slide(this.getNodeIndex(c))
            }
        }, handleSlide: function (a) {
            g.call(this, a), this.setActiveIndicator(a)
        }, handleClose: function () {
            this.activeIndicator && this.activeIndicator.removeClass(this.options.activeIndicatorClass), h.call(this)
        }
    }), b
}), function (a) {
    "use strict";
    "function" == typeof define && define.amd ? define(["./blueimp-helper", "./blueimp-gallery"], a) : a(window.blueimp.helper || window.jQuery, window.blueimp.Gallery)
}(function (a, b) {
    "use strict";
    a.extend(b.prototype.options, {
        videoContentClass: "video-content",
        videoLoadingClass: "video-loading",
        videoPlayingClass: "video-playing",
        videoPosterProperty: "poster",
        videoSourcesProperty: "sources"
    });
    var c = b.prototype.handleSlide;
    return a.extend(b.prototype, {
        handleSlide: function (a) {
            c.call(this, a), this.playingVideo && this.playingVideo.pause()
        }, videoFactory: function (b, c, d) {
            var e, f, g, h, i, j = this, k = this.options, l = this.elementPrototype.cloneNode(!1), m = a(l), n = [{
                type: "error",
                target: l
            }], o = d || document.createElement("video"), p = this.getItemProperty(b, k.urlProperty), q = this.getItemProperty(b, k.typeProperty), r = this.getItemProperty(b, k.titleProperty), s = this.getItemProperty(b, k.videoPosterProperty), t = this.getItemProperty(b, k.videoSourcesProperty);
            if (m.addClass(k.videoContentClass), r && (l.title = r), o.canPlayType)if (p && q && o.canPlayType(q))o.src = p; else for (; t && t.length;)if (f = t.shift(), p = this.getItemProperty(f, k.urlProperty), q = this.getItemProperty(f, k.typeProperty), p && q && o.canPlayType(q)) {
                o.src = p;
                break
            }
            return s && (o.poster = s, e = this.imagePrototype.cloneNode(!1), a(e).addClass(k.toggleClass), e.src = s, e.draggable = !1, l.appendChild(e)), g = document.createElement("a"), g.setAttribute("target", "_blank"), d || g.setAttribute("download", r), g.href = p, o.src && (o.controls = !0, (d || a(o)).on("error", function () {
                j.setTimeout(c, n)
            }).on("pause", function () {
                h = !1, m.removeClass(j.options.videoLoadingClass).removeClass(j.options.videoPlayingClass), i && j.container.addClass(j.options.controlsClass), delete j.playingVideo, j.interval && j.play()
            }).on("playing", function () {
                h = !1, m.removeClass(j.options.videoLoadingClass).addClass(j.options.videoPlayingClass), j.container.hasClass(j.options.controlsClass) ? (i = !0, j.container.removeClass(j.options.controlsClass)) : i = !1
            }).on("play", function () {
                window.clearTimeout(j.timeout), h = !0, m.addClass(j.options.videoLoadingClass), j.playingVideo = o
            }), a(g).on("click", function (a) {
                j.preventDefault(a), h ? o.pause() : o.play()
            }), l.appendChild(d && d.element || o)), l.appendChild(g), this.setTimeout(c, [{
                type: "load",
                target: l
            }]), l
        }
    }), b
}), function (a) {
    "use strict";
    "function" == typeof define && define.amd ? define(["./blueimp-helper", "./blueimp-gallery-video"], a) : a(window.blueimp.helper || window.jQuery, window.blueimp.Gallery)
}(function (a, b) {
    "use strict";
    if (!window.postMessage)return b;
    a.extend(b.prototype.options, {
        vimeoVideoIdProperty: "vimeo",
        vimeoPlayerUrl: "//player.vimeo.com/video/VIDEO_ID?api=1&player_id=PLAYER_ID",
        vimeoPlayerIdPrefix: "vimeo-player-",
        vimeoClickToPlay: !0
    });
    var c = b.prototype.textFactory || b.prototype.imageFactory, d = function (a, b, c, d) {
        this.url = a, this.videoId = b, this.playerId = c, this.clickToPlay = d, this.element = document.createElement("div"), this.listeners = {}
    }, e = 0;
    return a.extend(d.prototype, {
        canPlayType: function () {
            return !0
        }, on: function (a, b) {
            return this.listeners[a] = b, this
        }, loadAPI: function () {
            for (var b, c, d = this, e = "//" + ("https" === location.protocol ? "secure-" : "") + "a.vimeocdn.com/js/froogaloop2.min.js", f = document.getElementsByTagName("script"), g = f.length, h = function () {
                !c && d.playOnReady && d.play(), c = !0
            }; g;)if (g -= 1, f[g].src === e) {
                b = f[g];
                break
            }
            b || (b = document.createElement("script"), b.src = e), a(b).on("load", h), f[0].parentNode.insertBefore(b, f[0]), /loaded|complete/.test(b.readyState) && h()
        }, onReady: function () {
            var a = this;
            this.ready = !0, this.player.addEvent("play", function () {
                a.hasPlayed = !0, a.onPlaying()
            }), this.player.addEvent("pause", function () {
                a.onPause()
            }), this.player.addEvent("finish", function () {
                a.onPause()
            }), this.playOnReady && this.play()
        }, onPlaying: function () {
            this.playStatus < 2 && (this.listeners.playing(), this.playStatus = 2)
        }, onPause: function () {
            this.listeners.pause(), delete this.playStatus
        }, insertIframe: function () {
            var a = document.createElement("iframe");
            a.src = this.url.replace("VIDEO_ID", this.videoId).replace("PLAYER_ID", this.playerId), a.id = this.playerId, this.element.parentNode.replaceChild(a, this.element), this.element = a
        }, play: function () {
            var a = this;
            this.playStatus || (this.listeners.play(), this.playStatus = 1), this.ready ? !this.hasPlayed && (this.clickToPlay || window.navigator && /iP(hone|od|ad)/.test(window.navigator.platform)) ? this.onPlaying() : this.player.api("play") : (this.playOnReady = !0, window.$f ? this.player || (this.insertIframe(), this.player = $f(this.element), this.player.addEvent("ready", function () {
                a.onReady()
            })) : this.loadAPI())
        }, pause: function () {
            this.ready ? this.player.api("pause") : this.playStatus && (delete this.playOnReady, this.listeners.pause(), delete this.playStatus)
        }
    }), a.extend(b.prototype, {
        VimeoPlayer: d, textFactory: function (a, b) {
            var f = this.options, g = this.getItemProperty(a, f.vimeoVideoIdProperty);
            return g ? (void 0 === this.getItemProperty(a, f.urlProperty) && (a[f.urlProperty] = "//vimeo.com/" + g), e += 1, this.videoFactory(a, b, new d(f.vimeoPlayerUrl, g, f.vimeoPlayerIdPrefix + e, f.vimeoClickToPlay))) : c.call(this, a, b)
        }
    }), b
}), function (a) {
    "use strict";
    "function" == typeof define && define.amd ? define(["./blueimp-helper", "./blueimp-gallery-video"], a) : a(window.blueimp.helper || window.jQuery, window.blueimp.Gallery)
}(function (a, b) {
    "use strict";
    if (!window.postMessage)return b;
    a.extend(b.prototype.options, {
        youTubeVideoIdProperty: "youtube",
        youTubePlayerVars: {wmode: "transparent"},
        youTubeClickToPlay: !0
    });
    var c = b.prototype.textFactory || b.prototype.imageFactory, d = function (a, b, c) {
        this.videoId = a, this.playerVars = b, this.clickToPlay = c, this.element = document.createElement("div"), this.listeners = {}
    };
    return a.extend(d.prototype, {
        canPlayType: function () {
            return !0
        }, on: function (a, b) {
            return this.listeners[a] = b, this
        }, loadAPI: function () {
            var a, b = this, c = window.onYouTubeIframeAPIReady, d = "//www.youtube.com/iframe_api", e = document.getElementsByTagName("script"), f = e.length;
            for (window.onYouTubeIframeAPIReady = function () {
                c && c.apply(this), b.playOnReady && b.play()
            }; f;)if (f -= 1, e[f].src === d)return;
            a = document.createElement("script"), a.src = d, e[0].parentNode.insertBefore(a, e[0])
        }, onReady: function () {
            this.ready = !0, this.playOnReady && this.play()
        }, onPlaying: function () {
            this.playStatus < 2 && (this.listeners.playing(), this.playStatus = 2)
        }, onPause: function () {
            b.prototype.setTimeout.call(this, this.checkSeek, null, 2e3)
        }, checkSeek: function () {
            (this.stateChange === YT.PlayerState.PAUSED || this.stateChange === YT.PlayerState.ENDED) && (this.listeners.pause(), delete this.playStatus)
        }, onStateChange: function (a) {
            switch (a.data) {
                case YT.PlayerState.PLAYING:
                    this.hasPlayed = !0, this.onPlaying();
                    break;
                case YT.PlayerState.PAUSED:
                case YT.PlayerState.ENDED:
                    this.onPause()
            }
            this.stateChange = a.data
        }, onError: function (a) {
            this.listeners.error(a)
        }, play: function () {
            var a = this;
            this.playStatus || (this.listeners.play(), this.playStatus = 1), this.ready ? !this.hasPlayed && (this.clickToPlay || window.navigator && /iP(hone|od|ad)/.test(window.navigator.platform)) ? this.onPlaying() : this.player.playVideo() : (this.playOnReady = !0, window.YT && YT.Player ? this.player || (this.player = new YT.Player(this.element, {
                videoId: this.videoId,
                playerVars: this.playerVars,
                events: {
                    onReady: function () {
                        a.onReady()
                    }, onStateChange: function (b) {
                        a.onStateChange(b)
                    }, onError: function (b) {
                        a.onError(b)
                    }
                }
            })) : this.loadAPI())
        }, pause: function () {
            this.ready ? this.player.pauseVideo() : this.playStatus && (delete this.playOnReady, this.listeners.pause(), delete this.playStatus)
        }
    }), a.extend(b.prototype, {
        YouTubePlayer: d, textFactory: function (a, b) {
            var e = this.options, f = this.getItemProperty(a, e.youTubeVideoIdProperty);
            return f ? (void 0 === this.getItemProperty(a, e.urlProperty) && (a[e.urlProperty] = "//www.youtube.com/watch?v=" + f), void 0 === this.getItemProperty(a, e.videoPosterProperty) && (a[e.videoPosterProperty] = "//img.youtube.com/vi/" + f + "/maxresdefault.jpg"), this.videoFactory(a, b, new d(f, e.youTubePlayerVars, e.youTubeClickToPlay))) : c.call(this, a, b)
        }
    }), b
}), function (a) {
    "use strict";
    "function" == typeof define && define.amd ? define(["jquery", "./blueimp-gallery"], a) : a(window.jQuery, window.blueimp.Gallery)
}(function (a, b) {
    "use strict";
    a(document).on("click", "[data-gallery]", function (c) {
        var d = a(this).data("gallery"), e = a(d), f = e.length && e || a(b.prototype.options.container), g = {
            onopen: function () {
                f.data("gallery", this).trigger("open")
            }, onopened: function () {
                f.trigger("opened")
            }, onslide: function () {
                f.trigger("slide", arguments)
            }, onslideend: function () {
                f.trigger("slideend", arguments)
            }, onslidecomplete: function () {
                f.trigger("slidecomplete", arguments)
            }, onclose: function () {
                f.trigger("close")
            }, onclosed: function () {
                f.trigger("closed").removeData("gallery")
            }
        }, h = a.extend(f.data(), {container: f[0], index: this, event: c}, g), i = a('[data-gallery="' + d + '"]');
        return h.filter && (i = i.filter(h.filter)), new b(i, h)
    })
});
});

require.register("serandomps~vehicles-findone@master", function (exports, module) {
var dust = require('serandomps~dust@master')();
var serand = require('serandomps~serand@master');
var utils = require('serandomps~autos-utils@master');

require('serandomps~gallery@master');

var user;

dust.loadSource(dust.compile(require('serandomps~vehicles-findone@master/template.html'), 'vehicles-findone'));

module.exports = function (sandbox, fn, options) {
    $.ajax({
        url: '/apis/v/vehicles/' + options.id,
        headers: {
            'X-Host': 'autos.serandives.com'
        },
        dataType: 'json',
        success: function (data) {
            dust.render('vehicles-findone', utils.cdn800x450(data), function (err, out) {
                sandbox.append(out);
                if (!fn) {
                    return;
                }
                fn(false, {
                    clean: function () {
                        $('.model-vehicles-findone', sandbox).remove();
                    },
                    done: function () {
                        var i;
                        var o = [];
                        var photos = data.photos;
                        var length = photos.length;
                        var photo;
                        for (i = 0; i < length; i++) {
                            photo = photos[i];
                            o.push(photo.url);
                        }
                        blueimp.Gallery(o, {
                            container: $('.blueimp-gallery-carousel', sandbox),
                            carousel: true
                        });
                    }
                });
            });
        },
        error: function () {
            fn(true, function () {

            });
        }
    });
};

serand.on('user', 'ready', function (usr) {
    user = usr;
});

serand.on('user', 'logged in', function (usr) {
    user = usr;
});

serand.on('user', 'logged out', function (usr) {
    user = null;
});

});

require.define("serandomps~vehicles-findone@master/template.html", "<div class=\"vehicles-findone row\">\n    <div class=\"col-md-6\">\n        <div class=\"blueimp-gallery blueimp-gallery-carousel\">\n            <div class=\"slides\"></div>\n            <h3 class=\"title\"></h3>\n            <a class=\"prev\">‹</a>\n            <a class=\"next\">›</a>\n            <a class=\"play-pause\"></a>\n            <ol class=\"indicator\"></ol>\n        </div>\n    </div>\n    <div class=\"col-md-6\">\n        <table class=\"table table-striped table-bordered\">\n            <tbody>\n            <tr>\n                <td>Make</td>\n                <td>{make}</td>\n            </tr>\n            <tr>\n                <td>Model</td>\n                <td>{model}</td>\n            </tr>\n            <tr>\n                <td>Year</td>\n                <td>{year}</td>\n            </tr>\n            <tr>\n                <td>Color</td>\n                <td>{color}</td>\n            </tr>\n            <tr>\n                <td>Condition</td>\n                <td>{condition}</td>\n            </tr>\n            <tr>\n                <td>Mileage</td>\n                <td>{mileage}</td>\n            </tr>\n            <tr>\n                <td>Transmission</td>\n                <td>{transmission}</td>\n            </tr>\n            <tr>\n                <td>Price</td>\n                <td>{price}</td>\n            </tr>\n            <tr>\n                <td>Description</td>\n                <td>{description}</td>\n            </tr>\n            </tbody>\n        </table>\n    </div>\n</div>");

require.register("serandomps~vehicles-search@master", function (exports, module) {
var dust = require('serandomps~dust@master')();
var serand = require('serandomps~serand@master');

dust.loadSource(dust.compile(require('serandomps~vehicles-search@master/template.html'), 'vehicles-search'));

var query = function (options) {
    var name;
    var value;
    var q = '';
    for (name in options) {
        if (options.hasOwnProperty(name)) {
            value = options[name];
            if (!value) {
                continue;
            }
            q += q ? '&' : '';
            q += name + '=' + value;
        }
    }
    return q ? '?' + q : '';
};

var select = function (el, val) {
    return val ? el.val(val) : el;
};

module.exports = function (sandbox, fn, options) {
    options = options || {};
    dust.render('vehicles-search', {}, function (err, out) {
        if (err) {
            return;
        }
        var elem = sandbox.append(out);
        var selections = {};
        select($('.make', elem), options.make).selecter({
            callback: function (val) {
                selections.make = val;
            }
        });

        select($('.model', elem), options.model).selecter({
            callback: function (val) {
                selections.model = val;
            }
        });

        $('.search', elem).click(function () {
            serand.redirect('/vehicles' + query({
                make: selections.make,
                model: selections.model
            }));
        });

        fn(false, function () {
            $('.model-vehicles-search', sandbox).remove();
        });
    });
};

});

require.define("serandomps~vehicles-search@master/template.html", "<div id=\"serand-vehicles-search\" class=\"vehicles-search panel-group\" role=\"tablist\" aria-multiselectable=\"true\">\n    <div class=\"panel panel-default\">\n        <div class=\"panel-heading\" role=\"tab\">\n            <h3 class=\"panel-title\"><a role=\"button\" data-toggle=\"collapse\"\n                                       href=\"#serand-vehicles-search-one\" aria-expanded=\"true\" aria-controls=\"collapseOne\">Search</a>\n            </h3>\n        </div>\n        <div id=\"serand-vehicles-search-one\" class=\"panel-collapse collapse in\" role=\"tabpanel\"\n             aria-labelledby=\"headingOne\">\n            <div class=\"panel-body\">\n                <form role=\"form\">\n                    <div class=\"form-group\">\n                        <label>Make</label>\n                        <select class=\"form-control make\">\n                            <option value=\"\">All Makes</option>\n                            <option>Honda</option>\n                            <option>Toyota</option>\n                            <option>Mazda</option>\n                            <option>Nissan</option>\n                            <option>Suzzuki</option>\n                        </select>\n                    </div>\n                    <div class=\"form-group\">\n                        <label>Model</label>\n                        <select class=\"form-control model\">\n                            <option value=\"\">All Models</option>\n                            <option>Vezel</option>\n                            <option>Insight</option>\n                            <option>Fit</option>\n                            <option>Civic</option>\n                            <option>CR-V</option>\n                        </select>\n                    </div>\n                    <div class=\"form-group\">\n                        <input type=\"text\" class=\"form-control\" placeholder=\"Keyword (Optional)\">\n                    </div>\n                    <div class=\"form-group price\">\n                        <label>Price</label>\n\n                        <div class=\"row\">\n                            <div class=\"col-md-6\">\n                                <input type=\"text\" class=\"form-control\" placeholder=\"Low\">\n                            </div>\n                            <div class=\"col-md-6\">\n                                <input type=\"text\" class=\"form-control\" placeholder=\"High\">\n                            </div>\n                        </div>\n                    </div>\n                    <div class=\"form-group price\">\n                        <label>Year</label>\n\n                        <div class=\"row\">\n                            <div class=\"col-md-6\">\n                                <input type=\"text\" class=\"form-control\" placeholder=\"From\">\n                            </div>\n                            <div class=\"col-md-6\">\n                                <input type=\"text\" class=\"form-control\" placeholder=\"To\">\n                            </div>\n                        </div>\n                    </div>\n                    <div class=\"form-group\">\n                        <label>Condition</label>\n\n                        <div class=\"options\">\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option1\">Brand New\n                            </label>\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option2\">Unregistered\n                            </label>\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option3\">Used\n                            </label>\n                        </div>\n                    </div>\n                    <div class=\"form-group\">\n                        <label>Transmission</label>\n\n                        <div class=\"options\">\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option1\">Automatic\n                            </label>\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option2\">Manual\n                            </label>\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option3\">Manumatic\n                            </label>\n                        </div>\n                    </div>\n                    <div class=\"form-group\">\n                        <label>Fuel</label>\n\n                        <div class=\"options\">\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option1\">Petrol\n                            </label>\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option2\">Diesel\n                            </label>\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option3\">Hybrid\n                            </label>\n                        </div>\n                    </div>\n                    <button type=\"button\" class=\"btn btn-default search\">Search</button>\n                </form>\n            </div>\n        </div>\n    </div>\n    <div class=\"panel panel-default\">\n        <div class=\"panel-heading\" role=\"tab\">\n            <h3 class=\"panel-title\"><a role=\"button\" data-toggle=\"collapse\"\n                                       href=\"#serand-vehicles-search-condition\" aria-expanded=\"true\"\n                                       aria-controls=\"collapseOne\">Condition</a></h3>\n        </div>\n        <div id=\"serand-vehicles-search-condition\" class=\"panel-collapse collapse in\" role=\"tabpanel\"\n             aria-labelledby=\"headingOne\">\n            <div class=\"panel-body\">\n                <form role=\"form\">\n                    <div class=\"form-group\">\n                        <div class=\"options\">\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option1\">Brand New\n                            </label>\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option2\">Unregistered\n                            </label>\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option3\">Used\n                            </label>\n                        </div>\n                    </div>\n                </form>\n            </div>\n        </div>\n    </div>\n    <div class=\"panel panel-default\">\n        <div class=\"panel-heading\" role=\"tab\">\n            <h3 class=\"panel-title\"><a role=\"button\" data-toggle=\"collapse\"\n                                       href=\"#serand-vehicles-search-price\" aria-expanded=\"true\"\n                                       aria-controls=\"collapseOne\">Price</a></h3>\n        </div>\n        <div id=\"serand-vehicles-search-price\" class=\"panel-collapse collapse in\" role=\"tabpanel\"\n             aria-labelledby=\"headingOne\">\n            <div class=\"panel-body\">\n                <form role=\"form\">\n                    <div class=\"form-group price\">\n                        <div class=\"row\">\n                            <div class=\"col-md-6\">\n                                <input type=\"text\" class=\"form-control\" placeholder=\"Low\">\n                            </div>\n                            <div class=\"col-md-6\">\n                                <input type=\"text\" class=\"form-control\" placeholder=\"High\">\n                            </div>\n                        </div>\n                    </div>\n                </form>\n            </div>\n        </div>\n    </div>\n    <div class=\"panel panel-default\">\n        <div class=\"panel-heading\" role=\"tab\">\n            <h3 class=\"panel-title\"><a role=\"button\" data-toggle=\"collapse\"\n                                       href=\"#serand-vehicles-search-transmission\" aria-expanded=\"true\"\n                                       aria-controls=\"collapseOne\">Transmission</a></h3>\n        </div>\n        <div id=\"serand-vehicles-search-transmission\" class=\"panel-collapse collapse in\" role=\"tabpanel\"\n             aria-labelledby=\"headingOne\">\n            <div class=\"panel-body\">\n                <form role=\"form\">\n                    <div class=\"form-group\">\n                        <div class=\"options\">\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option1\">Automatic\n                            </label>\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option2\">Manual\n                            </label>\n                            <label class=\"checkbox\">\n                                <input type=\"checkbox\" value=\"option3\">Manumatic\n                            </label>\n                        </div>\n                    </div>\n                </form>\n            </div>\n        </div>\n    </div>\n</div>\n");

require.register("serandomps~vehicles-create@master", function (exports, module) {
var dust = require('serandomps~dust@master')();
var serand = require('serandomps~serand@master');
var utils = require('serandomps~autos-utils@master');

var cdn = utils.cdn();

var AUTO_API = '/apis/v/vehicles';

var upload = function (data, files, next, elem) {
    $('.fileupload', elem).fileupload('send', {
        files: files,
        formData: {
            data: JSON.stringify(data)
        }
    }).success(function (data, status, xhr) {
        next();
    }).error(function (xhr, status, err) {
        next(err);
    }).complete(function (data, status, xhr) {
    });
};

var send = function (data, done, update) {
    $.ajax({
        url: AUTO_API + (update ? '/' + data.id : ''),
        type: update ? 'PUT' : 'POST',
        headers: {
            'X-Host': 'autos.serandives.com'
        },
        contentType: 'multipart/form-data',
        dataType: 'json',
        data: {
            data: JSON.stringify(data)
        },
        success: function (data) {
            done();
        },
        error: function (xhr, status, err) {
            done(err);
        }
    });
};

var remove = function (id, done) {
    $.ajax({
        url: AUTO_API + '/' + id,
        type: 'DELETE',
        headers: {
            'X-Host': 'autos.serandives.com'
        },
        success: function (data) {
            done();
        },
        error: function (xhr, status, err) {
            done(err);
        }
    });
};

dust.loadSource(dust.compile(require('serandomps~vehicles-create@master/preview.html'), 'vehicles-create-preview'));
dust.loadSource(dust.compile(require('serandomps~vehicles-create@master/template.html'), 'vehicles-create'));

var render = function (sandbox, fn, data) {
    var update = data._.update;
    var id = data.id;
    var existing = data.photos || [];
    dust.render('vehicles-create', utils.cdn288x162(data), function (err, out) {
        if (err) {
            return;
        }
        var elem = sandbox.append(out);
        var pending = [];
        var el = $('.make', elem);
        $('select', el).selecter({
            label: el.data('value') || 'Make'
        });
        el = $('.model', elem);
        $('select', el).selecter({
            label: el.data('value') || 'Model'
        });
        el = $('.year', elem);
        $('select', el).selecter({
            label: el.data('value') || 'Year'
        });
        $('.fileupload', elem).fileupload({
            url: AUTO_API + (update ? '/' + data.id : ''),
            type: update ? 'PUT' : 'POST',
            headers: {
                'X-Host': 'autos.serandives.com'
            },
            dataType: 'json',
            autoUpload: false,
            acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
            maxFileSize: 5000000, // 5 MB
            // Enable image resizing, except for Android and Opera,
            // which actually support image resizing, but fail to
            // send Blob objects via XHR requests:
            disableImageResize: /Android(?!.*Chrome)|Opera/
                .test(window.navigator.userAgent),
            previewMaxWidth: 180,
            previewMaxHeight: 120,
            previewCrop: true
        }).on('fileuploadadd', function (e, data) {
            data.context = $('<div class="col-md-3 file"></div>');
            $.each(data.files, function (index, file) {
                var length = pending.push(file);
                dust.render('vehicles-create-preview', {
                    name: file.name,
                    index: length - 1
                }, function (err, out) {
                    if (err) {
                        return;
                    }
                    data.context.append(out);
                    $('.files').append(data.context);
                });
            });
        }).on('fileuploadprocessalways', function (e, data) {
            var index = data.index;
            var file = data.files[index];
            var node = $(data.context.children()[index]);
            if (file.preview) {
                $('.thumbnail', data.context).append(file.preview);
            }
            if (file.error) {
                node
                    .append('<br>')
                    .append($('<span class="text-danger"/>').text(file.error));
            }
            /*if (index + 1 === data.files.length) {
             data.context.find('button')
             .text('Upload')
             .prop('disabled', !!data.files.error);
             }*/
        }).on('fileuploadprogressall', function (e, data) {
            /*var progress = parseInt(data.loaded / data.total * 100, 10);
             $('#progress .progress-bar').css(
             'width',
             progress + '%'
             );*/
        }).on('fileuploaddone', function (e, data) {
            /*$.each(data.result.files, function (index, file) {
             if (file.url) {
             var link = $('<a>')
             .attr('target', '_blank')
             .prop('href', file.url);
             $(data.context.children()[index])
             .wrap(link);
             } else if (file.error) {
             var error = $('<span class="text-danger"/>').text(file.error);
             $(data.context.children()[index])
             .append('<br>')
             .append(error);
             }
             });*/
        }).on('fileuploadfail', function (e, data) {
            /*$.each(data.files, function (index) {
             var error = $('<span class="text-danger"/>').text('File upload failed.');
             $(data.context.children()[index])
             .append('<br>')
             .append(error);
             });*/
        }).prop('disabled', !$.support.fileInput)
            .parent().addClass($.support.fileInput ? undefined : 'disabled');
        $('.add', elem).click(function (e) {
            e.stopPropagation();
            var data = {
                make: $('.make select', elem).val(),
                model: $('.model select', elem).val(),
                year: $('.year select', elem).val(),
                condition: $('.condition input[name=condition]', elem).val(),
                transmission: $('.transmission input[name=transmission]', elem).val(),
                fuel: $('.fuel input[name=fuel]', elem).val(),
                color: $('.color input', elem).val(),
                mileage: $('.mileage input', elem).val(),
                price: $('.price input', elem).val(),
                description: $('.description textarea', elem).val()
            };
            if (update) {
                console.log(existing);
                data.id = id;
                data.photos = existing;
            }
            var done = function (err) {
                console.log('data updated/created successfully');
            };
            pending.length ? upload(data, pending, done, elem) : send(data, done, update);
            return false;
        });
        $('.delete', elem).click(function (e) {
            e.stopPropagation();
            remove(id, function (err) {
                console.log('data deleted successfully');
            });
            return false;
        });
        $(elem).on('click', '.remove-file', function () {
            var el = $(this);
            if (el.hasClass('pending')) {
                pending.splice(el.data('index'), 1);
            } else {
                existing.splice(existing.indexOf(el.data('id')), 1);
            }
            el.closest('.file').remove();
        });
        fn(false, function () {
            $('.model-vehicles-create', sandbox).remove();
        });
    });
};

module.exports = function (sandbox, fn, options) {
    options = options || {};
    var id = options.id;
    if (!id) {
        render(sandbox, fn, {
            _: {}
        });
        return;
    }
    $.ajax({
        url: AUTO_API + '/' + id,
        headers: {
            'X-Host': 'autos.serandives.com'
        },
        dataType: 'json',
        success: function (data) {
            data._ = {
                update: true
            };
            render(sandbox, fn, data);
        },
        error: function () {
            render(sandbox, fn, {});
        }
    });
};
});

require.define("serandomps~vehicles-create@master/template.html", "<div class=\"vehicles-create panel panel-default\">\n    <div class=\"panel-heading\">\n        <h3 class=\"panel-title\">{?_.update}Edit{:else}Add{/_.update} Vehicle</h3>\n    </div>\n    <div class=\"panel-body\">\n        <form role=\"form\" class=\"auto-create\">\n            {#.}\n            <div class=\"form-group make\" data-value=\"{make}\">\n                <!--<label>Make</label>-->\n                <select class=\"form-control\">\n                    <option>Honda</option>\n                    <option>Toyota</option>\n                    <option>Mazda</option>\n                    <option>Nissan</option>\n                    <option>Suzzuki</option>\n                </select>\n            </div>\n            <div class=\"form-group model\" data-value=\"{model}\">\n                <!--<label>Make</label>-->\n                <select class=\"form-control\">\n                    <option>Vezel</option>\n                    <option>Insight</option>\n                    <option>Fit</option>\n                    <option>Civic</option>\n                    <option>CR-V</option>\n                </select>\n            </div>\n            <div class=\"form-group year\" data-value=\"{year}\">\n                <!--<label>Make</label>-->\n                <select class=\"form-control\">\n                    <option>2014</option>\n                    <option>2013</option>\n                    <option>2012</option>\n                    <option>2011</option>\n                    <option>2010</option>\n                    <option>2009</option>\n                </select>\n            </div>\n            <div class=\"form-group condition\" data-value=\"{condition}\">\n                <label>Condition</label>\n\n                <div class=\"radio\">\n                    <label>\n                        <input type=\"radio\" name=\"condition\" value=\"brandnew\" checked>Brand New\n                    </label>\n                </div>\n                <div class=\"radio\">\n                    <label>\n                        <input type=\"radio\" name=\"condition\" value=\"unregistered\">Unregistered\n                    </label>\n                </div>\n                <div class=\"radio disabled\">\n                    <label>\n                        <input type=\"radio\" name=\"condition\" value=\"used\">Used\n                    </label>\n                </div>\n            </div>\n            <div class=\"form-group transmission\" data-value=\"{transmission}\">\n                <label>Transmission</label>\n\n                <div class=\"radio\">\n                    <label>\n                        <input type=\"radio\" name=\"transmission\" value=\"automatic\" checked>Automatic\n                    </label>\n                </div>\n                <div class=\"radio\">\n                    <label>\n                        <input type=\"radio\" name=\"transmission\" value=\"manual\">Manual\n                    </label>\n                </div>\n                <div class=\"radio disabled\">\n                    <label>\n                        <input type=\"radio\" name=\"transmission\" value=\"manumatic\">Manumatic\n                    </label>\n                </div>\n            </div>\n            <div class=\"form-group fuel\" data-value=\"{fuel}\">\n                <label>Fuel</label>\n\n                <div class=\"radio\">\n                    <label>\n                        <input type=\"radio\" name=\"fuel\" value=\"petrol\" checked>Petrol\n                    </label>\n                </div>\n                <div class=\"radio\">\n                    <label>\n                        <input type=\"radio\" name=\"fuel\" value=\"diesel\">Diesel\n                    </label>\n                </div>\n                <div class=\"radio disabled\">\n                    <label>\n                        <input type=\"radio\" name=\"fuel\" value=\"hybrid\">Hybrid\n                    </label>\n                </div>\n            </div>\n            <div class=\"form-group color\">\n                <label>Color</label>\n                <input type=\"text\" class=\"form-control\" placeholder=\"Color\" value=\"{color}\">\n            </div>\n            <div class=\"form-group mileage\">\n                <label>Mileage</label>\n                <input type=\"text\" class=\"form-control\" placeholder=\"Mileage\" value=\"{mileage}\">\n            </div>\n            <div class=\"form-group price\">\n                <label>Price</label>\n                <input type=\"text\" class=\"form-control\" placeholder=\"Minimum\" value=\"{price}\">\n            </div>\n            <div class=\"form-group description\">\n                <label>Description</label>\n                <textarea class=\"form-control\" rows=\"6\">{description}</textarea>\n            </div>\n            <div class=\"form-group photos\">\n                <span class=\"btn btn-success fileinput-button upload-button\">\n                    <i class=\"glyphicon glyphicon-plus\"></i>\n                    <span> Select Images...</span>\n                    <input type=\"file\" multiple=\"\" name=\"files[]\" class=\"fileupload\">\n                </span>\n\n                <!--<div id=\"progress\" class=\"progress\">\n                    <div class=\"progress-bar progress-bar-success\"></div>\n                </div>-->\n                <div class=\"files row\">\n                    {#_.update}\n                    {#photos}\n                    <div class=\"col-md-3 file\">\n                        {>\"vehicles-create-preview\"/}\n                    </div>\n                    {/photos}\n                    {/_.update}\n                </div>\n            </div>\n            {/.}\n            <div class=\"form-group\">\n                <button type=\"button\" class=\"btn btn-default add\">{?_.update}Save{:else}Add{/_.update}</button>\n                {?_.update}\n                <button type=\"button\" class=\"btn btn-default delete\">Delete</button>\n                {/_.update}\n            </div>\n        </form>\n    </div>\n</div>");

require.define("serandomps~vehicles-create@master/preview.html", "<div class=\"info row\">\n    <div class=\"col-md-6 col-xs-6 filename\"></div>\n    <div class=\"col-md-6 col-xs-6\">\n        <button class=\"btn btn-default btn-xs pull-right remove-file existing\"\n                type=\"button\" data-id=\"{id}\" data-index=\"{?index}{index}{:else}0{/index}\">\n            <span aria-hidden=\"true\" class=\"glyphicon glyphicon-remove\"></span>\n        </button>\n    </div>\n</div>\n<div class=\"thumbnail\">\n    {?url}\n    <img src=\"{url}\"/>\n    {/url}\n</div>");

require.register("serandomps~vehicles-find@master", function (exports, module) {
var dust = require('serandomps~dust@master')();
var serand = require('serandomps~serand@master');
var utils = require('serandomps~autos-utils@master');

var user;

var query = function (options) {
    if (!options) {
        return '';
    }
    var data = {
        criteria: {}
    };
    var name;
    for (name in options) {
        if (options.hasOwnProperty(name)) {
            data.criteria[name] = options[name];
        }
    }
    return '?data=' + JSON.stringify(data);
};

var list = function (el, options, fn) {
    $.ajax({
        url: '/apis/v/vehicles' + query(options),
        headers: {
            'X-Host': 'autos.serandives.com'
        },
        dataType: 'json',
        success: function (data) {
            dust.render('vehicles-find', utils.cdn288x162(data), function (err, out) {
                $('.model-vehicles-find', el).remove();
                el.off('click', '.auto-sort .btn');
                el.append(out);
                el.on('click', '.auto-sort .btn', function () {
                    var sort = $(this).attr('name');
                    var serand = require('serandomps~serand@master');
                    serand.emit('auto', 'sort', {sort: sort});
                    list(options, {
                        sort: sort
                    });
                });
                el.on('click', '.edit', function (e) {
                    serand.redirect($(this).closest('.thumbnail').attr('href') + '/edit');
                    return false;
                });
                if (!fn) {
                    return;
                }
                fn(false, function () {
                    $('.model-vehicles-find', el).remove();
                });
            });
        },
        error: function () {
            fn(true, function () {

            });
        }
    });
};

dust.loadSource(dust.compile(require('serandomps~vehicles-find@master/template.html'), 'vehicles-find'));

module.exports = function (sandbox, fn, options) {
    list(sandbox, options, fn);
};

serand.on('user', 'ready', function (usr) {
    user = usr;
});

serand.on('user', 'logged in', function (usr) {
    user = usr;
});

serand.on('user', 'logged out', function (usr) {
    user = null;
});

});

require.define("serandomps~vehicles-find@master/template.html", "<div class=\"vehicles-find\">\n    <!--<div class=\"row\">\n        <div class=\"col-md-7\"></div>\n        <div class=\"col-md-5\">\n            <div class=\"row auto-sort\">\n                <button type=\"button\" class=\"btn btn-primary\" name=\"year\">Year</button>\n                <button type=\"button\" class=\"btn btn-success\" name=\"price\">Price</button>\n                <button type=\"button\" class=\"btn btn-info\" name=\"recent\">Recent</button>\n                <button type=\"button\" class=\"btn btn-warning\" name=\"popular\">Popular</button>\n            </div>\n        </div>\n    </div>-->\n\n    {@slice size=\"3\"}\n    <div class=\"row\">\n        {#.}\n        <div class=\"col-md-4 col-sm-6\">\n            <a class=\"thumbnail\" href=\"/vehicles/{id}\">\n                <div class=\"edit\">Edit</div>\n                <div class=\"photo\"><img src=\"{photos[0].url}\"/></div>\n                <div class=\"info\">\n                    <div class=\"row\">\n                        <div class=\"col-md-12 first\">\n                            <h4>{make} {model} <small>{year}</small></h4>\n                        </div>\n                    </div>\n                    <div class=\"row\">\n                        <div class=\"col-md-6 pull-left\">\n                            <div class=\"third\"><h6>{price} LKR</h6></div>\n                        </div>\n                        <div class=\"col-md-6 pull-left\">\n                            <div class=\"third\"><h6>{mileage} km</h6></div>\n                        </div>\n                    </div>\n                    <!--<table class=\"table table-condensed\">\n                        &lt;!&ndash;<tr><td class=\"name\">Price</td><td class=\"value\">10000LKR</td></tr>&ndash;&gt;\n                        <tr>\n                            <td class=\"name\">Model</td>\n                            <td class=\"value\">{make} {model}</td>\n                        </tr>\n                        &lt;!&ndash;<tr>\n                            <td class=\"name\">Year</td>\n                            <td class=\"value\">{year}</td>\n                        </tr>\n                        <tr>\n                            <td class=\"name\">Color</td>\n                            <td class=\"value\">{color}</td>\n                        </tr>\n                        <tr>\n                            <td class=\"name\">Mileage</td>\n                            <td class=\"value\">{mileage}</td>\n                        </tr>\n                        <tr>\n                            <td class=\"name\"><a href=\"/vehicles/{id}/edit\">Edit here</a></td>\n                            <td class=\"value\"></td>\n                        </tr>&ndash;&gt;\n                        &lt;!&ndash;<tr><td class=\"name\">Transmission</td><td class=\"value\">Automatic</td></tr>&ndash;&gt;\n                        &lt;!&ndash;<tr><td class=\"name\">Fuel</td><td class=\"value\">Gasoline</td></tr>&ndash;&gt;\n                    </table>-->\n                </div>\n            </a>\n        </div>\n        {/.}\n    </div>\n    {/slice}\n</div>");

require.register("serandomps~breadcrumb@master", function (exports, module) {
var dust = require('serandomps~dust@master')();
var serand = require('serandomps~serand@master');

var user;

var context;

dust.loadSource(dust.compile(require('serandomps~breadcrumb@master/template.html'), 'breadcrumb-ui'));

module.exports = function (sandbox, fn, options) {
    var destroy = function () {
        $('.breadcrumb', sandbox).remove();
    };
    context = {
        sandbox: sandbox,
        options: options,
        destroy: destroy
    };
    fn(false, destroy);
};

serand.on('breadcrumb', 'render', function (links) {
    dust.render('breadcrumb-ui', links, function (err, out) {
        if (err) {
            return;
        }
        context.destroy();
        $(out).appendTo(context.sandbox);
    });
});

setTimeout(function () {
    serand.emit('breadcrumb', 'render', [
        {title: 'Home', url: '/'},
        {title: 'Accounts', url: '/accounts'}
    ]);
}, 0);

});

require.define("serandomps~breadcrumb@master/template.html", "<div class=\"row\">\n    <div class=\"col-md-12\">\n        <ol class=\"breadcrumb\">\n            {#.}\n            <li><a href=\"{url}\">{title}</a></li>\n            {/.}\n        </ol>\n    </div>\n</div>\n");

require.register("serandomps~navigation@master", function (exports, module) {
var dust = require('serandomps~dust@master')();
var serand = require('serandomps~serand@master');

var user;

var context;

var sandbox;

var login = function () {
    var el = $('.navigation', context.sandbox);
    dust.renderSource(require('serandomps~navigation@master/user-logged-ui.html'), user, function (err, out) {
        $('.navbar-right', el).html(out);
    });
};

var anon = function () {
    var el = $('.navigation', sandbox);
    dust.renderSource(require('serandomps~navigation@master/user-anon-ui.html'), {}, function (err, out) {
        $('.navbar-right', el).html(out);
    });
};

var render = function (links, done) {
    context.destroy();
    if (!done) {
        done = function () {

        };
    }
    dust.render('navigation-ui', {
        user: user,
        home: links.home,
        menu: links.menu
    }, function (err, out) {
        if (err) {
            return done(err);
        }
        var el = context.sandbox;
        el.append(out);
        $('.navigation-user-ui', el).on('click', '.logout', function () {
            serand.emit('user', 'logout', user);
        });
        done();
    });
};

dust.loadSource(dust.compile(require('serandomps~navigation@master/template.html'), 'navigation-ui'));

module.exports = function (sandbox, fn, options) {
    var destroy = function () {
        $('.navigation', sandbox).remove();
    };
    context = {
        sandbox: sandbox,
        options: options,
        destroy: destroy
    };
    render(options, function (err) {
        fn(err, destroy);
    });
};

serand.on('user', 'ready', function (usr) {
    user = usr;
    if (!context) {
        return;
    }
    user ? login() : anon();
});

serand.on('user', 'logged in', function (usr) {
    user = usr;
    if (!context) {
        return;
    }
    login();
});

serand.on('user', 'logged out', function (usr) {
    user = null;
    if (!context) {
        return;
    }
    anon();
});

serand.on('navigation', 'render', render);

});

require.define("serandomps~navigation@master/template.html", "<div class=\"navigation row\">\n    <div class=\"col-md-12\">\n        <nav class=\"navbar navbar-default navbar-fixed-top\" role=\"navigation\">\n            <div class=\"container\">\n                <!-- Brand and toggle get grouped for better mobile display -->\n                <div class=\"navbar-header\">\n                    <button type=\"button\" class=\"navbar-toggle\" data-toggle=\"collapse\"\n                            data-target=\"#bs-example-navbar-collapse-1\">\n                        <span class=\"sr-only\">Toggle navigation</span>\n                        <span class=\"icon-bar\"></span>\n                        <span class=\"icon-bar\"></span>\n                        <span class=\"icon-bar\"></span>\n                    </button>\n                    <a class=\"navbar-brand\" href=\"{home.url}\">{home.title}</a>\n                </div>\n\n                <!-- Collect the nav links, forms, and other content for toggling -->\n                <div class=\"collapse navbar-collapse\" id=\"bs-example-navbar-collapse-1\">\n                    <ul class=\"nav navbar-nav\">\n                        <!--<li class=\"active\"><a href=\"/\">Home</a></li>-->\n                        {#menu}\n                        <li><a href=\"{url}\">{title}</a></li>\n                        {/menu}\n                        <!--<li><a href=\"#\">Hotels</a></li>\n                        <li><a href=\"#\">Real States</a></li>\n                        <li><a href=\"#\">Add</a></li>\n                        <li class=\"dropdown\">\n                            <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\">More\n                                <b class=\"caret\"></b>\n                            </a>\n                            <ul class=\"dropdown-menu\">\n                                <li><a href=\"#\">Action</a></li>\n                                <li><a href=\"#\">Another action</a></li>\n                                <li><a href=\"#\">Something else here</a></li>\n                                <li class=\"divider\"></li>\n                                <li><a href=\"#\">Separated link</a></li>\n                                <li class=\"divider\"></li>\n                                <li><a href=\"#\">One more separated link</a></li>\n                            </ul>\n                        </li>-->\n                    </ul>\n\n                    <ul class=\"nav navbar-nav navbar-right\">\n                        {?user}\n                        {#user}\n                        <li class=\"dropdown navigation-user-ui\">\n                            <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\">{username}<b class=\"caret\"></b></a>\n                            <ul class=\"dropdown-menu\">\n                                <li><a href=\"#\" class=\"account suck\">Account</a></li>\n                                <li class=\"divider\"></li>\n                                <li><a href=\"#\" class=\"logout suck\">Logout</a></li>\n                            </ul>\n                        </li>\n                        {/user}\n                        {:else}\n                        <li class=\"navigation-user-ui\"><a href=\"/signin\">Sign in</a></li>\n                        <li class=\"navigation-user-ui\"><a href=\"/signup\">Sign up</a></li>\n                        {/user}\n                    </ul>\n                </div>\n                <!-- /.navbar-collapse -->\n            </div>\n            <!-- /.container-fluid -->\n        </nav>\n    </div>\n</div>\n");

require.define("serandomps~navigation@master/user-anon-ui.html", "<li class=\"navigation-user-ui\"><a href=\"/signin\">Sign in</a></li>\n<li class=\"navigation-user-ui\"><a href=\"/signup\">Sign up</a></li>\n<!--<li class=\"dropdown\">\n    <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\">Dropdown <b\n            class=\"caret\"></b></a>\n    <ul class=\"dropdown-menu\">\n        <li><a href=\"#\">Action</a></li>\n        <li><a href=\"#\">Another action</a></li>\n        <li><a href=\"#\">Something else here</a></li>\n        <li class=\"divider\"></li>\n        <li><a href=\"#\">Separated link</a></li>\n    </ul>\n</li>-->");

require.define("serandomps~navigation@master/user-logged-ui.html", "<li class=\"dropdown navigation-user-ui\">\n    <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\">{username}<b class=\"caret\"></b></a>\n    <ul class=\"dropdown-menu\">\n        <li><a href=\"#\" class=\"account\">Account</a></li>\n        <li class=\"divider\"></li>\n        <li><a href=\"#\" class=\"logout\">Logout</a></li>\n    </ul>\n</li>");

require.register("serandomps~accounts-profile@master", function (exports, module) {
var dust = require('serandomps~dust@master')();
var serand = require('serandomps~serand@master');

dust.loadSource(dust.compile(require('serandomps~accounts-profile@master/template.html'), 'accounts-profile'));

module.exports = function (sandbox, fn, options) {
    dust.render('accounts-profile', {
        username: options.username
    }, function (err, out) {
        if (err) {
            return;
        }
        sandbox.append(out);
        fn(false, function () {
            $('.accounts-profile', sandbox).remove();
        });
    });
};

});

require.define("serandomps~accounts-profile@master/template.html", "<div class=\"accounts-profile panel panel-default\">\n    <div class=\"panel-heading\">\n        <h3 class=\"panel-title\">Welcome {username}</h3>\n    </div>\n</div>");

require.register("serandomps~accounts-signup@master", function (exports, module) {
var dust = require('serandomps~dust@master')();
var serand = require('serandomps~serand@master');

var USERS_API = '/apis/v/users';

dust.loadSource(dust.compile(require('serandomps~accounts-signup@master/template.html'), 'accounts-signup'));

module.exports = function (sandbox, fn, options) {
    dust.render('accounts-signup', {}, function (err, out) {
        if (err) {
            return;
        }
        var elem = sandbox.append(out);
        $('.signup', elem).on('click', function () {
            $.ajax({
                url: USERS_API,
                type: 'POST',
                headers: {
                    'X-Host': 'accounts.serandives.com'
                },
                contentType: 'application/json',
                data: JSON.stringify({
                    email: $('.email', elem).val(),
                    password: $('.password', elem).val()
                }),
                dataType: 'json',
                success: function (data) {
                    serand.redirect('/signin');
                },
                error: function () {

                }
            });
        });
        fn(false, function () {
            $('.accounts-signup', sandbox).remove();
        });
    });
};

var user;
/*

 setTimeout(function () {
 var serand = require('serand');
 serand.emit('user', 'login', { username: 'ruchira'});
 }, 4000);*/
});

require.define("serandomps~accounts-signup@master/template.html", "<div class=\"accounts-signup panel panel-default\">\n    <div class=\"panel-heading\">\n        <h3 class=\"panel-title\">Sign up</h3>\n    </div>\n    <div class=\"panel-body\">\n        <form role=\"form\">\n            <div class=\"form-group\">\n                <input type=\"text\" class=\"form-control email\" placeholder=\"Email\">\n            </div>\n            <div class=\"form-group\">\n                <input type=\"password\" class=\"form-control password\" placeholder=\"Password\">\n            </div>\n            <button type=\"button\" class=\"btn btn-default signup\">Sign up</button>\n        </form>\n    </div>\n</div>");

require.register("serandomps~accounts-home@master", function (exports, module) {
var dust = require('serandomps~dust@master')();
var serand = require('serandomps~serand@master');

var profile = require('serandomps~accounts-profile@master');
var signup = require('serandomps~accounts-signup@master');

var ready = false;

var user;

var context;

serand.on('user', 'ready', function (usr) {
    user = usr;
    ready = true;
    if (!context) {
        return;
    }
    user ? profile(context.sandbox, context.done, user) : signup(context.sandbox, context.done, user);
});

serand.on('user', 'logged in', function (usr) {
    user = usr;
    if (!context) {
        return;
    }
    context.destroy();
    profile(context.sandbox, function (err, destroy) {
        context.destroy = err ? serand.none : destroy;
    }, user);
});

serand.on('user', 'logged out', function () {
    user = null;
    if (!context) {
        return;
    }
    context.destroy();
    signup(context.sandbox, function (err, destroy) {
        context.destroy = err ? serand.none : destroy;
    }, user);
});

module.exports = function (sandbox, fn, options) {
    context = {
        sandbox: sandbox,
        done: function (err, destroy) {
            context.destroy = destroy;
            fn(err, function () {
                destroy();
                context = null;
            });
        },
        options: options
    };
    if (!ready) {
        return;
    }
    user ? profile(context.sandbox, context.done, user) : signup(context.sandbox, context.done, user);
};

});

require.define("serandomps~accounts-home@master/template.html", "<div class=\"accounts-profile panel panel-default\">\n    <div class=\"panel-heading\">\n        <h3 class=\"panel-title\">Welcome to serandives.com</h3>\n    </div>\n</div>");

require.register("serandomps~accounts-navigation@master", function (exports, module) {
var serand = require('serandomps~serand@master');
var navigation = require('serandomps~navigation@master');

var context;

var ready = false;

var render = function (done) {
    $.ajax({
        url: '/apis/v/menus/0',
        headers: {
            'X-Host': 'accounts.serandives.com'
        },
        dataType: 'json',
        success: function (links) {
            done(false, links);
        },
        error: function () {
            done(true, {});
        }
    });
};

module.exports = function (sandbox, fn, options) {
    context = {
        sandbox: sandbox,
        fn: fn
    };
    if (!ready) {
        return;
    }
    render(function(err, links) {
        navigation(sandbox, fn, links);
    });
};

serand.on('user', 'ready', function (user) {
    ready = true;
    if (!context) {
        return;
    }
    render(function(err, links) {
        navigation(context.sandbox, context.fn, links);
    });
});

/*serand.on('user', 'logged in', function () {
    console.log('----------------------------2');
    render(function(err, links) {
        serand.emit('navigation', 'render', links);
    });
});

serand.on('user', 'logged out', function () {
    console.log('----------------------------3');
    render(function(err, links) {
        serand.emit('navigation', 'render', links);
    });
});*/

});

require.register("serandomps~accounts-signin@master", function (exports, module) {
var dust = require('serandomps~dust@master')();
var serand = require('serandomps~serand@master');
var utils = require('serandomps~utils@master');

dust.loadSource(dust.compile(require('serandomps~accounts-signin@master/template.html'), 'accounts-signin'));

module.exports = function (sandbox, fn, options) {
    dust.render('accounts-signin', {}, function (err, out) {
        if (err) {
            return;
        }
        sandbox.append(out);
        sandbox.on('click', '.accounts-signin .signin', function (e) {
            var el = $('.accounts-signin', sandbox);
            var username = $('.username', el).val();
            var password = $('.password', el).val();
            authenticate(username, password, options);
            return false;
        });
        sandbox.on('click', '.accounts-signin .facebook', function (e) {
            options.type = 'facebook';
            serand.emit('user', 'oauth', options);
            return false;
        });
        fn(false, function () {
            $('.accounts-signin', sandbox).remove();
        });
    });
};

var authenticate = function (username, password, options) {
    $.ajax({
        method: 'POST',
        url: '/apis/v/tokens',
        headers: {
            'X-Host': 'accounts.serandives.com'
        },
        data: {
            client_id: options.clientId,
            grant_type: 'password',
            username: username,
            password: password
        },
        contentType: 'application/x-www-form-urlencoded',
        dataType: 'json',
        success: function (token) {
            var user = {
                tid: token.id,
                username: username,
                access: token.access_token,
                refresh: token.refresh_token,
                expires: token.expires_in
            };
            serand.emit('token', 'info', user.tid, user.access, function (err, token) {
                if (err) {
                    serand.emit('user', 'login error');
                    return;
                }
                user.has = token.has;
                serand.emit('user', 'logged in', user, options);
            });
        },
        error: function () {
            serand.emit('user', 'login error');
        }
    });
};

});

require.define("serandomps~accounts-signin@master/template.html", "<div class=\"accounts-signin panel panel-default\">\n    <div class=\"panel-heading\">\n        <h3 class=\"panel-title\">Sign in</h3>\n    </div>\n    <div class=\"panel-body\">\n        <form role=\"form\">\n            <div class=\"form-group\">\n                <button type=\"submit\" class=\"btn btn-default facebook\">Facebook</button> or\n                <button type=\"submit\" class=\"btn btn-default google\">Google</button>\n            </div>\n            <hr/>\n            <div class=\"form-group\">\n                <input type=\"text\" class=\"form-control username\" placeholder=\"Username\" value=\"admin@serandives.com\">\n            </div>\n            <div class=\"form-group\">\n                <input type=\"password\" class=\"form-control password\" placeholder=\"Password\" value=\"ruchira\">\n            </div>\n\n            <div class=\"form-group\">\n                <div class=\"checkbox\">\n                    <label>\n                        <input type=\"checkbox\" class=\"remember\">Remember me\n                    </label>\n                </div>\n            </div>\n            <button type=\"submit\" class=\"btn btn-default signin\">Sign in</button>\n        </form>\n    </div>\n</div>");

require.register("serandomps~accounts-token@master", function (exports, module) {
var dust = require('serandomps~dust@master')();
var serand = require('serandomps~serand@master');
var redirect = serand.redirect;

dust.loadSource(dust.compile(require('serandomps~accounts-token@master/template.html'), 'accounts-token'));

module.exports = function (sandbox, fn, options) {
    dust.render('accounts-token', options, function (err, out) {
        if (err) {
            return;
        }
        token(options);
        sandbox.append(out);
        fn(false, function () {
            $('.accounts-token', sandbox).remove();
        });
    });
};

var token = function (o) {
    var options = serand.store('oauth');
    $.ajax({
        method: 'POST',
        url: '/apis/v/tokens',
        headers: {
            'X-Host': 'accounts.serandives.com'
        },
        data: {
            client_id: options.client_id,
            grant_type: options.type,
            code: o.code
        },
        contentType: 'application/x-www-form-urlencoded',
        dataType: 'json',
        success: function (token) {
            var user = {
                tid: token.id,
                access: token.access_token,
                refresh: token.refresh_token,
                expires: token.expires_in
            };
            serand.emit('token', 'info', user.tid, user.access, function (err, token) {
                if (err) {
                    serand.emit('user', 'login error');
                    return;
                }
                user.has = token.has;
                serand.emit('user', 'info', token.user, user.access, function (err, usr) {
                    if (err) {
                        serand.emit('user', 'login error');
                        return;
                    }
                    user.username = usr.email;
                    serand.emit('user', 'logged in', user, options);
                });
            });
        },
        error: function () {
            serand.emit('user', 'login error');
        }
    });
};

serand.on('user', 'oauth', function (options) {
    serand.store('oauth', options);
    serand.emit('user', 'authenticator', {
        type: 'facebook'
    }, function (err, uri) {
        redirect(uri);
    });
});
});

require.define("serandomps~accounts-token@master/template.html", "<div class=\"accounts-authorized panel panel-default\">\n    <div class=\"panel-heading\">\n        <h3 class=\"panel-title\">You are being signed in....</h3>\n    </div>\n</div>");

require.register("serandomps~upload@master/jquery.ui.widget.js", function (exports, module) {
/*! jQuery UI - v1.11.1 - 2014-09-17
 * http://jqueryui.com
 * Includes: widget.js
 * Copyright 2014 jQuery Foundation and other contributors; Licensed MIT */

(function( factory ) {
    if ( typeof define === "function" && define.amd ) {

        // AMD. Register as an anonymous module.
        define([ "jquery" ], factory );
    } else {

        // Browser globals
        factory( jQuery );
    }
}(function( $ ) {
    /*!
     * jQuery UI Widget 1.11.1
     * http://jqueryui.com
     *
     * Copyright 2014 jQuery Foundation and other contributors
     * Released under the MIT license.
     * http://jquery.org/license
     *
     * http://api.jqueryui.com/jQuery.widget/
     */


    var widget_uuid = 0,
        widget_slice = Array.prototype.slice;

    $.cleanData = (function( orig ) {
        return function( elems ) {
            var events, elem, i;
            for ( i = 0; (elem = elems[i]) != null; i++ ) {
                try {

                    // Only trigger remove when necessary to save time
                    events = $._data( elem, "events" );
                    if ( events && events.remove ) {
                        $( elem ).triggerHandler( "remove" );
                    }

                    // http://bugs.jquery.com/ticket/8235
                } catch( e ) {}
            }
            orig( elems );
        };
    })( $.cleanData );

    $.widget = function( name, base, prototype ) {
        var fullName, existingConstructor, constructor, basePrototype,
        // proxiedPrototype allows the provided prototype to remain unmodified
        // so that it can be used as a mixin for multiple widgets (#8876)
            proxiedPrototype = {},
            namespace = name.split( "." )[ 0 ];

        name = name.split( "." )[ 1 ];
        fullName = namespace + "-" + name;

        if ( !prototype ) {
            prototype = base;
            base = $.Widget;
        }

        // create selector for plugin
        $.expr[ ":" ][ fullName.toLowerCase() ] = function( elem ) {
            return !!$.data( elem, fullName );
        };

        $[ namespace ] = $[ namespace ] || {};
        existingConstructor = $[ namespace ][ name ];
        constructor = $[ namespace ][ name ] = function( options, element ) {
            // allow instantiation without "new" keyword
            if ( !this._createWidget ) {
                return new constructor( options, element );
            }

            // allow instantiation without initializing for simple inheritance
            // must use "new" keyword (the code above always passes args)
            if ( arguments.length ) {
                this._createWidget( options, element );
            }
        };
        // extend with the existing constructor to carry over any static properties
        $.extend( constructor, existingConstructor, {
            version: prototype.version,
            // copy the object used to create the prototype in case we need to
            // redefine the widget later
            _proto: $.extend( {}, prototype ),
            // track widgets that inherit from this widget in case this widget is
            // redefined after a widget inherits from it
            _childConstructors: []
        });

        basePrototype = new base();
        // we need to make the options hash a property directly on the new instance
        // otherwise we'll modify the options hash on the prototype that we're
        // inheriting from
        basePrototype.options = $.widget.extend( {}, basePrototype.options );
        $.each( prototype, function( prop, value ) {
            if ( !$.isFunction( value ) ) {
                proxiedPrototype[ prop ] = value;
                return;
            }
            proxiedPrototype[ prop ] = (function() {
                var _super = function() {
                        return base.prototype[ prop ].apply( this, arguments );
                    },
                    _superApply = function( args ) {
                        return base.prototype[ prop ].apply( this, args );
                    };
                return function() {
                    var __super = this._super,
                        __superApply = this._superApply,
                        returnValue;

                    this._super = _super;
                    this._superApply = _superApply;

                    returnValue = value.apply( this, arguments );

                    this._super = __super;
                    this._superApply = __superApply;

                    return returnValue;
                };
            })();
        });
        constructor.prototype = $.widget.extend( basePrototype, {
            // TODO: remove support for widgetEventPrefix
            // always use the name + a colon as the prefix, e.g., draggable:start
            // don't prefix for widgets that aren't DOM-based
            widgetEventPrefix: existingConstructor ? (basePrototype.widgetEventPrefix || name) : name
        }, proxiedPrototype, {
            constructor: constructor,
            namespace: namespace,
            widgetName: name,
            widgetFullName: fullName
        });

        // If this widget is being redefined then we need to find all widgets that
        // are inheriting from it and redefine all of them so that they inherit from
        // the new version of this widget. We're essentially trying to replace one
        // level in the prototype chain.
        if ( existingConstructor ) {
            $.each( existingConstructor._childConstructors, function( i, child ) {
                var childPrototype = child.prototype;

                // redefine the child widget using the same prototype that was
                // originally used, but inherit from the new version of the base
                $.widget( childPrototype.namespace + "." + childPrototype.widgetName, constructor, child._proto );
            });
            // remove the list of existing child constructors from the old constructor
            // so the old child constructors can be garbage collected
            delete existingConstructor._childConstructors;
        } else {
            base._childConstructors.push( constructor );
        }

        $.widget.bridge( name, constructor );

        return constructor;
    };

    $.widget.extend = function( target ) {
        var input = widget_slice.call( arguments, 1 ),
            inputIndex = 0,
            inputLength = input.length,
            key,
            value;
        for ( ; inputIndex < inputLength; inputIndex++ ) {
            for ( key in input[ inputIndex ] ) {
                value = input[ inputIndex ][ key ];
                if ( input[ inputIndex ].hasOwnProperty( key ) && value !== undefined ) {
                    // Clone objects
                    if ( $.isPlainObject( value ) ) {
                        target[ key ] = $.isPlainObject( target[ key ] ) ?
                            $.widget.extend( {}, target[ key ], value ) :
                            // Don't extend strings, arrays, etc. with objects
                            $.widget.extend( {}, value );
                        // Copy everything else by reference
                    } else {
                        target[ key ] = value;
                    }
                }
            }
        }
        return target;
    };

    $.widget.bridge = function( name, object ) {
        var fullName = object.prototype.widgetFullName || name;
        $.fn[ name ] = function( options ) {
            var isMethodCall = typeof options === "string",
                args = widget_slice.call( arguments, 1 ),
                returnValue = this;

            // allow multiple hashes to be passed on init
            options = !isMethodCall && args.length ?
                $.widget.extend.apply( null, [ options ].concat(args) ) :
                options;

            if ( isMethodCall ) {
                this.each(function() {
                    var methodValue,
                        instance = $.data( this, fullName );
                    if ( options === "instance" ) {
                        returnValue = instance;
                        return false;
                    }
                    if ( !instance ) {
                        return $.error( "cannot call methods on " + name + " prior to initialization; " +
                        "attempted to call method '" + options + "'" );
                    }
                    if ( !$.isFunction( instance[options] ) || options.charAt( 0 ) === "_" ) {
                        return $.error( "no such method '" + options + "' for " + name + " widget instance" );
                    }
                    methodValue = instance[ options ].apply( instance, args );
                    if ( methodValue !== instance && methodValue !== undefined ) {
                        returnValue = methodValue && methodValue.jquery ?
                            returnValue.pushStack( methodValue.get() ) :
                            methodValue;
                        return false;
                    }
                });
            } else {
                this.each(function() {
                    var instance = $.data( this, fullName );
                    if ( instance ) {
                        instance.option( options || {} );
                        if ( instance._init ) {
                            instance._init();
                        }
                    } else {
                        $.data( this, fullName, new object( options, this ) );
                    }
                });
            }

            return returnValue;
        };
    };

    $.Widget = function( /* options, element */ ) {};
    $.Widget._childConstructors = [];

    $.Widget.prototype = {
        widgetName: "widget",
        widgetEventPrefix: "",
        defaultElement: "<div>",
        options: {
            disabled: false,

            // callbacks
            create: null
        },
        _createWidget: function( options, element ) {
            element = $( element || this.defaultElement || this )[ 0 ];
            this.element = $( element );
            this.uuid = widget_uuid++;
            this.eventNamespace = "." + this.widgetName + this.uuid;
            this.options = $.widget.extend( {},
                this.options,
                this._getCreateOptions(),
                options );

            this.bindings = $();
            this.hoverable = $();
            this.focusable = $();

            if ( element !== this ) {
                $.data( element, this.widgetFullName, this );
                this._on( true, this.element, {
                    remove: function( event ) {
                        if ( event.target === element ) {
                            this.destroy();
                        }
                    }
                });
                this.document = $( element.style ?
                    // element within the document
                    element.ownerDocument :
                    // element is window or document
                element.document || element );
                this.window = $( this.document[0].defaultView || this.document[0].parentWindow );
            }

            this._create();
            this._trigger( "create", null, this._getCreateEventData() );
            this._init();
        },
        _getCreateOptions: $.noop,
        _getCreateEventData: $.noop,
        _create: $.noop,
        _init: $.noop,

        destroy: function() {
            this._destroy();
            // we can probably remove the unbind calls in 2.0
            // all event bindings should go through this._on()
            this.element
                .unbind( this.eventNamespace )
                .removeData( this.widgetFullName )
                // support: jquery <1.6.3
                // http://bugs.jquery.com/ticket/9413
                .removeData( $.camelCase( this.widgetFullName ) );
            this.widget()
                .unbind( this.eventNamespace )
                .removeAttr( "aria-disabled" )
                .removeClass(
                this.widgetFullName + "-disabled " +
                "ui-state-disabled" );

            // clean up events and states
            this.bindings.unbind( this.eventNamespace );
            this.hoverable.removeClass( "ui-state-hover" );
            this.focusable.removeClass( "ui-state-focus" );
        },
        _destroy: $.noop,

        widget: function() {
            return this.element;
        },

        option: function( key, value ) {
            var options = key,
                parts,
                curOption,
                i;

            if ( arguments.length === 0 ) {
                // don't return a reference to the internal hash
                return $.widget.extend( {}, this.options );
            }

            if ( typeof key === "string" ) {
                // handle nested keys, e.g., "foo.bar" => { foo: { bar: ___ } }
                options = {};
                parts = key.split( "." );
                key = parts.shift();
                if ( parts.length ) {
                    curOption = options[ key ] = $.widget.extend( {}, this.options[ key ] );
                    for ( i = 0; i < parts.length - 1; i++ ) {
                        curOption[ parts[ i ] ] = curOption[ parts[ i ] ] || {};
                        curOption = curOption[ parts[ i ] ];
                    }
                    key = parts.pop();
                    if ( arguments.length === 1 ) {
                        return curOption[ key ] === undefined ? null : curOption[ key ];
                    }
                    curOption[ key ] = value;
                } else {
                    if ( arguments.length === 1 ) {
                        return this.options[ key ] === undefined ? null : this.options[ key ];
                    }
                    options[ key ] = value;
                }
            }

            this._setOptions( options );

            return this;
        },
        _setOptions: function( options ) {
            var key;

            for ( key in options ) {
                this._setOption( key, options[ key ] );
            }

            return this;
        },
        _setOption: function( key, value ) {
            this.options[ key ] = value;

            if ( key === "disabled" ) {
                this.widget()
                    .toggleClass( this.widgetFullName + "-disabled", !!value );

                // If the widget is becoming disabled, then nothing is interactive
                if ( value ) {
                    this.hoverable.removeClass( "ui-state-hover" );
                    this.focusable.removeClass( "ui-state-focus" );
                }
            }

            return this;
        },

        enable: function() {
            return this._setOptions({ disabled: false });
        },
        disable: function() {
            return this._setOptions({ disabled: true });
        },

        _on: function( suppressDisabledCheck, element, handlers ) {
            var delegateElement,
                instance = this;

            // no suppressDisabledCheck flag, shuffle arguments
            if ( typeof suppressDisabledCheck !== "boolean" ) {
                handlers = element;
                element = suppressDisabledCheck;
                suppressDisabledCheck = false;
            }

            // no element argument, shuffle and use this.element
            if ( !handlers ) {
                handlers = element;
                element = this.element;
                delegateElement = this.widget();
            } else {
                element = delegateElement = $( element );
                this.bindings = this.bindings.add( element );
            }

            $.each( handlers, function( event, handler ) {
                function handlerProxy() {
                    // allow widgets to customize the disabled handling
                    // - disabled as an array instead of boolean
                    // - disabled class as method for disabling individual parts
                    if ( !suppressDisabledCheck &&
                        ( instance.options.disabled === true ||
                        $( this ).hasClass( "ui-state-disabled" ) ) ) {
                        return;
                    }
                    return ( typeof handler === "string" ? instance[ handler ] : handler )
                        .apply( instance, arguments );
                }

                // copy the guid so direct unbinding works
                if ( typeof handler !== "string" ) {
                    handlerProxy.guid = handler.guid =
                        handler.guid || handlerProxy.guid || $.guid++;
                }

                var match = event.match( /^([\w:-]*)\s*(.*)$/ ),
                    eventName = match[1] + instance.eventNamespace,
                    selector = match[2];
                if ( selector ) {
                    delegateElement.delegate( selector, eventName, handlerProxy );
                } else {
                    element.bind( eventName, handlerProxy );
                }
            });
        },

        _off: function( element, eventName ) {
            eventName = (eventName || "").split( " " ).join( this.eventNamespace + " " ) + this.eventNamespace;
            element.unbind( eventName ).undelegate( eventName );
        },

        _delay: function( handler, delay ) {
            function handlerProxy() {
                return ( typeof handler === "string" ? instance[ handler ] : handler )
                    .apply( instance, arguments );
            }
            var instance = this;
            return setTimeout( handlerProxy, delay || 0 );
        },

        _hoverable: function( element ) {
            this.hoverable = this.hoverable.add( element );
            this._on( element, {
                mouseenter: function( event ) {
                    $( event.currentTarget ).addClass( "ui-state-hover" );
                },
                mouseleave: function( event ) {
                    $( event.currentTarget ).removeClass( "ui-state-hover" );
                }
            });
        },

        _focusable: function( element ) {
            this.focusable = this.focusable.add( element );
            this._on( element, {
                focusin: function( event ) {
                    $( event.currentTarget ).addClass( "ui-state-focus" );
                },
                focusout: function( event ) {
                    $( event.currentTarget ).removeClass( "ui-state-focus" );
                }
            });
        },

        _trigger: function( type, event, data ) {
            var prop, orig,
                callback = this.options[ type ];

            data = data || {};
            event = $.Event( event );
            event.type = ( type === this.widgetEventPrefix ?
                type :
            this.widgetEventPrefix + type ).toLowerCase();
            // the original event may come from any element
            // so we need to reset the target on the new event
            event.target = this.element[ 0 ];

            // copy original event properties over to the new event
            orig = event.originalEvent;
            if ( orig ) {
                for ( prop in orig ) {
                    if ( !( prop in event ) ) {
                        event[ prop ] = orig[ prop ];
                    }
                }
            }

            this.element.trigger( event, data );
            return !( $.isFunction( callback ) &&
            callback.apply( this.element[0], [ event ].concat( data ) ) === false ||
            event.isDefaultPrevented() );
        }
    };

    $.each( { show: "fadeIn", hide: "fadeOut" }, function( method, defaultEffect ) {
        $.Widget.prototype[ "_" + method ] = function( element, options, callback ) {
            if ( typeof options === "string" ) {
                options = { effect: options };
            }
            var hasOptions,
                effectName = !options ?
                    method :
                    options === true || typeof options === "number" ?
                        defaultEffect :
                    options.effect || defaultEffect;
            options = options || {};
            if ( typeof options === "number" ) {
                options = { duration: options };
            }
            hasOptions = !$.isEmptyObject( options );
            options.complete = callback;
            if ( options.delay ) {
                element.delay( options.delay );
            }
            if ( hasOptions && $.effects && $.effects.effect[ effectName ] ) {
                element[ method ]( options );
            } else if ( effectName !== method && element[ effectName ] ) {
                element[ effectName ]( options.duration, options.easing, callback );
            } else {
                element.queue(function( next ) {
                    $( this )[ method ]();
                    if ( callback ) {
                        callback.call( element[ 0 ] );
                    }
                    next();
                });
            }
        };
    });

    var widget = $.widget;



}));

});

require.register("serandomps~upload@master/jquery.iframe-transport.js", function (exports, module) {
/*
 * jQuery Iframe Transport Plugin 1.8.2
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2011, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/* global define, window, document */

(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // Register as an anonymous AMD module:
        define(['jquery'], factory);
    } else {
        // Browser globals:
        factory(window.jQuery);
    }
}(function ($) {
    'use strict';

    // Helper variable to create unique names for the transport iframes:
    var counter = 0;

    // The iframe transport accepts four additional options:
    // options.fileInput: a jQuery collection of file input fields
    // options.paramName: the parameter name for the file form data,
    //  overrides the name property of the file input field(s),
    //  can be a string or an array of strings.
    // options.formData: an array of objects with name and value properties,
    //  equivalent to the return data of .serializeArray(), e.g.:
    //  [{name: 'a', value: 1}, {name: 'b', value: 2}]
    // options.initialIframeSrc: the URL of the initial iframe src,
    //  by default set to "javascript:false;"
    $.ajaxTransport('iframe', function (options) {
        if (options.async) {
            // javascript:false as initial iframe src
            // prevents warning popups on HTTPS in IE6:
            /*jshint scripturl: true */
            var initialIframeSrc = options.initialIframeSrc || 'javascript:false;',
            /*jshint scripturl: false */
                form,
                iframe,
                addParamChar;
            return {
                send: function (_, completeCallback) {
                    form = $('<form style="display:none;"></form>');
                    form.attr('accept-charset', options.formAcceptCharset);
                    addParamChar = /\?/.test(options.url) ? '&' : '?';
                    // XDomainRequest only supports GET and POST:
                    if (options.type === 'DELETE') {
                        options.url = options.url + addParamChar + '_method=DELETE';
                        options.type = 'POST';
                    } else if (options.type === 'PUT') {
                        options.url = options.url + addParamChar + '_method=PUT';
                        options.type = 'POST';
                    } else if (options.type === 'PATCH') {
                        options.url = options.url + addParamChar + '_method=PATCH';
                        options.type = 'POST';
                    }
                    // IE versions below IE8 cannot set the name property of
                    // elements that have already been added to the DOM,
                    // so we set the name along with the iframe HTML markup:
                    counter += 1;
                    iframe = $(
                        '<iframe src="' + initialIframeSrc +
                        '" name="iframe-transport-' + counter + '"></iframe>'
                    ).bind('load', function () {
                            var fileInputClones,
                                paramNames = $.isArray(options.paramName) ?
                                    options.paramName : [options.paramName];
                            iframe
                                .unbind('load')
                                .bind('load', function () {
                                    var response;
                                    // Wrap in a try/catch block to catch exceptions thrown
                                    // when trying to access cross-domain iframe contents:
                                    try {
                                        response = iframe.contents();
                                        // Google Chrome and Firefox do not throw an
                                        // exception when calling iframe.contents() on
                                        // cross-domain requests, so we unify the response:
                                        if (!response.length || !response[0].firstChild) {
                                            throw new Error();
                                        }
                                    } catch (e) {
                                        response = undefined;
                                    }
                                    // The complete callback returns the
                                    // iframe content document as response object:
                                    completeCallback(
                                        200,
                                        'success',
                                        {'iframe': response}
                                    );
                                    // Fix for IE endless progress bar activity bug
                                    // (happens on form submits to iframe targets):
                                    $('<iframe src="' + initialIframeSrc + '"></iframe>')
                                        .appendTo(form);
                                    window.setTimeout(function () {
                                        // Removing the form in a setTimeout call
                                        // allows Chrome's developer tools to display
                                        // the response result
                                        form.remove();
                                    }, 0);
                                });
                            form
                                .prop('target', iframe.prop('name'))
                                .prop('action', options.url)
                                .prop('method', options.type);
                            if (options.formData) {
                                $.each(options.formData, function (index, field) {
                                    $('<input type="hidden"/>')
                                        .prop('name', field.name)
                                        .val(field.value)
                                        .appendTo(form);
                                });
                            }
                            if (options.fileInput && options.fileInput.length &&
                                options.type === 'POST') {
                                fileInputClones = options.fileInput.clone();
                                // Insert a clone for each file input field:
                                options.fileInput.after(function (index) {
                                    return fileInputClones[index];
                                });
                                if (options.paramName) {
                                    options.fileInput.each(function (index) {
                                        $(this).prop(
                                            'name',
                                            paramNames[index] || options.paramName
                                        );
                                    });
                                }
                                // Appending the file input fields to the hidden form
                                // removes them from their original location:
                                form
                                    .append(options.fileInput)
                                    .prop('enctype', 'multipart/form-data')
                                    // enctype must be set as encoding for IE:
                                    .prop('encoding', 'multipart/form-data');
                                // Remove the HTML5 form attribute from the input(s):
                                options.fileInput.removeAttr('form');
                            }
                            form.submit();
                            // Insert the file input fields at their original location
                            // by replacing the clones with the originals:
                            if (fileInputClones && fileInputClones.length) {
                                options.fileInput.each(function (index, input) {
                                    var clone = $(fileInputClones[index]);
                                    // Restore the original name and form properties:
                                    $(input)
                                        .prop('name', clone.prop('name'))
                                        .attr('form', clone.attr('form'));
                                    clone.replaceWith(input);
                                });
                            }
                        });
                    form.append(iframe).appendTo(document.body);
                },
                abort: function () {
                    if (iframe) {
                        // javascript:false as iframe src aborts the request
                        // and prevents warning popups on HTTPS in IE6.
                        // concat is used to avoid the "Script URL" JSLint error:
                        iframe
                            .unbind('load')
                            .prop('src', initialIframeSrc);
                    }
                    if (form) {
                        form.remove();
                    }
                }
            };
        }
    });

    // The iframe transport returns the iframe content document as response.
    // The following adds converters from iframe to text, json, html, xml
    // and script.
    // Please note that the Content-Type for JSON responses has to be text/plain
    // or text/html, if the browser doesn't include application/json in the
    // Accept header, else IE will show a download dialog.
    // The Content-Type for XML responses on the other hand has to be always
    // application/xml or text/xml, so IE properly parses the XML response.
    // See also
    // https://github.com/blueimp/jQuery-File-Upload/wiki/Setup#content-type-negotiation
    $.ajaxSetup({
        converters: {
            'iframe text': function (iframe) {
                return iframe && $(iframe[0].body).text();
            },
            'iframe json': function (iframe) {
                return iframe && $.parseJSON($(iframe[0].body).text());
            },
            'iframe html': function (iframe) {
                return iframe && $(iframe[0].body).html();
            },
            'iframe xml': function (iframe) {
                var xmlDoc = iframe && iframe[0];
                return xmlDoc && $.isXMLDoc(xmlDoc) ? xmlDoc :
                    $.parseXML((xmlDoc.XMLDocument && xmlDoc.XMLDocument.xml) ||
                    $(xmlDoc.body).html());
            },
            'iframe script': function (iframe) {
                return iframe && $.globalEval($(iframe[0].body).text());
            }
        }
    });

}));

});

require.register("serandomps~upload@master/jquery.fileupload.js", function (exports, module) {
/*
 * jQuery File Upload Plugin 5.42.1
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2010, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/* jshint nomen:false */
/* global define, window, document, location, Blob, FormData */

(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // Register as an anonymous AMD module:
        define([
            'jquery',
            'jquery.ui.widget'
        ], factory);
    } else {
        // Browser globals:
        factory(window.jQuery);
    }
}(function ($) {
    'use strict';

    // Detect file input support, based on
    // http://viljamis.com/blog/2012/file-upload-support-on-mobile/
    $.support.fileInput = !(new RegExp(
        // Handle devices which give false positives for the feature detection:
        '(Android (1\\.[0156]|2\\.[01]))' +
        '|(Windows Phone (OS 7|8\\.0))|(XBLWP)|(ZuneWP)|(WPDesktop)' +
        '|(w(eb)?OSBrowser)|(webOS)' +
        '|(Kindle/(1\\.0|2\\.[05]|3\\.0))'
    ).test(window.navigator.userAgent) ||
        // Feature detection for all other devices:
    $('<input type="file">').prop('disabled'));

    // The FileReader API is not actually used, but works as feature detection,
    // as some Safari versions (5?) support XHR file uploads via the FormData API,
    // but not non-multipart XHR file uploads.
    // window.XMLHttpRequestUpload is not available on IE10, so we check for
    // window.ProgressEvent instead to detect XHR2 file upload capability:
    $.support.xhrFileUpload = !!(window.ProgressEvent && window.FileReader);
    $.support.xhrFormDataFileUpload = !!window.FormData;

    // Detect support for Blob slicing (required for chunked uploads):
    $.support.blobSlice = window.Blob && (Blob.prototype.slice ||
    Blob.prototype.webkitSlice || Blob.prototype.mozSlice);

    // Helper function to create drag handlers for dragover/dragenter/dragleave:
    function getDragHandler(type) {
        var isDragOver = type === 'dragover';
        return function (e) {
            e.dataTransfer = e.originalEvent && e.originalEvent.dataTransfer;
            var dataTransfer = e.dataTransfer;
            if (dataTransfer && $.inArray('Files', dataTransfer.types) !== -1 &&
                this._trigger(
                    type,
                    $.Event(type, {delegatedEvent: e})
                ) !== false) {
                e.preventDefault();
                if (isDragOver) {
                    dataTransfer.dropEffect = 'copy';
                }
            }
        };
    }

    // The fileupload widget listens for change events on file input fields defined
    // via fileInput setting and paste or drop events of the given dropZone.
    // In addition to the default jQuery Widget methods, the fileupload widget
    // exposes the "add" and "send" methods, to add or directly send files using
    // the fileupload API.
    // By default, files added via file input selection, paste, drag & drop or
    // "add" method are uploaded immediately, but it is possible to override
    // the "add" callback option to queue file uploads.
    $.widget('blueimp.fileupload', {

        options: {
            // The drop target element(s), by the default the complete document.
            // Set to null to disable drag & drop support:
            dropZone: $(document),
            // The paste target element(s), by the default undefined.
            // Set to a DOM node or jQuery object to enable file pasting:
            pasteZone: undefined,
            // The file input field(s), that are listened to for change events.
            // If undefined, it is set to the file input fields inside
            // of the widget element on plugin initialization.
            // Set to null to disable the change listener.
            fileInput: undefined,
            // By default, the file input field is replaced with a clone after
            // each input field change event. This is required for iframe transport
            // queues and allows change events to be fired for the same file
            // selection, but can be disabled by setting the following option to false:
            replaceFileInput: true,
            // The parameter name for the file form data (the request argument name).
            // If undefined or empty, the name property of the file input field is
            // used, or "files[]" if the file input name property is also empty,
            // can be a string or an array of strings:
            paramName: undefined,
            // By default, each file of a selection is uploaded using an individual
            // request for XHR type uploads. Set to false to upload file
            // selections in one request each:
            singleFileUploads: true,
            // To limit the number of files uploaded with one XHR request,
            // set the following option to an integer greater than 0:
            limitMultiFileUploads: undefined,
            // The following option limits the number of files uploaded with one
            // XHR request to keep the request size under or equal to the defined
            // limit in bytes:
            limitMultiFileUploadSize: undefined,
            // Multipart file uploads add a number of bytes to each uploaded file,
            // therefore the following option adds an overhead for each file used
            // in the limitMultiFileUploadSize configuration:
            limitMultiFileUploadSizeOverhead: 512,
            // Set the following option to true to issue all file upload requests
            // in a sequential order:
            sequentialUploads: false,
            // To limit the number of concurrent uploads,
            // set the following option to an integer greater than 0:
            limitConcurrentUploads: undefined,
            // Set the following option to true to force iframe transport uploads:
            forceIframeTransport: false,
            // Set the following option to the location of a redirect url on the
            // origin server, for cross-domain iframe transport uploads:
            redirect: undefined,
            // The parameter name for the redirect url, sent as part of the form
            // data and set to 'redirect' if this option is empty:
            redirectParamName: undefined,
            // Set the following option to the location of a postMessage window,
            // to enable postMessage transport uploads:
            postMessage: undefined,
            // By default, XHR file uploads are sent as multipart/form-data.
            // The iframe transport is always using multipart/form-data.
            // Set to false to enable non-multipart XHR uploads:
            multipart: true,
            // To upload large files in smaller chunks, set the following option
            // to a preferred maximum chunk size. If set to 0, null or undefined,
            // or the browser does not support the required Blob API, files will
            // be uploaded as a whole.
            maxChunkSize: undefined,
            // When a non-multipart upload or a chunked multipart upload has been
            // aborted, this option can be used to resume the upload by setting
            // it to the size of the already uploaded bytes. This option is most
            // useful when modifying the options object inside of the "add" or
            // "send" callbacks, as the options are cloned for each file upload.
            uploadedBytes: undefined,
            // By default, failed (abort or error) file uploads are removed from the
            // global progress calculation. Set the following option to false to
            // prevent recalculating the global progress data:
            recalculateProgress: true,
            // Interval in milliseconds to calculate and trigger progress events:
            progressInterval: 100,
            // Interval in milliseconds to calculate progress bitrate:
            bitrateInterval: 500,
            // By default, uploads are started automatically when adding files:
            autoUpload: true,

            // Error and info messages:
            messages: {
                uploadedBytes: 'Uploaded bytes exceed file size'
            },

            // Translation function, gets the message key to be translated
            // and an object with context specific data as arguments:
            i18n: function (message, context) {
                message = this.messages[message] || message.toString();
                if (context) {
                    $.each(context, function (key, value) {
                        message = message.replace('{' + key + '}', value);
                    });
                }
                return message;
            },

            // Additional form data to be sent along with the file uploads can be set
            // using this option, which accepts an array of objects with name and
            // value properties, a function returning such an array, a FormData
            // object (for XHR file uploads), or a simple object.
            // The form of the first fileInput is given as parameter to the function:
            formData: function (form) {
                return form.serializeArray();
            },

            // The add callback is invoked as soon as files are added to the fileupload
            // widget (via file input selection, drag & drop, paste or add API call).
            // If the singleFileUploads option is enabled, this callback will be
            // called once for each file in the selection for XHR file uploads, else
            // once for each file selection.
            //
            // The upload starts when the submit method is invoked on the data parameter.
            // The data object contains a files property holding the added files
            // and allows you to override plugin options as well as define ajax settings.
            //
            // Listeners for this callback can also be bound the following way:
            // .bind('fileuploadadd', func);
            //
            // data.submit() returns a Promise object and allows to attach additional
            // handlers using jQuery's Deferred callbacks:
            // data.submit().done(func).fail(func).always(func);
            add: function (e, data) {
                if (e.isDefaultPrevented()) {
                    return false;
                }
                if (data.autoUpload || (data.autoUpload !== false &&
                    $(this).fileupload('option', 'autoUpload'))) {
                    data.process().done(function () {
                        data.submit();
                    });
                }
            },

            // Other callbacks:

            // Callback for the submit event of each file upload:
            // submit: function (e, data) {}, // .bind('fileuploadsubmit', func);

            // Callback for the start of each file upload request:
            // send: function (e, data) {}, // .bind('fileuploadsend', func);

            // Callback for successful uploads:
            // done: function (e, data) {}, // .bind('fileuploaddone', func);

            // Callback for failed (abort or error) uploads:
            // fail: function (e, data) {}, // .bind('fileuploadfail', func);

            // Callback for completed (success, abort or error) requests:
            // always: function (e, data) {}, // .bind('fileuploadalways', func);

            // Callback for upload progress events:
            // progress: function (e, data) {}, // .bind('fileuploadprogress', func);

            // Callback for global upload progress events:
            // progressall: function (e, data) {}, // .bind('fileuploadprogressall', func);

            // Callback for uploads start, equivalent to the global ajaxStart event:
            // start: function (e) {}, // .bind('fileuploadstart', func);

            // Callback for uploads stop, equivalent to the global ajaxStop event:
            // stop: function (e) {}, // .bind('fileuploadstop', func);

            // Callback for change events of the fileInput(s):
            // change: function (e, data) {}, // .bind('fileuploadchange', func);

            // Callback for paste events to the pasteZone(s):
            // paste: function (e, data) {}, // .bind('fileuploadpaste', func);

            // Callback for drop events of the dropZone(s):
            // drop: function (e, data) {}, // .bind('fileuploaddrop', func);

            // Callback for dragover events of the dropZone(s):
            // dragover: function (e) {}, // .bind('fileuploaddragover', func);

            // Callback for the start of each chunk upload request:
            // chunksend: function (e, data) {}, // .bind('fileuploadchunksend', func);

            // Callback for successful chunk uploads:
            // chunkdone: function (e, data) {}, // .bind('fileuploadchunkdone', func);

            // Callback for failed (abort or error) chunk uploads:
            // chunkfail: function (e, data) {}, // .bind('fileuploadchunkfail', func);

            // Callback for completed (success, abort or error) chunk upload requests:
            // chunkalways: function (e, data) {}, // .bind('fileuploadchunkalways', func);

            // The plugin options are used as settings object for the ajax calls.
            // The following are jQuery ajax settings required for the file uploads:
            processData: false,
            contentType: false,
            cache: false
        },

        // A list of options that require reinitializing event listeners and/or
        // special initialization code:
        _specialOptions: [
            'fileInput',
            'dropZone',
            'pasteZone',
            'multipart',
            'forceIframeTransport'
        ],

        _blobSlice: $.support.blobSlice && function () {
            var slice = this.slice || this.webkitSlice || this.mozSlice;
            return slice.apply(this, arguments);
        },

        _BitrateTimer: function () {
            this.timestamp = ((Date.now) ? Date.now() : (new Date()).getTime());
            this.loaded = 0;
            this.bitrate = 0;
            this.getBitrate = function (now, loaded, interval) {
                var timeDiff = now - this.timestamp;
                if (!this.bitrate || !interval || timeDiff > interval) {
                    this.bitrate = (loaded - this.loaded) * (1000 / timeDiff) * 8;
                    this.loaded = loaded;
                    this.timestamp = now;
                }
                return this.bitrate;
            };
        },

        _isXHRUpload: function (options) {
            return !options.forceIframeTransport &&
                ((!options.multipart && $.support.xhrFileUpload) ||
                $.support.xhrFormDataFileUpload);
        },

        _getFormData: function (options) {
            var formData;
            if ($.type(options.formData) === 'function') {
                return options.formData(options.form);
            }
            if ($.isArray(options.formData)) {
                return options.formData;
            }
            if ($.type(options.formData) === 'object') {
                formData = [];
                $.each(options.formData, function (name, value) {
                    formData.push({name: name, value: value});
                });
                return formData;
            }
            return [];
        },

        _getTotal: function (files) {
            var total = 0;
            $.each(files, function (index, file) {
                total += file.size || 1;
            });
            return total;
        },

        _initProgressObject: function (obj) {
            var progress = {
                loaded: 0,
                total: 0,
                bitrate: 0
            };
            if (obj._progress) {
                $.extend(obj._progress, progress);
            } else {
                obj._progress = progress;
            }
        },

        _initResponseObject: function (obj) {
            var prop;
            if (obj._response) {
                for (prop in obj._response) {
                    if (obj._response.hasOwnProperty(prop)) {
                        delete obj._response[prop];
                    }
                }
            } else {
                obj._response = {};
            }
        },

        _onProgress: function (e, data) {
            if (e.lengthComputable) {
                var now = ((Date.now) ? Date.now() : (new Date()).getTime()),
                    loaded;
                if (data._time && data.progressInterval &&
                    (now - data._time < data.progressInterval) &&
                    e.loaded !== e.total) {
                    return;
                }
                data._time = now;
                loaded = Math.floor(
                    e.loaded / e.total * (data.chunkSize || data._progress.total)
                ) + (data.uploadedBytes || 0);
                // Add the difference from the previously loaded state
                // to the global loaded counter:
                this._progress.loaded += (loaded - data._progress.loaded);
                this._progress.bitrate = this._bitrateTimer.getBitrate(
                    now,
                    this._progress.loaded,
                    data.bitrateInterval
                );
                data._progress.loaded = data.loaded = loaded;
                data._progress.bitrate = data.bitrate = data._bitrateTimer.getBitrate(
                    now,
                    loaded,
                    data.bitrateInterval
                );
                // Trigger a custom progress event with a total data property set
                // to the file size(s) of the current upload and a loaded data
                // property calculated accordingly:
                this._trigger(
                    'progress',
                    $.Event('progress', {delegatedEvent: e}),
                    data
                );
                // Trigger a global progress event for all current file uploads,
                // including ajax calls queued for sequential file uploads:
                this._trigger(
                    'progressall',
                    $.Event('progressall', {delegatedEvent: e}),
                    this._progress
                );
            }
        },

        _initProgressListener: function (options) {
            var that = this,
                xhr = options.xhr ? options.xhr() : $.ajaxSettings.xhr();
            // Accesss to the native XHR object is required to add event listeners
            // for the upload progress event:
            if (xhr.upload) {
                $(xhr.upload).bind('progress', function (e) {
                    var oe = e.originalEvent;
                    // Make sure the progress event properties get copied over:
                    e.lengthComputable = oe.lengthComputable;
                    e.loaded = oe.loaded;
                    e.total = oe.total;
                    that._onProgress(e, options);
                });
                options.xhr = function () {
                    return xhr;
                };
            }
        },

        _isInstanceOf: function (type, obj) {
            // Cross-frame instanceof check
            return Object.prototype.toString.call(obj) === '[object ' + type + ']';
        },

        _initXHRData: function (options) {
            var that = this,
                formData,
                file = options.files[0],
            // Ignore non-multipart setting if not supported:
                multipart = options.multipart || !$.support.xhrFileUpload,
                paramName = $.type(options.paramName) === 'array' ?
                    options.paramName[0] : options.paramName;
            options.headers = $.extend({}, options.headers);
            if (options.contentRange) {
                options.headers['Content-Range'] = options.contentRange;
            }
            if (!multipart || options.blob || !this._isInstanceOf('File', file)) {
                options.headers['Content-Disposition'] = 'attachment; filename="' +
                encodeURI(file.name) + '"';
            }
            if (!multipart) {
                options.contentType = file.type || 'application/octet-stream';
                options.data = options.blob || file;
            } else if ($.support.xhrFormDataFileUpload) {
                if (options.postMessage) {
                    // window.postMessage does not allow sending FormData
                    // objects, so we just add the File/Blob objects to
                    // the formData array and let the postMessage window
                    // create the FormData object out of this array:
                    formData = this._getFormData(options);
                    if (options.blob) {
                        formData.push({
                            name: paramName,
                            value: options.blob
                        });
                    } else {
                        $.each(options.files, function (index, file) {
                            formData.push({
                                name: ($.type(options.paramName) === 'array' &&
                                options.paramName[index]) || paramName,
                                value: file
                            });
                        });
                    }
                } else {
                    if (that._isInstanceOf('FormData', options.formData)) {
                        formData = options.formData;
                    } else {
                        formData = new FormData();
                        $.each(this._getFormData(options), function (index, field) {
                            formData.append(field.name, field.value);
                        });
                    }
                    if (options.blob) {
                        formData.append(paramName, options.blob, file.name);
                    } else {
                        $.each(options.files, function (index, file) {
                            // This check allows the tests to run with
                            // dummy objects:
                            if (that._isInstanceOf('File', file) ||
                                that._isInstanceOf('Blob', file)) {
                                formData.append(
                                    ($.type(options.paramName) === 'array' &&
                                    options.paramName[index]) || paramName,
                                    file,
                                    file.uploadName || file.name
                                );
                            }
                        });
                    }
                }
                options.data = formData;
            }
            // Blob reference is not needed anymore, free memory:
            options.blob = null;
        },

        _initIframeSettings: function (options) {
            var targetHost = $('<a></a>').prop('href', options.url).prop('host');
            // Setting the dataType to iframe enables the iframe transport:
            options.dataType = 'iframe ' + (options.dataType || '');
            // The iframe transport accepts a serialized array as form data:
            options.formData = this._getFormData(options);
            // Add redirect url to form data on cross-domain uploads:
            if (options.redirect && targetHost && targetHost !== location.host) {
                options.formData.push({
                    name: options.redirectParamName || 'redirect',
                    value: options.redirect
                });
            }
        },

        _initDataSettings: function (options) {
            if (this._isXHRUpload(options)) {
                if (!this._chunkedUpload(options, true)) {
                    if (!options.data) {
                        this._initXHRData(options);
                    }
                    this._initProgressListener(options);
                }
                if (options.postMessage) {
                    // Setting the dataType to postmessage enables the
                    // postMessage transport:
                    options.dataType = 'postmessage ' + (options.dataType || '');
                }
            } else {
                this._initIframeSettings(options);
            }
        },

        _getParamName: function (options) {
            var fileInput = $(options.fileInput),
                paramName = options.paramName;
            if (!paramName) {
                paramName = [];
                fileInput.each(function () {
                    var input = $(this),
                        name = input.prop('name') || 'files[]',
                        i = (input.prop('files') || [1]).length;
                    while (i) {
                        paramName.push(name);
                        i -= 1;
                    }
                });
                if (!paramName.length) {
                    paramName = [fileInput.prop('name') || 'files[]'];
                }
            } else if (!$.isArray(paramName)) {
                paramName = [paramName];
            }
            return paramName;
        },

        _initFormSettings: function (options) {
            // Retrieve missing options from the input field and the
            // associated form, if available:
            if (!options.form || !options.form.length) {
                options.form = $(options.fileInput.prop('form'));
                // If the given file input doesn't have an associated form,
                // use the default widget file input's form:
                if (!options.form.length) {
                    options.form = $(this.options.fileInput.prop('form'));
                }
            }
            options.paramName = this._getParamName(options);
            if (!options.url) {
                options.url = options.form.prop('action') || location.href;
            }
            // The HTTP request method must be "POST" or "PUT":
            options.type = (options.type ||
            ($.type(options.form.prop('method')) === 'string' &&
            options.form.prop('method')) || ''
            ).toUpperCase();
            if (options.type !== 'POST' && options.type !== 'PUT' &&
                options.type !== 'PATCH') {
                options.type = 'POST';
            }
            if (!options.formAcceptCharset) {
                options.formAcceptCharset = options.form.attr('accept-charset');
            }
        },

        _getAJAXSettings: function (data) {
            var options = $.extend({}, this.options, data);
            this._initFormSettings(options);
            this._initDataSettings(options);
            return options;
        },

        // jQuery 1.6 doesn't provide .state(),
        // while jQuery 1.8+ removed .isRejected() and .isResolved():
        _getDeferredState: function (deferred) {
            if (deferred.state) {
                return deferred.state();
            }
            if (deferred.isResolved()) {
                return 'resolved';
            }
            if (deferred.isRejected()) {
                return 'rejected';
            }
            return 'pending';
        },

        // Maps jqXHR callbacks to the equivalent
        // methods of the given Promise object:
        _enhancePromise: function (promise) {
            promise.success = promise.done;
            promise.error = promise.fail;
            promise.complete = promise.always;
            return promise;
        },

        // Creates and returns a Promise object enhanced with
        // the jqXHR methods abort, success, error and complete:
        _getXHRPromise: function (resolveOrReject, context, args) {
            var dfd = $.Deferred(),
                promise = dfd.promise();
            context = context || this.options.context || promise;
            if (resolveOrReject === true) {
                dfd.resolveWith(context, args);
            } else if (resolveOrReject === false) {
                dfd.rejectWith(context, args);
            }
            promise.abort = dfd.promise;
            return this._enhancePromise(promise);
        },

        // Adds convenience methods to the data callback argument:
        _addConvenienceMethods: function (e, data) {
            var that = this,
                getPromise = function (args) {
                    return $.Deferred().resolveWith(that, args).promise();
                };
            data.process = function (resolveFunc, rejectFunc) {
                if (resolveFunc || rejectFunc) {
                    data._processQueue = this._processQueue =
                        (this._processQueue || getPromise([this])).pipe(
                            function () {
                                if (data.errorThrown) {
                                    return $.Deferred()
                                        .rejectWith(that, [data]).promise();
                                }
                                return getPromise(arguments);
                            }
                        ).pipe(resolveFunc, rejectFunc);
                }
                return this._processQueue || getPromise([this]);
            };
            data.submit = function () {
                if (this.state() !== 'pending') {
                    data.jqXHR = this.jqXHR =
                        (that._trigger(
                            'submit',
                            $.Event('submit', {delegatedEvent: e}),
                            this
                        ) !== false) && that._onSend(e, this);
                }
                return this.jqXHR || that._getXHRPromise();
            };
            data.abort = function () {
                if (this.jqXHR) {
                    return this.jqXHR.abort();
                }
                this.errorThrown = 'abort';
                that._trigger('fail', null, this);
                return that._getXHRPromise(false);
            };
            data.state = function () {
                if (this.jqXHR) {
                    return that._getDeferredState(this.jqXHR);
                }
                if (this._processQueue) {
                    return that._getDeferredState(this._processQueue);
                }
            };
            data.processing = function () {
                return !this.jqXHR && this._processQueue && that
                        ._getDeferredState(this._processQueue) === 'pending';
            };
            data.progress = function () {
                return this._progress;
            };
            data.response = function () {
                return this._response;
            };
        },

        // Parses the Range header from the server response
        // and returns the uploaded bytes:
        _getUploadedBytes: function (jqXHR) {
            var range = jqXHR.getResponseHeader('Range'),
                parts = range && range.split('-'),
                upperBytesPos = parts && parts.length > 1 &&
                    parseInt(parts[1], 10);
            return upperBytesPos && upperBytesPos + 1;
        },

        // Uploads a file in multiple, sequential requests
        // by splitting the file up in multiple blob chunks.
        // If the second parameter is true, only tests if the file
        // should be uploaded in chunks, but does not invoke any
        // upload requests:
        _chunkedUpload: function (options, testOnly) {
            options.uploadedBytes = options.uploadedBytes || 0;
            var that = this,
                file = options.files[0],
                fs = file.size,
                ub = options.uploadedBytes,
                mcs = options.maxChunkSize || fs,
                slice = this._blobSlice,
                dfd = $.Deferred(),
                promise = dfd.promise(),
                jqXHR,
                upload;
            if (!(this._isXHRUpload(options) && slice && (ub || mcs < fs)) ||
                options.data) {
                return false;
            }
            if (testOnly) {
                return true;
            }
            if (ub >= fs) {
                file.error = options.i18n('uploadedBytes');
                return this._getXHRPromise(
                    false,
                    options.context,
                    [null, 'error', file.error]
                );
            }
            // The chunk upload method:
            upload = function () {
                // Clone the options object for each chunk upload:
                var o = $.extend({}, options),
                    currentLoaded = o._progress.loaded;
                o.blob = slice.call(
                    file,
                    ub,
                    ub + mcs,
                    file.type
                );
                // Store the current chunk size, as the blob itself
                // will be dereferenced after data processing:
                o.chunkSize = o.blob.size;
                // Expose the chunk bytes position range:
                o.contentRange = 'bytes ' + ub + '-' +
                (ub + o.chunkSize - 1) + '/' + fs;
                // Process the upload data (the blob and potential form data):
                that._initXHRData(o);
                // Add progress listeners for this chunk upload:
                that._initProgressListener(o);
                jqXHR = ((that._trigger('chunksend', null, o) !== false && $.ajax(o)) ||
                that._getXHRPromise(false, o.context))
                    .done(function (result, textStatus, jqXHR) {
                        ub = that._getUploadedBytes(jqXHR) ||
                        (ub + o.chunkSize);
                        // Create a progress event if no final progress event
                        // with loaded equaling total has been triggered
                        // for this chunk:
                        if (currentLoaded + o.chunkSize - o._progress.loaded) {
                            that._onProgress($.Event('progress', {
                                lengthComputable: true,
                                loaded: ub - o.uploadedBytes,
                                total: ub - o.uploadedBytes
                            }), o);
                        }
                        options.uploadedBytes = o.uploadedBytes = ub;
                        o.result = result;
                        o.textStatus = textStatus;
                        o.jqXHR = jqXHR;
                        that._trigger('chunkdone', null, o);
                        that._trigger('chunkalways', null, o);
                        if (ub < fs) {
                            // File upload not yet complete,
                            // continue with the next chunk:
                            upload();
                        } else {
                            dfd.resolveWith(
                                o.context,
                                [result, textStatus, jqXHR]
                            );
                        }
                    })
                    .fail(function (jqXHR, textStatus, errorThrown) {
                        o.jqXHR = jqXHR;
                        o.textStatus = textStatus;
                        o.errorThrown = errorThrown;
                        that._trigger('chunkfail', null, o);
                        that._trigger('chunkalways', null, o);
                        dfd.rejectWith(
                            o.context,
                            [jqXHR, textStatus, errorThrown]
                        );
                    });
            };
            this._enhancePromise(promise);
            promise.abort = function () {
                return jqXHR.abort();
            };
            upload();
            return promise;
        },

        _beforeSend: function (e, data) {
            if (this._active === 0) {
                // the start callback is triggered when an upload starts
                // and no other uploads are currently running,
                // equivalent to the global ajaxStart event:
                this._trigger('start');
                // Set timer for global bitrate progress calculation:
                this._bitrateTimer = new this._BitrateTimer();
                // Reset the global progress values:
                this._progress.loaded = this._progress.total = 0;
                this._progress.bitrate = 0;
            }
            // Make sure the container objects for the .response() and
            // .progress() methods on the data object are available
            // and reset to their initial state:
            this._initResponseObject(data);
            this._initProgressObject(data);
            data._progress.loaded = data.loaded = data.uploadedBytes || 0;
            data._progress.total = data.total = this._getTotal(data.files) || 1;
            data._progress.bitrate = data.bitrate = 0;
            this._active += 1;
            // Initialize the global progress values:
            this._progress.loaded += data.loaded;
            this._progress.total += data.total;
        },

        _onDone: function (result, textStatus, jqXHR, options) {
            var total = options._progress.total,
                response = options._response;
            if (options._progress.loaded < total) {
                // Create a progress event if no final progress event
                // with loaded equaling total has been triggered:
                this._onProgress($.Event('progress', {
                    lengthComputable: true,
                    loaded: total,
                    total: total
                }), options);
            }
            response.result = options.result = result;
            response.textStatus = options.textStatus = textStatus;
            response.jqXHR = options.jqXHR = jqXHR;
            this._trigger('done', null, options);
        },

        _onFail: function (jqXHR, textStatus, errorThrown, options) {
            var response = options._response;
            if (options.recalculateProgress) {
                // Remove the failed (error or abort) file upload from
                // the global progress calculation:
                this._progress.loaded -= options._progress.loaded;
                this._progress.total -= options._progress.total;
            }
            response.jqXHR = options.jqXHR = jqXHR;
            response.textStatus = options.textStatus = textStatus;
            response.errorThrown = options.errorThrown = errorThrown;
            this._trigger('fail', null, options);
        },

        _onAlways: function (jqXHRorResult, textStatus, jqXHRorError, options) {
            // jqXHRorResult, textStatus and jqXHRorError are added to the
            // options object via done and fail callbacks
            this._trigger('always', null, options);
        },

        _onSend: function (e, data) {
            if (!data.submit) {
                this._addConvenienceMethods(e, data);
            }
            var that = this,
                jqXHR,
                aborted,
                slot,
                pipe,
                options = that._getAJAXSettings(data),
                send = function () {
                    that._sending += 1;
                    // Set timer for bitrate progress calculation:
                    options._bitrateTimer = new that._BitrateTimer();
                    jqXHR = jqXHR || (
                    ((aborted || that._trigger(
                        'send',
                        $.Event('send', {delegatedEvent: e}),
                        options
                    ) === false) &&
                    that._getXHRPromise(false, options.context, aborted)) ||
                    that._chunkedUpload(options) || $.ajax(options)
                    ).done(function (result, textStatus, jqXHR) {
                            that._onDone(result, textStatus, jqXHR, options);
                        }).fail(function (jqXHR, textStatus, errorThrown) {
                            that._onFail(jqXHR, textStatus, errorThrown, options);
                        }).always(function (jqXHRorResult, textStatus, jqXHRorError) {
                            that._onAlways(
                                jqXHRorResult,
                                textStatus,
                                jqXHRorError,
                                options
                            );
                            that._sending -= 1;
                            that._active -= 1;
                            if (options.limitConcurrentUploads &&
                                options.limitConcurrentUploads > that._sending) {
                                // Start the next queued upload,
                                // that has not been aborted:
                                var nextSlot = that._slots.shift();
                                while (nextSlot) {
                                    if (that._getDeferredState(nextSlot) === 'pending') {
                                        nextSlot.resolve();
                                        break;
                                    }
                                    nextSlot = that._slots.shift();
                                }
                            }
                            if (that._active === 0) {
                                // The stop callback is triggered when all uploads have
                                // been completed, equivalent to the global ajaxStop event:
                                that._trigger('stop');
                            }
                        });
                    return jqXHR;
                };
            this._beforeSend(e, options);
            if (this.options.sequentialUploads ||
                (this.options.limitConcurrentUploads &&
                this.options.limitConcurrentUploads <= this._sending)) {
                if (this.options.limitConcurrentUploads > 1) {
                    slot = $.Deferred();
                    this._slots.push(slot);
                    pipe = slot.pipe(send);
                } else {
                    this._sequence = this._sequence.pipe(send, send);
                    pipe = this._sequence;
                }
                // Return the piped Promise object, enhanced with an abort method,
                // which is delegated to the jqXHR object of the current upload,
                // and jqXHR callbacks mapped to the equivalent Promise methods:
                pipe.abort = function () {
                    aborted = [undefined, 'abort', 'abort'];
                    if (!jqXHR) {
                        if (slot) {
                            slot.rejectWith(options.context, aborted);
                        }
                        return send();
                    }
                    return jqXHR.abort();
                };
                return this._enhancePromise(pipe);
            }
            return send();
        },

        _onAdd: function (e, data) {
            var that = this,
                result = true,
                options = $.extend({}, this.options, data),
                files = data.files,
                filesLength = files.length,
                limit = options.limitMultiFileUploads,
                limitSize = options.limitMultiFileUploadSize,
                overhead = options.limitMultiFileUploadSizeOverhead,
                batchSize = 0,
                paramName = this._getParamName(options),
                paramNameSet,
                paramNameSlice,
                fileSet,
                i,
                j = 0;
            if (limitSize && (!filesLength || files[0].size === undefined)) {
                limitSize = undefined;
            }
            if (!(options.singleFileUploads || limit || limitSize) || !this._isXHRUpload(options)) {
                fileSet = [files];
                paramNameSet = [paramName];
            } else if (!(options.singleFileUploads || limitSize) && limit) {
                fileSet = [];
                paramNameSet = [];
                for (i = 0; i < filesLength; i += limit) {
                    fileSet.push(files.slice(i, i + limit));
                    paramNameSlice = paramName.slice(i, i + limit);
                    if (!paramNameSlice.length) {
                        paramNameSlice = paramName;
                    }
                    paramNameSet.push(paramNameSlice);
                }
            } else if (!options.singleFileUploads && limitSize) {
                fileSet = [];
                paramNameSet = [];
                for (i = 0; i < filesLength; i = i + 1) {
                    batchSize += files[i].size + overhead;
                    if (i + 1 === filesLength ||
                        ((batchSize + files[i + 1].size + overhead) > limitSize) ||
                        (limit && i + 1 - j >= limit)) {
                        fileSet.push(files.slice(j, i + 1));
                        paramNameSlice = paramName.slice(j, i + 1);
                        if (!paramNameSlice.length) {
                            paramNameSlice = paramName;
                        }
                        paramNameSet.push(paramNameSlice);
                        j = i + 1;
                        batchSize = 0;
                    }
                }
            } else {
                paramNameSet = paramName;
            }
            data.originalFiles = files;
            $.each(fileSet || files, function (index, element) {
                var newData = $.extend({}, data);
                newData.files = fileSet ? element : [element];
                newData.paramName = paramNameSet[index];
                that._initResponseObject(newData);
                that._initProgressObject(newData);
                that._addConvenienceMethods(e, newData);
                result = that._trigger(
                    'add',
                    $.Event('add', {delegatedEvent: e}),
                    newData
                );
                return result;
            });
            return result;
        },

        _replaceFileInput: function (data) {
            var input = data.fileInput,
                inputClone = input.clone(true);
            // Add a reference for the new cloned file input to the data argument:
            data.fileInputClone = inputClone;
            $('<form></form>').append(inputClone)[0].reset();
            // Detaching allows to insert the fileInput on another form
            // without loosing the file input value:
            input.after(inputClone).detach();
            // Avoid memory leaks with the detached file input:
            $.cleanData(input.unbind('remove'));
            // Replace the original file input element in the fileInput
            // elements set with the clone, which has been copied including
            // event handlers:
            this.options.fileInput = this.options.fileInput.map(function (i, el) {
                if (el === input[0]) {
                    return inputClone[0];
                }
                return el;
            });
            // If the widget has been initialized on the file input itself,
            // override this.element with the file input clone:
            if (input[0] === this.element[0]) {
                this.element = inputClone;
            }
        },

        _handleFileTreeEntry: function (entry, path) {
            var that = this,
                dfd = $.Deferred(),
                errorHandler = function (e) {
                    if (e && !e.entry) {
                        e.entry = entry;
                    }
                    // Since $.when returns immediately if one
                    // Deferred is rejected, we use resolve instead.
                    // This allows valid files and invalid items
                    // to be returned together in one set:
                    dfd.resolve([e]);
                },
                successHandler = function (entries) {
                    that._handleFileTreeEntries(
                        entries,
                        path + entry.name + '/'
                    ).done(function (files) {
                            dfd.resolve(files);
                        }).fail(errorHandler);
                },
                readEntries = function () {
                    dirReader.readEntries(function (results) {
                        if (!results.length) {
                            successHandler(entries);
                        } else {
                            entries = entries.concat(results);
                            readEntries();
                        }
                    }, errorHandler);
                },
                dirReader, entries = [];
            path = path || '';
            if (entry.isFile) {
                if (entry._file) {
                    // Workaround for Chrome bug #149735
                    entry._file.relativePath = path;
                    dfd.resolve(entry._file);
                } else {
                    entry.file(function (file) {
                        file.relativePath = path;
                        dfd.resolve(file);
                    }, errorHandler);
                }
            } else if (entry.isDirectory) {
                dirReader = entry.createReader();
                readEntries();
            } else {
                // Return an empy list for file system items
                // other than files or directories:
                dfd.resolve([]);
            }
            return dfd.promise();
        },

        _handleFileTreeEntries: function (entries, path) {
            var that = this;
            return $.when.apply(
                $,
                $.map(entries, function (entry) {
                    return that._handleFileTreeEntry(entry, path);
                })
            ).pipe(function () {
                    return Array.prototype.concat.apply(
                        [],
                        arguments
                    );
                });
        },

        _getDroppedFiles: function (dataTransfer) {
            dataTransfer = dataTransfer || {};
            var items = dataTransfer.items;
            if (items && items.length && (items[0].webkitGetAsEntry ||
                items[0].getAsEntry)) {
                return this._handleFileTreeEntries(
                    $.map(items, function (item) {
                        var entry;
                        if (item.webkitGetAsEntry) {
                            entry = item.webkitGetAsEntry();
                            if (entry) {
                                // Workaround for Chrome bug #149735:
                                entry._file = item.getAsFile();
                            }
                            return entry;
                        }
                        return item.getAsEntry();
                    })
                );
            }
            return $.Deferred().resolve(
                $.makeArray(dataTransfer.files)
            ).promise();
        },

        _getSingleFileInputFiles: function (fileInput) {
            fileInput = $(fileInput);
            var entries = fileInput.prop('webkitEntries') ||
                    fileInput.prop('entries'),
                files,
                value;
            if (entries && entries.length) {
                return this._handleFileTreeEntries(entries);
            }
            files = $.makeArray(fileInput.prop('files'));
            if (!files.length) {
                value = fileInput.prop('value');
                if (!value) {
                    return $.Deferred().resolve([]).promise();
                }
                // If the files property is not available, the browser does not
                // support the File API and we add a pseudo File object with
                // the input value as name with path information removed:
                files = [{name: value.replace(/^.*\\/, '')}];
            } else if (files[0].name === undefined && files[0].fileName) {
                // File normalization for Safari 4 and Firefox 3:
                $.each(files, function (index, file) {
                    file.name = file.fileName;
                    file.size = file.fileSize;
                });
            }
            return $.Deferred().resolve(files).promise();
        },

        _getFileInputFiles: function (fileInput) {
            if (!(fileInput instanceof $) || fileInput.length === 1) {
                return this._getSingleFileInputFiles(fileInput);
            }
            return $.when.apply(
                $,
                $.map(fileInput, this._getSingleFileInputFiles)
            ).pipe(function () {
                    return Array.prototype.concat.apply(
                        [],
                        arguments
                    );
                });
        },

        _onChange: function (e) {
            var that = this,
                data = {
                    fileInput: $(e.target),
                    form: $(e.target.form)
                };
            this._getFileInputFiles(data.fileInput).always(function (files) {
                data.files = files;
                if (that.options.replaceFileInput) {
                    that._replaceFileInput(data);
                }
                if (that._trigger(
                        'change',
                        $.Event('change', {delegatedEvent: e}),
                        data
                    ) !== false) {
                    that._onAdd(e, data);
                }
            });
        },

        _onPaste: function (e) {
            var items = e.originalEvent && e.originalEvent.clipboardData &&
                    e.originalEvent.clipboardData.items,
                data = {files: []};
            if (items && items.length) {
                $.each(items, function (index, item) {
                    var file = item.getAsFile && item.getAsFile();
                    if (file) {
                        data.files.push(file);
                    }
                });
                if (this._trigger(
                        'paste',
                        $.Event('paste', {delegatedEvent: e}),
                        data
                    ) !== false) {
                    this._onAdd(e, data);
                }
            }
        },

        _onDrop: function (e) {
            e.dataTransfer = e.originalEvent && e.originalEvent.dataTransfer;
            var that = this,
                dataTransfer = e.dataTransfer,
                data = {};
            if (dataTransfer && dataTransfer.files && dataTransfer.files.length) {
                e.preventDefault();
                this._getDroppedFiles(dataTransfer).always(function (files) {
                    data.files = files;
                    if (that._trigger(
                            'drop',
                            $.Event('drop', {delegatedEvent: e}),
                            data
                        ) !== false) {
                        that._onAdd(e, data);
                    }
                });
            }
        },

        _onDragOver: getDragHandler('dragover'),

        _onDragEnter: getDragHandler('dragenter'),

        _onDragLeave: getDragHandler('dragleave'),

        _initEventHandlers: function () {
            if (this._isXHRUpload(this.options)) {
                this._on(this.options.dropZone, {
                    dragover: this._onDragOver,
                    drop: this._onDrop,
                    // event.preventDefault() on dragenter is required for IE10+:
                    dragenter: this._onDragEnter,
                    // dragleave is not required, but added for completeness:
                    dragleave: this._onDragLeave
                });
                this._on(this.options.pasteZone, {
                    paste: this._onPaste
                });
            }
            if ($.support.fileInput) {
                this._on(this.options.fileInput, {
                    change: this._onChange
                });
            }
        },

        _destroyEventHandlers: function () {
            this._off(this.options.dropZone, 'dragenter dragleave dragover drop');
            this._off(this.options.pasteZone, 'paste');
            this._off(this.options.fileInput, 'change');
        },

        _setOption: function (key, value) {
            var reinit = $.inArray(key, this._specialOptions) !== -1;
            if (reinit) {
                this._destroyEventHandlers();
            }
            this._super(key, value);
            if (reinit) {
                this._initSpecialOptions();
                this._initEventHandlers();
            }
        },

        _initSpecialOptions: function () {
            var options = this.options;
            if (options.fileInput === undefined) {
                options.fileInput = this.element.is('input[type="file"]') ?
                    this.element : this.element.find('input[type="file"]');
            } else if (!(options.fileInput instanceof $)) {
                options.fileInput = $(options.fileInput);
            }
            if (!(options.dropZone instanceof $)) {
                options.dropZone = $(options.dropZone);
            }
            if (!(options.pasteZone instanceof $)) {
                options.pasteZone = $(options.pasteZone);
            }
        },

        _getRegExp: function (str) {
            var parts = str.split('/'),
                modifiers = parts.pop();
            parts.shift();
            return new RegExp(parts.join('/'), modifiers);
        },

        _isRegExpOption: function (key, value) {
            return key !== 'url' && $.type(value) === 'string' &&
                /^\/.*\/[igm]{0,3}$/.test(value);
        },

        _initDataAttributes: function () {
            var that = this,
                options = this.options,
                clone = $(this.element[0].cloneNode(false)),
                data = clone.data();
            // Avoid memory leaks:
            clone.remove();
            // Initialize options set via HTML5 data-attributes:
            $.each(
                data,
                function (key, value) {
                    var dataAttributeName = 'data-' +
                            // Convert camelCase to hyphen-ated key:
                        key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                    if (clone.attr(dataAttributeName)) {
                        if (that._isRegExpOption(key, value)) {
                            value = that._getRegExp(value);
                        }
                        options[key] = value;
                    }
                }
            );
        },

        _create: function () {
            this._initDataAttributes();
            this._initSpecialOptions();
            this._slots = [];
            this._sequence = this._getXHRPromise(true);
            this._sending = this._active = 0;
            this._initProgressObject(this);
            this._initEventHandlers();
        },

        // This method is exposed to the widget API and allows to query
        // the number of active uploads:
        active: function () {
            return this._active;
        },

        // This method is exposed to the widget API and allows to query
        // the widget upload progress.
        // It returns an object with loaded, total and bitrate properties
        // for the running uploads:
        progress: function () {
            return this._progress;
        },

        // This method is exposed to the widget API and allows adding files
        // using the fileupload API. The data parameter accepts an object which
        // must have a files property and can contain additional options:
        // .fileupload('add', {files: filesList});
        add: function (data) {
            var that = this;
            if (!data || this.options.disabled) {
                return;
            }
            if (data.fileInput && !data.files) {
                this._getFileInputFiles(data.fileInput).always(function (files) {
                    data.files = files;
                    that._onAdd(null, data);
                });
            } else {
                data.files = $.makeArray(data.files);
                this._onAdd(null, data);
            }
        },

        // This method is exposed to the widget API and allows sending files
        // using the fileupload API. The data parameter accepts an object which
        // must have a files or fileInput property and can contain additional options:
        // .fileupload('send', {files: filesList});
        // The method returns a Promise object for the file upload call.
        send: function (data) {
            if (data && !this.options.disabled) {
                if (data.fileInput && !data.files) {
                    var that = this,
                        dfd = $.Deferred(),
                        promise = dfd.promise(),
                        jqXHR,
                        aborted;
                    promise.abort = function () {
                        aborted = true;
                        if (jqXHR) {
                            return jqXHR.abort();
                        }
                        dfd.reject(null, 'abort', 'abort');
                        return promise;
                    };
                    this._getFileInputFiles(data.fileInput).always(
                        function (files) {
                            if (aborted) {
                                return;
                            }
                            if (!files.length) {
                                dfd.reject();
                                return;
                            }
                            data.files = files;
                            jqXHR = that._onSend(null, data);
                            jqXHR.then(
                                function (result, textStatus, jqXHR) {
                                    dfd.resolve(result, textStatus, jqXHR);
                                },
                                function (jqXHR, textStatus, errorThrown) {
                                    dfd.reject(jqXHR, textStatus, errorThrown);
                                }
                            );
                        }
                    );
                    return this._enhancePromise(promise);
                }
                data.files = $.makeArray(data.files);
                if (data.files.length) {
                    return this._onSend(null, data);
                }
            }
            return this._getXHRPromise(false, data && data.context);
        }

    });

}));

});

require.register("serandomps~upload@master/jquery.fileupload-image.js", function (exports, module) {
/*
 * jQuery File Upload Image Preview & Resize Plugin 1.7.2
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2013, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/* jshint nomen:false */
/* global define, window, Blob */

(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // Register as an anonymous AMD module:
        define([
            'jquery',
            'load-image',
            'load-image-meta',
            'load-image-exif',
            'load-image-ios',
            'canvas-to-blob',
            './jquery.fileupload-process'
        ], factory);
    } else {
        // Browser globals:
        factory(
            window.jQuery,
            window.loadImage
        );
    }
}(function ($, loadImage) {
    'use strict';

    // Prepend to the default processQueue:
    $.blueimp.fileupload.prototype.options.processQueue.unshift(
        {
            action: 'loadImageMetaData',
            disableImageHead: '@',
            disableExif: '@',
            disableExifThumbnail: '@',
            disableExifSub: '@',
            disableExifGps: '@',
            disabled: '@disableImageMetaDataLoad'
        },
        {
            action: 'loadImage',
            // Use the action as prefix for the "@" options:
            prefix: true,
            fileTypes: '@',
            maxFileSize: '@',
            noRevoke: '@',
            disabled: '@disableImageLoad'
        },
        {
            action: 'resizeImage',
            // Use "image" as prefix for the "@" options:
            prefix: 'image',
            maxWidth: '@',
            maxHeight: '@',
            minWidth: '@',
            minHeight: '@',
            crop: '@',
            orientation: '@',
            forceResize: '@',
            disabled: '@disableImageResize'
        },
        {
            action: 'saveImage',
            quality: '@imageQuality',
            type: '@imageType',
            disabled: '@disableImageResize'
        },
        {
            action: 'saveImageMetaData',
            disabled: '@disableImageMetaDataSave'
        },
        {
            action: 'resizeImage',
            // Use "preview" as prefix for the "@" options:
            prefix: 'preview',
            maxWidth: '@',
            maxHeight: '@',
            minWidth: '@',
            minHeight: '@',
            crop: '@',
            orientation: '@',
            thumbnail: '@',
            canvas: '@',
            disabled: '@disableImagePreview'
        },
        {
            action: 'setImage',
            name: '@imagePreviewName',
            disabled: '@disableImagePreview'
        },
        {
            action: 'deleteImageReferences',
            disabled: '@disableImageReferencesDeletion'
        }
    );

    // The File Upload Resize plugin extends the fileupload widget
    // with image resize functionality:
    $.widget('blueimp.fileupload', $.blueimp.fileupload, {

        options: {
            // The regular expression for the types of images to load:
            // matched against the file type:
            loadImageFileTypes: /^image\/(gif|jpeg|png|svg\+xml)$/,
            // The maximum file size of images to load:
            loadImageMaxFileSize: 10000000, // 10MB
            // The maximum width of resized images:
            imageMaxWidth: 1920,
            // The maximum height of resized images:
            imageMaxHeight: 1080,
            // Defines the image orientation (1-8) or takes the orientation
            // value from Exif data if set to true:
            imageOrientation: false,
            // Define if resized images should be cropped or only scaled:
            imageCrop: false,
            // Disable the resize image functionality by default:
            disableImageResize: true,
            // The maximum width of the preview images:
            previewMaxWidth: 80,
            // The maximum height of the preview images:
            previewMaxHeight: 80,
            // Defines the preview orientation (1-8) or takes the orientation
            // value from Exif data if set to true:
            previewOrientation: true,
            // Create the preview using the Exif data thumbnail:
            previewThumbnail: true,
            // Define if preview images should be cropped or only scaled:
            previewCrop: false,
            // Define if preview images should be resized as canvas elements:
            previewCanvas: true
        },

        processActions: {

            // Loads the image given via data.files and data.index
            // as img element, if the browser supports the File API.
            // Accepts the options fileTypes (regular expression)
            // and maxFileSize (integer) to limit the files to load:
            loadImage: function (data, options) {
                if (options.disabled) {
                    return data;
                }
                var that = this,
                    file = data.files[data.index],
                    dfd = $.Deferred();
                if (($.type(options.maxFileSize) === 'number' &&
                            file.size > options.maxFileSize) ||
                        (options.fileTypes &&
                            !options.fileTypes.test(file.type)) ||
                        !loadImage(
                            file,
                            function (img) {
                                if (img.src) {
                                    data.img = img;
                                }
                                dfd.resolveWith(that, [data]);
                            },
                            options
                        )) {
                    return data;
                }
                return dfd.promise();
            },

            // Resizes the image given as data.canvas or data.img
            // and updates data.canvas or data.img with the resized image.
            // Also stores the resized image as preview property.
            // Accepts the options maxWidth, maxHeight, minWidth,
            // minHeight, canvas and crop:
            resizeImage: function (data, options) {
                if (options.disabled || !(data.canvas || data.img)) {
                    return data;
                }
                options = $.extend({canvas: true}, options);
                var that = this,
                    dfd = $.Deferred(),
                    img = (options.canvas && data.canvas) || data.img,
                    resolve = function (newImg) {
                        if (newImg && (newImg.width !== img.width ||
                                newImg.height !== img.height ||
                                options.forceResize)) {
                            data[newImg.getContext ? 'canvas' : 'img'] = newImg;
                        }
                        data.preview = newImg;
                        dfd.resolveWith(that, [data]);
                    },
                    thumbnail;
                if (data.exif) {
                    if (options.orientation === true) {
                        options.orientation = data.exif.get('Orientation');
                    }
                    if (options.thumbnail) {
                        thumbnail = data.exif.get('Thumbnail');
                        if (thumbnail) {
                            loadImage(thumbnail, resolve, options);
                            return dfd.promise();
                        }
                    }
                    // Prevent orienting the same image twice:
                    if (data.orientation) {
                        delete options.orientation;
                    } else {
                        data.orientation = options.orientation;
                    }
                }
                if (img) {
                    resolve(loadImage.scale(img, options));
                    return dfd.promise();
                }
                return data;
            },

            // Saves the processed image given as data.canvas
            // inplace at data.index of data.files:
            saveImage: function (data, options) {
                if (!data.canvas || options.disabled) {
                    return data;
                }
                var that = this,
                    file = data.files[data.index],
                    dfd = $.Deferred();
                if (data.canvas.toBlob) {
                    data.canvas.toBlob(
                        function (blob) {
                            if (!blob.name) {
                                if (file.type === blob.type) {
                                    blob.name = file.name;
                                } else if (file.name) {
                                    blob.name = file.name.replace(
                                        /\..+$/,
                                        '.' + blob.type.substr(6)
                                    );
                                }
                            }
                            // Don't restore invalid meta data:
                            if (file.type !== blob.type) {
                                delete data.imageHead;
                            }
                            // Store the created blob at the position
                            // of the original file in the files list:
                            data.files[data.index] = blob;
                            dfd.resolveWith(that, [data]);
                        },
                        options.type || file.type,
                        options.quality
                    );
                } else {
                    return data;
                }
                return dfd.promise();
            },

            loadImageMetaData: function (data, options) {
                if (options.disabled) {
                    return data;
                }
                var that = this,
                    dfd = $.Deferred();
                loadImage.parseMetaData(data.files[data.index], function (result) {
                    $.extend(data, result);
                    dfd.resolveWith(that, [data]);
                }, options);
                return dfd.promise();
            },

            saveImageMetaData: function (data, options) {
                if (!(data.imageHead && data.canvas &&
                        data.canvas.toBlob && !options.disabled)) {
                    return data;
                }
                var file = data.files[data.index],
                    blob = new Blob([
                        data.imageHead,
                        // Resized images always have a head size of 20 bytes,
                        // including the JPEG marker and a minimal JFIF header:
                        this._blobSlice.call(file, 20)
                    ], {type: file.type});
                blob.name = file.name;
                data.files[data.index] = blob;
                return data;
            },

            // Sets the resized version of the image as a property of the
            // file object, must be called after "saveImage":
            setImage: function (data, options) {
                if (data.preview && !options.disabled) {
                    data.files[data.index][options.name || 'preview'] = data.preview;
                }
                return data;
            },

            deleteImageReferences: function (data, options) {
                if (!options.disabled) {
                    delete data.img;
                    delete data.canvas;
                    delete data.preview;
                    delete data.imageHead;
                }
                return data;
            }

        }

    });

}));

});

require.register("serandomps~upload@master/jquery.fileupload-process.js", function (exports, module) {
/*
 * jQuery File Upload Processing Plugin 1.3.0
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2012, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/* jshint nomen:false */
/* global define, window */

(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // Register as an anonymous AMD module:
        define([
            'jquery',
            './jquery.fileupload'
        ], factory);
    } else {
        // Browser globals:
        factory(
            window.jQuery
        );
    }
}(function ($) {
    'use strict';

    var originalAdd = $.blueimp.fileupload.prototype.options.add;

    // The File Upload Processing plugin extends the fileupload widget
    // with file processing functionality:
    $.widget('blueimp.fileupload', $.blueimp.fileupload, {

        options: {
            // The list of processing actions:
            processQueue: [
                /*
                 {
                 action: 'log',
                 type: 'debug'
                 }
                 */
            ],
            add: function (e, data) {
                var $this = $(this);
                data.process(function () {
                    return $this.fileupload('process', data);
                });
                originalAdd.call(this, e, data);
            }
        },

        processActions: {
            /*
             log: function (data, options) {
             console[options.type](
             'Processing "' + data.files[data.index].name + '"'
             );
             }
             */
        },

        _processFile: function (data, originalData) {
            var that = this,
                dfd = $.Deferred().resolveWith(that, [data]),
                chain = dfd.promise();
            this._trigger('process', null, data);
            $.each(data.processQueue, function (i, settings) {
                var func = function (data) {
                    if (originalData.errorThrown) {
                        return $.Deferred()
                            .rejectWith(that, [originalData]).promise();
                    }
                    return that.processActions[settings.action].call(
                        that,
                        data,
                        settings
                    );
                };
                chain = chain.pipe(func, settings.always && func);
            });
            chain
                .done(function () {
                    that._trigger('processdone', null, data);
                    that._trigger('processalways', null, data);
                })
                .fail(function () {
                    that._trigger('processfail', null, data);
                    that._trigger('processalways', null, data);
                });
            return chain;
        },

        // Replaces the settings of each processQueue item that
        // are strings starting with an "@", using the remaining
        // substring as key for the option map,
        // e.g. "@autoUpload" is replaced with options.autoUpload:
        _transformProcessQueue: function (options) {
            var processQueue = [];
            $.each(options.processQueue, function () {
                var settings = {},
                    action = this.action,
                    prefix = this.prefix === true ? action : this.prefix;
                $.each(this, function (key, value) {
                    if ($.type(value) === 'string' &&
                        value.charAt(0) === '@') {
                        settings[key] = options[
                        value.slice(1) || (prefix ? prefix +
                        key.charAt(0).toUpperCase() + key.slice(1) : key)
                            ];
                    } else {
                        settings[key] = value;
                    }

                });
                processQueue.push(settings);
            });
            options.processQueue = processQueue;
        },

        // Returns the number of files currently in the processsing queue:
        processing: function () {
            return this._processing;
        },

        // Processes the files given as files property of the data parameter,
        // returns a Promise object that allows to bind callbacks:
        process: function (data) {
            var that = this,
                options = $.extend({}, this.options, data);
            if (options.processQueue && options.processQueue.length) {
                this._transformProcessQueue(options);
                if (this._processing === 0) {
                    this._trigger('processstart');
                }
                $.each(data.files, function (index) {
                    var opts = index ? $.extend({}, options) : options,
                        func = function () {
                            if (data.errorThrown) {
                                return $.Deferred()
                                    .rejectWith(that, [data]).promise();
                            }
                            return that._processFile(opts, data);
                        };
                    opts.index = index;
                    that._processing += 1;
                    that._processingQueue = that._processingQueue.pipe(func, func)
                        .always(function () {
                            that._processing -= 1;
                            if (that._processing === 0) {
                                that._trigger('processstop');
                            }
                        });
                });
            }
            return this._processingQueue;
        },

        _create: function () {
            this._super();
            this._processing = 0;
            this._processingQueue = $.Deferred().resolveWith(this)
                .promise();
        }

    });

}));

});

require.register("serandomps~upload@master/load-image.all.min.js", function (exports, module) {
!function(a){"use strict";var b=function(a,c,d){var e,f,g=document.createElement("img");if(g.onerror=c,g.onload=function(){!f||d&&d.noRevoke||b.revokeObjectURL(f),c&&c(b.scale(g,d))},b.isInstanceOf("Blob",a)||b.isInstanceOf("File",a))e=f=b.createObjectURL(a),g._type=a.type;else{if("string"!=typeof a)return!1;e=a,d&&d.crossOrigin&&(g.crossOrigin=d.crossOrigin)}return e?(g.src=e,g):b.readFile(a,function(a){var b=a.target;b&&b.result?g.src=b.result:c&&c(a)})},c=window.createObjectURL&&window||window.URL&&URL.revokeObjectURL&&URL||window.webkitURL&&webkitURL;b.isInstanceOf=function(a,b){return Object.prototype.toString.call(b)==="[object "+a+"]"},b.transformCoordinates=function(){},b.getTransformedOptions=function(a,b){var c,d,e,f,g=b.aspectRatio;if(!g)return b;c={};for(d in b)b.hasOwnProperty(d)&&(c[d]=b[d]);return c.crop=!0,e=a.naturalWidth||a.width,f=a.naturalHeight||a.height,e/f>g?(c.maxWidth=f*g,c.maxHeight=f):(c.maxWidth=e,c.maxHeight=e/g),c},b.renderImageToCanvas=function(a,b,c,d,e,f,g,h,i,j){return a.getContext("2d").drawImage(b,c,d,e,f,g,h,i,j),a},b.hasCanvasOption=function(a){return a.canvas||a.crop||a.aspectRatio},b.scale=function(a,c){c=c||{};var d,e,f,g,h,i,j,k,l,m=document.createElement("canvas"),n=a.getContext||b.hasCanvasOption(c)&&m.getContext,o=a.naturalWidth||a.width,p=a.naturalHeight||a.height,q=o,r=p,s=function(){var a=Math.max((f||q)/q,(g||r)/r);a>1&&(q*=a,r*=a)},t=function(){var a=Math.min((d||q)/q,(e||r)/r);1>a&&(q*=a,r*=a)};return n&&(c=b.getTransformedOptions(a,c),j=c.left||0,k=c.top||0,c.sourceWidth?(h=c.sourceWidth,void 0!==c.right&&void 0===c.left&&(j=o-h-c.right)):h=o-j-(c.right||0),c.sourceHeight?(i=c.sourceHeight,void 0!==c.bottom&&void 0===c.top&&(k=p-i-c.bottom)):i=p-k-(c.bottom||0),q=h,r=i),d=c.maxWidth,e=c.maxHeight,f=c.minWidth,g=c.minHeight,n&&d&&e&&c.crop?(q=d,r=e,l=h/i-d/e,0>l?(i=e*h/d,void 0===c.top&&void 0===c.bottom&&(k=(p-i)/2)):l>0&&(h=d*i/e,void 0===c.left&&void 0===c.right&&(j=(o-h)/2))):((c.contain||c.cover)&&(f=d=d||f,g=e=e||g),c.cover?(t(),s()):(s(),t())),n?(m.width=q,m.height=r,b.transformCoordinates(m,c),b.renderImageToCanvas(m,a,j,k,h,i,0,0,q,r)):(a.width=q,a.height=r,a)},b.createObjectURL=function(a){return c?c.createObjectURL(a):!1},b.revokeObjectURL=function(a){return c?c.revokeObjectURL(a):!1},b.readFile=function(a,b,c){if(window.FileReader){var d=new FileReader;if(d.onload=d.onerror=b,c=c||"readAsDataURL",d[c])return d[c](a),d}return!1},"function"==typeof define&&define.amd?define(function(){return b}):a.loadImage=b}(this),function(a){"use strict";"function"==typeof define&&define.amd?define(["load-image"],a):a(window.loadImage)}(function(a){"use strict";if(window.navigator&&window.navigator.platform&&/iP(hone|od|ad)/.test(window.navigator.platform)){var b=a.renderImageToCanvas;a.detectSubsampling=function(a){var b,c;return a.width*a.height>1048576?(b=document.createElement("canvas"),b.width=b.height=1,c=b.getContext("2d"),c.drawImage(a,-a.width+1,0),0===c.getImageData(0,0,1,1).data[3]):!1},a.detectVerticalSquash=function(a,b){var c,d,e,f,g,h=a.naturalHeight||a.height,i=document.createElement("canvas"),j=i.getContext("2d");for(b&&(h/=2),i.width=1,i.height=h,j.drawImage(a,0,0),c=j.getImageData(0,0,1,h).data,d=0,e=h,f=h;f>d;)g=c[4*(f-1)+3],0===g?e=f:d=f,f=e+d>>1;return f/h||1},a.renderImageToCanvas=function(c,d,e,f,g,h,i,j,k,l){if("image/jpeg"===d._type){var m,n,o,p,q=c.getContext("2d"),r=document.createElement("canvas"),s=1024,t=r.getContext("2d");if(r.width=s,r.height=s,q.save(),m=a.detectSubsampling(d),m&&(e/=2,f/=2,g/=2,h/=2),n=a.detectVerticalSquash(d,m),m||1!==n){for(f*=n,k=Math.ceil(s*k/g),l=Math.ceil(s*l/h/n),j=0,p=0;h>p;){for(i=0,o=0;g>o;)t.clearRect(0,0,s,s),t.drawImage(d,e,f,g,h,-o,-p,g,h),q.drawImage(r,0,0,s,s,i,j,k,l),o+=s,i+=k;p+=s,j+=l}return q.restore(),c}}return b(c,d,e,f,g,h,i,j,k,l)}}}),function(a){"use strict";"function"==typeof define&&define.amd?define(["load-image"],a):a(window.loadImage)}(function(a){"use strict";var b=a.hasCanvasOption,c=a.transformCoordinates,d=a.getTransformedOptions;a.hasCanvasOption=function(c){return b.call(a,c)||c.orientation},a.transformCoordinates=function(b,d){c.call(a,b,d);var e=b.getContext("2d"),f=b.width,g=b.height,h=d.orientation;if(h&&!(h>8))switch(h>4&&(b.width=g,b.height=f),h){case 2:e.translate(f,0),e.scale(-1,1);break;case 3:e.translate(f,g),e.rotate(Math.PI);break;case 4:e.translate(0,g),e.scale(1,-1);break;case 5:e.rotate(.5*Math.PI),e.scale(1,-1);break;case 6:e.rotate(.5*Math.PI),e.translate(0,-g);break;case 7:e.rotate(.5*Math.PI),e.translate(f,-g),e.scale(-1,1);break;case 8:e.rotate(-.5*Math.PI),e.translate(-f,0)}},a.getTransformedOptions=function(b,c){var e,f,g=d.call(a,b,c),h=g.orientation;if(!h||h>8||1===h)return g;e={};for(f in g)g.hasOwnProperty(f)&&(e[f]=g[f]);switch(g.orientation){case 2:e.left=g.right,e.right=g.left;break;case 3:e.left=g.right,e.top=g.bottom,e.right=g.left,e.bottom=g.top;break;case 4:e.top=g.bottom,e.bottom=g.top;break;case 5:e.left=g.top,e.top=g.left,e.right=g.bottom,e.bottom=g.right;break;case 6:e.left=g.top,e.top=g.right,e.right=g.bottom,e.bottom=g.left;break;case 7:e.left=g.bottom,e.top=g.right,e.right=g.top,e.bottom=g.left;break;case 8:e.left=g.bottom,e.top=g.left,e.right=g.top,e.bottom=g.right}return g.orientation>4&&(e.maxWidth=g.maxHeight,e.maxHeight=g.maxWidth,e.minWidth=g.minHeight,e.minHeight=g.minWidth,e.sourceWidth=g.sourceHeight,e.sourceHeight=g.sourceWidth),e}}),function(a){"use strict";"function"==typeof define&&define.amd?define(["load-image"],a):a(window.loadImage)}(function(a){"use strict";var b=window.Blob&&(Blob.prototype.slice||Blob.prototype.webkitSlice||Blob.prototype.mozSlice);a.blobSlice=b&&function(){var a=this.slice||this.webkitSlice||this.mozSlice;return a.apply(this,arguments)},a.metaDataParsers={jpeg:{65505:[]}},a.parseMetaData=function(b,c,d){d=d||{};var e=this,f=d.maxMetaDataSize||262144,g={},h=!(window.DataView&&b&&b.size>=12&&"image/jpeg"===b.type&&a.blobSlice);(h||!a.readFile(a.blobSlice.call(b,0,f),function(b){if(b.target.error)return console.log(b.target.error),void c(g);var f,h,i,j,k=b.target.result,l=new DataView(k),m=2,n=l.byteLength-4,o=m;if(65496===l.getUint16(0)){for(;n>m&&(f=l.getUint16(m),f>=65504&&65519>=f||65534===f);){if(h=l.getUint16(m+2)+2,m+h>l.byteLength){console.log("Invalid meta data: Invalid segment size.");break}if(i=a.metaDataParsers.jpeg[f])for(j=0;j<i.length;j+=1)i[j].call(e,l,m,h,g,d);m+=h,o=m}!d.disableImageHead&&o>6&&(g.imageHead=k.slice?k.slice(0,o):new Uint8Array(k).subarray(0,o))}else console.log("Invalid JPEG file: Missing JPEG marker.");c(g)},"readAsArrayBuffer"))&&c(g)}}),function(a){"use strict";"function"==typeof define&&define.amd?define(["load-image","load-image-meta"],a):a(window.loadImage)}(function(a){"use strict";a.ExifMap=function(){return this},a.ExifMap.prototype.map={Orientation:274},a.ExifMap.prototype.get=function(a){return this[a]||this[this.map[a]]},a.getExifThumbnail=function(a,b,c){var d,e,f;if(!c||b+c>a.byteLength)return void console.log("Invalid Exif data: Invalid thumbnail data.");for(d=[],e=0;c>e;e+=1)f=a.getUint8(b+e),d.push((16>f?"0":"")+f.toString(16));return"data:image/jpeg,%"+d.join("%")},a.exifTagTypes={1:{getValue:function(a,b){return a.getUint8(b)},size:1},2:{getValue:function(a,b){return String.fromCharCode(a.getUint8(b))},size:1,ascii:!0},3:{getValue:function(a,b,c){return a.getUint16(b,c)},size:2},4:{getValue:function(a,b,c){return a.getUint32(b,c)},size:4},5:{getValue:function(a,b,c){return a.getUint32(b,c)/a.getUint32(b+4,c)},size:8},9:{getValue:function(a,b,c){return a.getInt32(b,c)},size:4},10:{getValue:function(a,b,c){return a.getInt32(b,c)/a.getInt32(b+4,c)},size:8}},a.exifTagTypes[7]=a.exifTagTypes[1],a.getExifValue=function(b,c,d,e,f,g){var h,i,j,k,l,m,n=a.exifTagTypes[e];if(!n)return void console.log("Invalid Exif data: Invalid tag type.");if(h=n.size*f,i=h>4?c+b.getUint32(d+8,g):d+8,i+h>b.byteLength)return void console.log("Invalid Exif data: Invalid data offset.");if(1===f)return n.getValue(b,i,g);for(j=[],k=0;f>k;k+=1)j[k]=n.getValue(b,i+k*n.size,g);if(n.ascii){for(l="",k=0;k<j.length&&(m=j[k],"\x00"!==m);k+=1)l+=m;return l}return j},a.parseExifTag=function(b,c,d,e,f){var g=b.getUint16(d,e);f.exif[g]=a.getExifValue(b,c,d,b.getUint16(d+2,e),b.getUint32(d+4,e),e)},a.parseExifTags=function(a,b,c,d,e){var f,g,h;if(c+6>a.byteLength)return void console.log("Invalid Exif data: Invalid directory offset.");if(f=a.getUint16(c,d),g=c+2+12*f,g+4>a.byteLength)return void console.log("Invalid Exif data: Invalid directory size.");for(h=0;f>h;h+=1)this.parseExifTag(a,b,c+2+12*h,d,e);return a.getUint32(g,d)},a.parseExifData=function(b,c,d,e,f){if(!f.disableExif){var g,h,i,j=c+10;if(1165519206===b.getUint32(c+4)){if(j+8>b.byteLength)return void console.log("Invalid Exif data: Invalid segment size.");if(0!==b.getUint16(c+8))return void console.log("Invalid Exif data: Missing byte alignment offset.");switch(b.getUint16(j)){case 18761:g=!0;break;case 19789:g=!1;break;default:return void console.log("Invalid Exif data: Invalid byte alignment marker.")}if(42!==b.getUint16(j+2,g))return void console.log("Invalid Exif data: Missing TIFF marker.");h=b.getUint32(j+4,g),e.exif=new a.ExifMap,h=a.parseExifTags(b,j,j+h,g,e),h&&!f.disableExifThumbnail&&(i={exif:{}},h=a.parseExifTags(b,j,j+h,g,i),i.exif[513]&&(e.exif.Thumbnail=a.getExifThumbnail(b,j+i.exif[513],i.exif[514]))),e.exif[34665]&&!f.disableExifSub&&a.parseExifTags(b,j,j+e.exif[34665],g,e),e.exif[34853]&&!f.disableExifGps&&a.parseExifTags(b,j,j+e.exif[34853],g,e)}}},a.metaDataParsers.jpeg[65505].push(a.parseExifData)}),function(a){"use strict";"function"==typeof define&&define.amd?define(["load-image","load-image-exif"],a):a(window.loadImage)}(function(a){"use strict";a.ExifMap.prototype.tags={256:"ImageWidth",257:"ImageHeight",34665:"ExifIFDPointer",34853:"GPSInfoIFDPointer",40965:"InteroperabilityIFDPointer",258:"BitsPerSample",259:"Compression",262:"PhotometricInterpretation",274:"Orientation",277:"SamplesPerPixel",284:"PlanarConfiguration",530:"YCbCrSubSampling",531:"YCbCrPositioning",282:"XResolution",283:"YResolution",296:"ResolutionUnit",273:"StripOffsets",278:"RowsPerStrip",279:"StripByteCounts",513:"JPEGInterchangeFormat",514:"JPEGInterchangeFormatLength",301:"TransferFunction",318:"WhitePoint",319:"PrimaryChromaticities",529:"YCbCrCoefficients",532:"ReferenceBlackWhite",306:"DateTime",270:"ImageDescription",271:"Make",272:"Model",305:"Software",315:"Artist",33432:"Copyright",36864:"ExifVersion",40960:"FlashpixVersion",40961:"ColorSpace",40962:"PixelXDimension",40963:"PixelYDimension",42240:"Gamma",37121:"ComponentsConfiguration",37122:"CompressedBitsPerPixel",37500:"MakerNote",37510:"UserComment",40964:"RelatedSoundFile",36867:"DateTimeOriginal",36868:"DateTimeDigitized",37520:"SubSecTime",37521:"SubSecTimeOriginal",37522:"SubSecTimeDigitized",33434:"ExposureTime",33437:"FNumber",34850:"ExposureProgram",34852:"SpectralSensitivity",34855:"PhotographicSensitivity",34856:"OECF",34864:"SensitivityType",34865:"StandardOutputSensitivity",34866:"RecommendedExposureIndex",34867:"ISOSpeed",34868:"ISOSpeedLatitudeyyy",34869:"ISOSpeedLatitudezzz",37377:"ShutterSpeedValue",37378:"ApertureValue",37379:"BrightnessValue",37380:"ExposureBias",37381:"MaxApertureValue",37382:"SubjectDistance",37383:"MeteringMode",37384:"LightSource",37385:"Flash",37396:"SubjectArea",37386:"FocalLength",41483:"FlashEnergy",41484:"SpatialFrequencyResponse",41486:"FocalPlaneXResolution",41487:"FocalPlaneYResolution",41488:"FocalPlaneResolutionUnit",41492:"SubjectLocation",41493:"ExposureIndex",41495:"SensingMethod",41728:"FileSource",41729:"SceneType",41730:"CFAPattern",41985:"CustomRendered",41986:"ExposureMode",41987:"WhiteBalance",41988:"DigitalZoomRatio",41989:"FocalLengthIn35mmFilm",41990:"SceneCaptureType",41991:"GainControl",41992:"Contrast",41993:"Saturation",41994:"Sharpness",41995:"DeviceSettingDescription",41996:"SubjectDistanceRange",42016:"ImageUniqueID",42032:"CameraOwnerName",42033:"BodySerialNumber",42034:"LensSpecification",42035:"LensMake",42036:"LensModel",42037:"LensSerialNumber",0:"GPSVersionID",1:"GPSLatitudeRef",2:"GPSLatitude",3:"GPSLongitudeRef",4:"GPSLongitude",5:"GPSAltitudeRef",6:"GPSAltitude",7:"GPSTimeStamp",8:"GPSSatellites",9:"GPSStatus",10:"GPSMeasureMode",11:"GPSDOP",12:"GPSSpeedRef",13:"GPSSpeed",14:"GPSTrackRef",15:"GPSTrack",16:"GPSImgDirectionRef",17:"GPSImgDirection",18:"GPSMapDatum",19:"GPSDestLatitudeRef",20:"GPSDestLatitude",21:"GPSDestLongitudeRef",22:"GPSDestLongitude",23:"GPSDestBearingRef",24:"GPSDestBearing",25:"GPSDestDistanceRef",26:"GPSDestDistance",27:"GPSProcessingMethod",28:"GPSAreaInformation",29:"GPSDateStamp",30:"GPSDifferential",31:"GPSHPositioningError"},a.ExifMap.prototype.stringValues={ExposureProgram:{0:"Undefined",1:"Manual",2:"Normal program",3:"Aperture priority",4:"Shutter priority",5:"Creative program",6:"Action program",7:"Portrait mode",8:"Landscape mode"},MeteringMode:{0:"Unknown",1:"Average",2:"CenterWeightedAverage",3:"Spot",4:"MultiSpot",5:"Pattern",6:"Partial",255:"Other"},LightSource:{0:"Unknown",1:"Daylight",2:"Fluorescent",3:"Tungsten (incandescent light)",4:"Flash",9:"Fine weather",10:"Cloudy weather",11:"Shade",12:"Daylight fluorescent (D 5700 - 7100K)",13:"Day white fluorescent (N 4600 - 5400K)",14:"Cool white fluorescent (W 3900 - 4500K)",15:"White fluorescent (WW 3200 - 3700K)",17:"Standard light A",18:"Standard light B",19:"Standard light C",20:"D55",21:"D65",22:"D75",23:"D50",24:"ISO studio tungsten",255:"Other"},Flash:{0:"Flash did not fire",1:"Flash fired",5:"Strobe return light not detected",7:"Strobe return light detected",9:"Flash fired, compulsory flash mode",13:"Flash fired, compulsory flash mode, return light not detected",15:"Flash fired, compulsory flash mode, return light detected",16:"Flash did not fire, compulsory flash mode",24:"Flash did not fire, auto mode",25:"Flash fired, auto mode",29:"Flash fired, auto mode, return light not detected",31:"Flash fired, auto mode, return light detected",32:"No flash function",65:"Flash fired, red-eye reduction mode",69:"Flash fired, red-eye reduction mode, return light not detected",71:"Flash fired, red-eye reduction mode, return light detected",73:"Flash fired, compulsory flash mode, red-eye reduction mode",77:"Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected",79:"Flash fired, compulsory flash mode, red-eye reduction mode, return light detected",89:"Flash fired, auto mode, red-eye reduction mode",93:"Flash fired, auto mode, return light not detected, red-eye reduction mode",95:"Flash fired, auto mode, return light detected, red-eye reduction mode"},SensingMethod:{1:"Undefined",2:"One-chip color area sensor",3:"Two-chip color area sensor",4:"Three-chip color area sensor",5:"Color sequential area sensor",7:"Trilinear sensor",8:"Color sequential linear sensor"},SceneCaptureType:{0:"Standard",1:"Landscape",2:"Portrait",3:"Night scene"},SceneType:{1:"Directly photographed"},CustomRendered:{0:"Normal process",1:"Custom process"},WhiteBalance:{0:"Auto white balance",1:"Manual white balance"},GainControl:{0:"None",1:"Low gain up",2:"High gain up",3:"Low gain down",4:"High gain down"},Contrast:{0:"Normal",1:"Soft",2:"Hard"},Saturation:{0:"Normal",1:"Low saturation",2:"High saturation"},Sharpness:{0:"Normal",1:"Soft",2:"Hard"},SubjectDistanceRange:{0:"Unknown",1:"Macro",2:"Close view",3:"Distant view"},FileSource:{3:"DSC"},ComponentsConfiguration:{0:"",1:"Y",2:"Cb",3:"Cr",4:"R",5:"G",6:"B"},Orientation:{1:"top-left",2:"top-right",3:"bottom-right",4:"bottom-left",5:"left-top",6:"right-top",7:"right-bottom",8:"left-bottom"}},a.ExifMap.prototype.getText=function(a){var b=this.get(a);switch(a){case"LightSource":case"Flash":case"MeteringMode":case"ExposureProgram":case"SensingMethod":case"SceneCaptureType":case"SceneType":case"CustomRendered":case"WhiteBalance":case"GainControl":case"Contrast":case"Saturation":case"Sharpness":case"SubjectDistanceRange":case"FileSource":case"Orientation":return this.stringValues[a][b];case"ExifVersion":case"FlashpixVersion":return String.fromCharCode(b[0],b[1],b[2],b[3]);case"ComponentsConfiguration":return this.stringValues[a][b[0]]+this.stringValues[a][b[1]]+this.stringValues[a][b[2]]+this.stringValues[a][b[3]];case"GPSVersionID":return b[0]+"."+b[1]+"."+b[2]+"."+b[3]}return String(b)},function(a){var b,c=a.tags,d=a.map;for(b in c)c.hasOwnProperty(b)&&(d[c[b]]=b)}(a.ExifMap.prototype),a.ExifMap.prototype.getAll=function(){var a,b,c={};for(a in this)this.hasOwnProperty(a)&&(b=this.tags[a],b&&(c[b]=this.getText(b)));return c}});
});

require.register("serandomps~upload@master/canvas-to-blob.min.js", function (exports, module) {

!function(a){"use strict";var b=a.HTMLCanvasElement&&a.HTMLCanvasElement.prototype,c=a.Blob&&function(){try{return Boolean(new Blob)}catch(a){return!1}}(),d=c&&a.Uint8Array&&function(){try{return 100===new Blob([new Uint8Array(100)]).size}catch(a){return!1}}(),e=a.BlobBuilder||a.WebKitBlobBuilder||a.MozBlobBuilder||a.MSBlobBuilder,f=(c||e)&&a.atob&&a.ArrayBuffer&&a.Uint8Array&&function(a){var b,f,g,h,i,j;for(b=a.split(",")[0].indexOf("base64")>=0?atob(a.split(",")[1]):decodeURIComponent(a.split(",")[1]),f=new ArrayBuffer(b.length),g=new Uint8Array(f),h=0;h<b.length;h+=1)g[h]=b.charCodeAt(h);return i=a.split(",")[0].split(":")[1].split(";")[0],c?new Blob([d?g:f],{type:i}):(j=new e,j.append(f),j.getBlob(i))};a.HTMLCanvasElement&&!b.toBlob&&(b.mozGetAsFile?b.toBlob=function(a,c,d){d&&b.toDataURL&&f?a(f(this.toDataURL(c,d))):a(this.mozGetAsFile("blob",c))}:b.toDataURL&&f&&(b.toBlob=function(a,b,c){a(f(this.toDataURL(b,c)))})),"function"==typeof define&&define.amd?define(function(){return f}):a.dataURLtoBlob=f}(this);
});

require.register("serandomps~upload@master", function (exports, module) {
require('serandomps~upload@master/jquery.ui.widget.js');
require('serandomps~upload@master/load-image.all.min.js');
require('serandomps~upload@master/canvas-to-blob.min.js');
require('serandomps~upload@master/jquery.iframe-transport.js');
require('serandomps~upload@master/jquery.fileupload.js');
require('serandomps~upload@master/jquery.fileupload-process.js');
require('serandomps~upload@master/jquery.fileupload-image.js');
});

require.register("serandomps~accounts-authorized@master", function (exports, module) {
var dust = require('serandomps~dust@master')();
var serand = require('serandomps~serand@master');

dust.loadSource(dust.compile(require('serandomps~accounts-authorized@master/template.html'), 'accounts-authorized'));

module.exports = function (sandbox, fn, options) {
    var user = options.user;
    user.expires = user.expires - new Date().getTime();
    dust.render('accounts-authorized', options, function (err, out) {
        if (err) {
            return;
        }
        sandbox.append(out);
        fn(false, function () {
            $('.accounts-authorized', sandbox).remove();
        });
    });
};
});

require.define("serandomps~accounts-authorized@master/template.html", "<div class=\"accounts-authorized panel panel-default\">\n    <div class=\"panel-heading\">\n        <h3 class=\"panel-title\">Redirecting</h3>\n    </div>\n    <div class=\"panel-body\">\n        <form role=\"form\" action=\"{options.location}\" method=\"post\">\n            <input type=\"hidden\" name=\"id\" value=\"{user.tid}\">\n            <input type=\"hidden\" name=\"username\" value=\"{user.username}\">\n            <input type=\"hidden\" name=\"access_token\" value=\"{user.access}\">\n            <input type=\"hidden\" name=\"refresh_token\" value=\"{user.refresh}\">\n            <input type=\"hidden\" name=\"expires_in\" value=\"{user.expires}\">\n            <button type=\"submit\" class=\"btn btn-default redirect\">Redirect</button>\n        </form>\n    </div>\n</div>");

require.register("serandomps~accounts-authorize@master", function (exports, module) {
var dust = require('serandomps~dust@master')();
var serand = require('serandomps~serand@master');

dust.loadSource(dust.compile(require('serandomps~accounts-authorize@master/template.html'), 'accounts-authorize'));

module.exports = function (sandbox, fn, options) {
    dust.render('accounts-authorize', options, function (err, out) {
        if (err) {
            return;
        }
        sandbox.append(out);
        sandbox.on('click', '.accounts-authorize .allow', function (e) {
            serand.emit('user', 'authorized', options);
            return false;
        });
        fn(false, function () {
            $('.accounts-authorize', sandbox).remove();
        });
    });
};
});

require.define("serandomps~accounts-authorize@master/template.html", "<div class=\"accounts-authorize panel panel-default\">\n    <div class=\"panel-heading\">\n        <h3 class=\"panel-title\">Would you like to authorize {options.clientId}\n            to access your {opitons.scope} {user.username}?</h3>\n    </div>\n    <div class=\"panel-body\">\n        <form role=\"form\">\n            <button type=\"submit\" class=\"btn btn-default allow\">Allow</button>\n        </form>\n    </div>\n</div>");

require.register("accounts", function (exports, module) {
var dust = require('serandomps~dust@master')();

var serand = require('serandomps~serand@master');
var page = serand.page;
var redirect = serand.redirect;

var app = serand.boot('serandomps~accounts@master');
var layout = serand.layout(app);

var signin = require('accounts/controllers/signin.js');

var user;

var dest;

var can = function (permission) {
    return function (ctx, next) {
        if (user) {
            return next();
        }
        serand.emit('user', 'login', ctx.path);
    };
};

page('/', function (ctx) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .add('breadcrumb')
        .area('#middle')
        .add('accounts-home')
        .render();
});

page('/signin', signin.already, function (ctx) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-signin', ctx.options)
        .render();
});

page('/auth/oauth', function (ctx) {
    var el = $('#content');
    layout('one-column')
      .area('#header')
      .add('accounts-navigation')
      .area('#middle')
      .add('accounts-token', {
          scope: el.data('scope'),
          code: el.data('code'),
          error: el.data('error'),
          errorCode: el.data('errorCode')
      })
      .render();
});

page('/signup', function (ctx) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-signup')
        .render();
});

page('/authorize', function (ctx) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-authorize', ctx.state)
        .render();
});

page('/authorized', function (ctx) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-authorized', ctx.state)
        .render();
});

page('/vehicles', function (ctx) {
    layout('two-column')
        .area('#header')
        .add('accounts-navigation')
        .add('breadcrumb')
        .area('#right')
        .add('vehicles-search', ctx.query)
        .area('#middle')
        .add('vehicles-find', ctx.query)
        .render();
});

page('/vehicles/:id', can('vehicle:read'), function (ctx) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .add('breadcrumb')
        .area('#middle')
        .add('vehicles-findone', {
            id: ctx.params.id
        })
        .render();
});

page('/vehicles/:id/edit', can('vehicle:update'), function (ctx) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .add('breadcrumb')
        .area('#middle')
        .add('vehicles-create', {
            id: ctx.params.id
        })
        .render();
});

page('/add', can('vehicle:create'), function (ctx) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('vehicles-create', {})
        .render();
});

serand.on('user', 'login', function (path) {
    dest = path;
    serand.emit('user', 'authenticator', {location: dest}, function (err, uri) {
        redirect(uri);
    });
});

serand.on('user', 'ready', function (usr) {
    user = usr;
    page();
});

serand.on('user', 'logged in', function (usr, options) {
    user = usr;
    options = options || {};
    if (!options.location) {
        return redirect(dest || '/');
    }
    redirect('/authorize', {
        user: usr,
        options: options
    });
});

serand.on('user', 'authorized', function (options) {
    redirect('/authorized', options);
});

serand.on('user', 'logged out', function (usr) {
    user = null;
    redirect('/');
});

serand.emit('serand', 'ready');

});

require.register("accounts/controllers/signin.js", function (exports, module) {
var serand = require('serandomps~serand@master');
var redirect = serand.redirect;

var ready;

var pending;

var user;

var base = 'https://accounts.serandives.com';

serand.on('user', 'ready', function (usr) {
    user = usr;
    ready = true;
    if (!pending) {
        return;
    }
    pending();
});

serand.on('user', 'logged in', function (usr) {
    user = usr;
});

serand.on('user', 'logged out', function (usr) {
    user = null;
});

module.exports.already = function (ctx, next) {
    //TODO:final implement url param parsers or handlers
    //TODO: handle the flow when user has already signed in
    //account or autos module can depend on other modules, but no other module should depend on any
    //other module
    var clientId = ctx.query.client_id;
    if (!clientId) {
        serand.emit('user', 'authenticator', function (err, uri) {
            redirect(uri.substring(base.length));
        });
        return;
    }
    ctx.options = {
        clientId: clientId,
        scope: ctx.query.scope,
        location: ctx.query.redirect_uri
    };
    var process = function () {
        if (!user) {
            return next();
        }
        redirect('/authorize', {
            user: user,
            options: ctx.options
        });
    };
    if (!ready) {
        pending = process;
        return;
    }
    process();
};
});

require.define("accounts/component.json", "{\n    \"name\": \"accounts\",\n    \"description\": \"accounts\",\n    \"dependencies\": {\n        \"visionmedia/page.js\": \"*\",\n        \"serandomps/async\": \"master\",\n        \"serandomps/dust\": \"master\",\n        \"serandomps/serand\": \"master\",\n        \"serandomps/user\": \"master\",\n        \"serandomps/token\": \"master\",\n        \"serandomps/vehicles-create\": \"master\",\n        \"serandomps/vehicles-findone\": \"master\",\n        \"serandomps/vehicles-find\": \"master\",\n        \"serandomps/vehicles-search\": \"master\",\n        \"serandomps/breadcrumb\": \"master\",\n        \"serandomps/navigation\": \"master\",\n        \"serandomps/accounts-home\": \"master\",\n        \"serandomps/accounts-navigation\": \"master\",\n        \"serandomps/accounts-signup\": \"master\",\n        \"serandomps/accounts-signin\": \"master\",\n        \"serandomps/accounts-token\": \"master\",\n        \"serandomps/accounts-profile\": \"master\",\n        \"serandomps/accounts-authorize\": \"master\",\n        \"serandomps/accounts-authorized\": \"master\",\n        \"serandomps/upload\": \"master\"\n    },\n    \"scripts\": [\"boot.js\", \"controllers/signin.js\"],\n    \"styles\": [\"nunito.css\", \"oxygen.css\", \"boot.css\"],\n    \"templates\": [\"component.json\", \"one-column.html\", \"two-column.html\", \"three-column.html\"],\n    \"images\": [\n        \"images/logo.png\",\n        \"images/logo@2x.png\"\n    ],\n    \"files\": [\"index.html\"],\n    \"main\": \"boot.js\"\n}\n");

require.define("accounts/one-column.html", "<div class=\"two-column\">\n    <div class=\"container clearfix\">\n        <div id=\"header\"></div>\n        <div id=\"middle\">\n        </div>\n    </div>\n</div>");

require.define("accounts/two-column.html", "<div class=\"two-column\">\n    <div class=\"container clearfix\">\n        <div id=\"header\"></div>\n        <div class=\"row\">\n            <div id=\"right\" class=\"col-md-3\"></div>\n            <div id=\"middle\" class=\"col-md-9\"></div>\n        </div>\n    </div>\n</div>");

require.define("accounts/three-column.html", "<div class=\"three-column\">\n    <div id=\"header\"></div>\n\n    <div class=\"container\">\n        <div class=\"row\">\n            <div id=\"left\" class=\"col-md-3\"></div>\n            <div id=\"middle\" class=\"col-md-9\"></div>\n        </div>\n    </div>\n</div>");

require("accounts");
