// Generated by CoffeeScript 1.3.3
var Events,
  __slice = [].slice;

Events = (function() {

  function Events() {}

  Events.prototype.bind = function(ev, callback) {
    var calls, evs, name, _i, _len, _results;
    evs = ev.split(' ');
    calls = this.hasOwnProperty('_callbacks') && this._callbacks || (this._callbacks = {});
    _results = [];
    for (_i = 0, _len = evs.length; _i < _len; _i++) {
      name = evs[_i];
      calls[name] || (calls[name] = []);
      _results.push(calls[name].push(callback));
    }
    return _results;
  };

  Events.prototype.on = Events.prototype.bind;

  Events.prototype.one = function(ev, callback) {
    return this.bind(ev, function() {
      this.unbind(ev, arguments.callee);
      return callback.apply(this, arguments);
    });
  };

  Events.prototype.trigger = function() {
    var args, callback, ev, list, _i, _len, _ref;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    ev = args.shift();
    list = this.hasOwnProperty('_callbacks') && ((_ref = this._callbacks) != null ? _ref[ev] : void 0);
    if (!list) {
      return;
    }
    for (_i = 0, _len = list.length; _i < _len; _i++) {
      callback = list[_i];
      callback.apply(this, args);
    }
    return true;
  };

  Events.prototype.unbind = function(ev, callback) {
    var cb, i, list, _i, _len, _ref;
    if (!ev) {
      this._callbacks = {};
      return this;
    }
    list = (_ref = this._callbacks) != null ? _ref[ev] : void 0;
    if (!list) {
      return this;
    }
    if (!callback) {
      delete this._callbacks[ev];
      return this;
    }
    for (i = _i = 0, _len = list.length; _i < _len; i = ++_i) {
      cb = list[i];
      if (!(cb === callback)) {
        continue;
      }
      list = list.slice();
      list.splice(i, 1);
      this._callbacks[ev] = list;
      break;
    }
    return this;
  };

  return Events;

})();
// Generated by CoffeeScript 1.3.3
var Hoodie,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Hoodie = (function(_super) {

  __extends(Hoodie, _super);

  Hoodie.prototype.modules = function() {
    return {
      'store': Hoodie.Store,
      'config': Hoodie.Config,
      'account': Hoodie.Account,
      'remote': Hoodie.Remote,
      'email': Hoodie.Email
    };
  };

  function Hoodie(base_url) {
    this.base_url = base_url != null ? base_url : '';
    this.base_url = this.base_url.replace(/\/+$/, '');
    this._load_modules();
  }

  Hoodie.prototype.request = function(type, path, options) {
    var defaults;
    if (options == null) {
      options = {};
    }
    defaults = {
      type: type,
      url: "" + this.base_url + path,
      xhrFields: {
        withCredentials: true
      },
      crossDomain: true,
      dataType: 'json'
    };
    return $.ajax($.extend(defaults, options));
  };

  Hoodie.prototype.defer = $.Deferred;

  Hoodie.prototype.isPromise = function(obj) {
    return typeof obj.done === 'function' && typeof obj.fail === 'function';
  };

  Hoodie.prototype._load_modules = function() {
    var Module, instance_name, _ref, _results;
    _ref = this.modules();
    _results = [];
    for (instance_name in _ref) {
      Module = _ref[instance_name];
      _results.push(this[instance_name] = new Module(this));
    }
    return _results;
  };

  return Hoodie;

})(Events);
// Generated by CoffeeScript 1.3.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Hoodie.Account = (function() {

  Account.prototype.username = void 0;

  function Account(hoodie) {
    this.hoodie = hoodie;
    this._handle_sign_out = __bind(this._handle_sign_out, this);

    this._handle_sign_in = __bind(this._handle_sign_in, this);

    this.authenticate = __bind(this.authenticate, this);

    this.username = this.hoodie.config.get('_account.username');
    this.on('signed_in', this._handle_sign_in);
    this.on('signed_out', this._handle_sign_out);
  }

  Account.prototype.authenticate = function() {
    var defer,
      _this = this;
    defer = this.hoodie.defer();
    if (!this.username) {
      return defer.reject().promise();
    }
    if (this._authenticated === true) {
      return defer.resolve(this.username).promise();
    }
    if (this._authenticated === false) {
      return defer.reject().promise();
    }
    this._auth_request = this.hoodie.request('GET', "/_session");
    this._auth_request.done(function(response) {
      if (response.userCtx.name) {
        _this._authenticated = true;
        _this.username = response.userCtx.name;
        return defer.resolve(_this.username);
      } else {
        _this._authenticated = false;
        delete _this.username;
        _this.hoodie.trigger('account:error:unauthenticated');
        return defer.reject();
      }
    });
    this._auth_request.fail(function(xhr) {
      var error;
      try {
        error = JSON.parse(xhr.responseText);
      } catch (e) {
        error = {
          error: xhr.responseText || "unknown"
        };
      }
      return defer.reject(error);
    });
    return defer.promise();
  };

  Account.prototype.sign_up = function(username, password) {
    var data, defer, handle_succes, key, request_promise,
      _this = this;
    if (password == null) {
      password = '';
    }
    defer = this.hoodie.defer();
    key = "" + this._prefix + ":" + username;
    data = {
      _id: key,
      name: username,
      type: 'user',
      roles: [],
      password: password
    };
    request_promise = this.hoodie.request('PUT', "/_users/" + (encodeURIComponent(key)), {
      data: JSON.stringify(data),
      contentType: 'application/json'
    });
    handle_succes = function(response) {
      _this.hoodie.trigger('account:signed_up', username);
      _this._doc._rev = response.rev;
      return _this.sign_in(username, password).then(defer.resolve, defer.reject);
    };
    request_promise.then(handle_succes, defer.reject);
    return defer.promise();
  };

  Account.prototype.sign_in = function(username, password) {
    var defer, handle_succes, request_promise,
      _this = this;
    if (password == null) {
      password = '';
    }
    defer = this.hoodie.defer();
    request_promise = this.hoodie.request('POST', '/_session', {
      data: {
        name: username,
        password: password
      }
    });
    handle_succes = function(response) {
      _this.hoodie.trigger('account:signed_in', username);
      _this.fetch();
      return defer.resolve(username, response);
    };
    request_promise.then(handle_succes, defer.reject);
    return defer.promise();
  };

  Account.prototype.login = Account.prototype.sign_in;

  Account.prototype.change_password = function(current_password, new_password) {
    var data, defer, key,
      _this = this;
    if (current_password == null) {
      current_password = '';
    }
    defer = this.hoodie.defer();
    if (!this.username) {
      defer.reject({
        error: "unauthenticated",
        reason: "not logged in"
      });
      return defer.promise();
    }
    key = "" + this._prefix + ":" + this.username;
    data = $.extend({}, this._doc);
    delete data.salt;
    delete data.password_sha;
    data.password = new_password;
    return this.hoodie.request('PUT', "/_users/" + (encodeURIComponent(key)), {
      data: JSON.stringify(data),
      contentType: "application/json",
      success: function(response) {
        _this.fetch();
        return defer.resolve();
      },
      error: function(xhr) {
        var error;
        try {
          error = JSON.parse(xhr.responseText);
        } catch (e) {
          error = {
            error: xhr.responseText || "unknown"
          };
        }
        return defer.reject(error);
      }
    });
  };

  Account.prototype.sign_out = function() {
    var _this = this;
    return this.hoodie.request('DELETE', '/_session', {
      success: function() {
        return _this.hoodie.trigger('account:signed_out');
      }
    });
  };

  Account.prototype.logout = Account.prototype.sign_out;

  Account.prototype.on = function(event, cb) {
    return this.hoodie.on("account:" + event, cb);
  };

  Account.prototype.db = function() {
    var _ref;
    return (_ref = this.username) != null ? _ref.toLowerCase().replace(/@/, "$").replace(/\./g, "_") : void 0;
  };

  Account.prototype.fetch = function() {
    var defer, key,
      _this = this;
    defer = this.hoodie.defer();
    if (!this.username) {
      defer.reject({
        error: "unauthenticated",
        reason: "not logged in"
      });
      return defer.promise();
    }
    key = "" + this._prefix + ":" + this.username;
    this.hoodie.request('GET', "/_users/" + (encodeURIComponent(key)), {
      success: function(response) {
        _this._doc = response;
        return defer.resolve(response);
      },
      error: function(xhr) {
        var error;
        try {
          error = JSON.parse(xhr.responseText);
        } catch (e) {
          error = {
            error: xhr.responseText || "unknown"
          };
        }
        return defer.reject(error);
      }
    });
    return defer.promise();
  };

  Account.prototype.destroy = function() {
    var _this = this;
    return this.fetch().pipe(function() {
      var key;
      key = "" + _this._prefix + ":" + _this.username;
      return _this.hoodie.request('DELETE', "/_users/" + (encodeURIComponent(key)) + "?rev=" + _this._doc._rev);
    });
  };

  Account.prototype._prefix = 'org.couchdb.user';

  Account.prototype._doc = {};

  Account.prototype._handle_sign_in = function(username) {
    this.username = username;
    console.log('_handle_sign_in', this.username);
    this.hoodie.config.set('_account.username', this.username);
    return this._authenticated = true;
  };

  Account.prototype._handle_sign_out = function() {
    delete this.username;
    this.hoodie.config.remove('_account.username');
    return this._authenticated = false;
  };

  return Account;

})();
// Generated by CoffeeScript 1.3.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Hoodie.Config = (function() {

  Config.prototype.type = '$config';

  Config.prototype.id = 'hoodie';

  Config.prototype.cache = {};

  function Config(hoodie, options) {
    var _this = this;
    this.hoodie = hoodie;
    if (options == null) {
      options = {};
    }
    this.clear = __bind(this.clear, this);

    if (options.type) {
      this.type = options.type;
    }
    if (options.id) {
      this.id = options.id;
    }
    this.hoodie.store.load(this.type, this.id).done(function(obj) {
      return _this.cache = obj;
    });
    this.hoodie.on('account:signed_out', this.clear);
  }

  Config.prototype.set = function(key, value) {
    var is_silent, update;
    if (this.cache[key] === value) {
      return;
    }
    this.cache[key] = value;
    update = {};
    update[key] = value;
    is_silent = key.charAt(0) === '_';
    return this.hoodie.store.update(this.type, this.id, update, {
      silent: is_silent
    });
  };

  Config.prototype.get = function(key) {
    return this.cache[key];
  };

  Config.prototype.clear = function() {
    this.cache = {};
    return this.hoodie.store.destroy(this.type, this.id);
  };

  Config.prototype.remove = Config.prototype.set;

  return Config;

})();
// Generated by CoffeeScript 1.3.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Hoodie.Email = (function() {

  function Email(hoodie) {
    this.hoodie = hoodie;
    this._handle_email_update = __bind(this._handle_email_update, this);

  }

  Email.prototype.send = function(email_attributes) {
    var attributes, defer,
      _this = this;
    if (email_attributes == null) {
      email_attributes = {};
    }
    defer = this.hoodie.defer();
    attributes = $.extend({}, email_attributes);
    if (!this._is_valid_email(email_attributes.to)) {
      attributes.error = "Invalid email address (" + (attributes.to || 'empty') + ")";
      return defer.reject(attributes).promise();
    }
    this.hoodie.store.create('$email', attributes).then(function(obj) {
      return _this._handle_email_update(defer, obj);
    });
    return defer.promise();
  };

  Email.prototype._is_valid_email = function(email) {
    if (email == null) {
      email = '';
    }
    return /@/.test(email);
  };

  Email.prototype._handle_email_update = function(defer, attributes) {
    var _this = this;
    if (attributes == null) {
      attributes = {};
    }
    if (attributes.error) {
      return defer.reject(attributes);
    } else if (attributes.delivered_at) {
      return defer.resolve(attributes);
    } else {
      return this.hoodie.one("remote:updated:$email:" + attributes.id, function(attributes) {
        return _this._handle_email_update(defer, attributes);
      });
    }
  };

  return Email;

})();
// Generated by CoffeeScript 1.3.3

Hoodie.Errors = {
  INVALID_KEY: function(id_or_type) {
    var key;
    key = id_or_type.id ? 'id' : 'type';
    return new Error("invalid " + key + " '" + id_or_type[key] + "': numbers and lowercase letters allowed only");
  },
  INVALID_ARGUMENTS: function(msg) {
    return new Error(msg);
  },
  NOT_FOUND: function(type, id) {
    return new Error("" + type + " with " + id + " could not be found");
  }
};
// Generated by CoffeeScript 1.3.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Hoodie.Remote = (function() {

  Remote.prototype.active = true;

  function Remote(hoodie) {
    this.hoodie = hoodie;
    this._handle_push_success = __bind(this._handle_push_success, this);

    this._handle_pull_results = __bind(this._handle_pull_results, this);

    this._handle_pull_error = __bind(this._handle_pull_error, this);

    this._handle_pull_success = __bind(this._handle_pull_success, this);

    this._restart_pull_request = __bind(this._restart_pull_request, this);

    this.sync = __bind(this.sync, this);

    this.push = __bind(this.push, this);

    this.pull = __bind(this.pull, this);

    this.disconnect = __bind(this.disconnect, this);

    this.connect = __bind(this.connect, this);

    this.deactivate = __bind(this.deactivate, this);

    this.activate = __bind(this.activate, this);

    if (this.hoodie.config.get('_remote.active') != null) {
      this.active = this.hoodie.config.get('_remote.active');
    }
    if (this.active) {
      this.activate();
    }
  }

  Remote.prototype.activate = function() {
    this.hoodie.config.set('_remote.active', true);
    this.hoodie.on('account:signed_out', this.disconnect);
    this.hoodie.on('account:signed_in', this.sync);
    return this.connect();
  };

  Remote.prototype.deactivate = function() {
    this.hoodie.config.set('_remote.active', false);
    this.hoodie.unbind('account:signed_in', this.sync);
    this.hoodie.unbind('account:signed_out', this.disconnect);
    return this.disconnect();
  };

  Remote.prototype.connect = function() {
    this.active = true;
    return this.hoodie.account.authenticate().pipe(this.sync);
  };

  Remote.prototype.disconnect = function() {
    var _ref, _ref1;
    this.active = false;
    this.hoodie.unbind('store:dirty:idle', this.push);
    this.hoodie.unbind('account:signed_in', this.connect);
    if ((_ref = this._pull_request) != null) {
      _ref.abort();
    }
    return (_ref1 = this._push_request) != null ? _ref1.abort() : void 0;
  };

  Remote.prototype.pull = function() {
    this._pull_request = this.hoodie.request('GET', this._pull_url(), {
      contentType: 'application/json'
    });
    if (this.active) {
      window.clearTimeout(this._pull_request_timeout);
      this._pull_request_timeout = window.setTimeout(this._restart_pull_request, 25000);
    }
    return this._pull_request.then(this._handle_pull_success, this._handle_pull_error);
  };

  Remote.prototype.push = function(docs) {
    var doc, docs_for_remote;
    if (!$.isArray(docs)) {
      docs = this.hoodie.store.changed_docs();
    }
    if (docs.length === 0) {
      return this.hoodie.defer().resolve([]).promise();
    }
    docs_for_remote = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = docs.length; _i < _len; _i++) {
        doc = docs[_i];
        _results.push(this._parse_for_remote(doc));
      }
      return _results;
    }).call(this);
    this._push_request = this.hoodie.request('POST', "/" + (encodeURIComponent(this.hoodie.account.db())) + "/_bulk_docs", {
      dataType: 'json',
      processData: false,
      contentType: 'application/json',
      data: JSON.stringify({
        docs: docs_for_remote,
        new_edits: false
      })
    });
    return this._push_request.done(this._handle_push_success(docs, docs_for_remote));
  };

  Remote.prototype.sync = function(docs) {
    if (this.active) {
      this.hoodie.unbind('store:dirty:idle', this.push);
      this.hoodie.on('store:dirty:idle', this.push);
    }
    return this.push(docs).pipe(this.pull);
  };

  Remote.prototype.on = function(event, cb) {
    return this.hoodie.on("remote:" + event, cb);
  };

  Remote.prototype._pull_url = function() {
    var since;
    since = this.hoodie.config.get('_remote.seq') || 0;
    if (this.active) {
      return "/" + (encodeURIComponent(this.hoodie.account.db())) + "/_changes?include_docs=true&heartbeat=10000&feed=longpoll&since=" + since;
    } else {
      return "/" + (encodeURIComponent(this.hoodie.account.db())) + "/_changes?include_docs=true&since=" + since;
    }
  };

  Remote.prototype._restart_pull_request = function() {
    var _ref;
    return (_ref = this._pull_request) != null ? _ref.abort() : void 0;
  };

  Remote.prototype._handle_pull_success = function(response) {
    this.hoodie.config.set('_remote.seq', response.last_seq);
    this._handle_pull_results(response.results);
    if (this.active) {
      return this.pull();
    }
  };

  Remote.prototype._handle_pull_error = function(xhr, error, resp) {
    switch (xhr.status) {
      case 403:
        this.hoodie.trigger('remote:error:unauthenticated', error);
        this.disconnect();
        if (this.active) {
          return this.hoodie.one('account:signed_in', this.connect);
        }
        break;
      case 404:
        return window.setTimeout(this.pull, 3000);
      case 500:
        this.hoodie.trigger('remote:error:server', error);
        return window.setTimeout(this.pull, 3000);
      default:
        if (!this.active) {
          return;
        }
        if (xhr.statusText === 'abort') {
          if (this.active) {
            return this.pull();
          }
        } else {
          if (this.active) {
            return window.setTimeout(this.pull, 3000);
          }
        }
    }
  };

  Remote.prototype._valid_special_attributes = ['_id', '_rev', '_deleted', '_revisions', '_attachments'];

  Remote.prototype._parse_for_remote = function(obj) {
    var attr, attributes;
    attributes = $.extend({}, obj);
    for (attr in attributes) {
      if (~this._valid_special_attributes.indexOf(attr)) {
        continue;
      }
      if (!/^_/.test(attr)) {
        continue;
      }
      delete attributes[attr];
    }
    attributes._id = "" + attributes.type + "/" + attributes.id;
    delete attributes.id;
    this._add_revision_to(attributes);
    return attributes;
  };

  Remote.prototype._generate_new_revision_id = function() {
    var timestamp, uuid;
    this._timezone_offset || (this._timezone_offset = new Date().getTimezoneOffset() * 60);
    timestamp = Date.now() + this._timezone_offset;
    uuid = this.hoodie.store.uuid(5);
    return "" + uuid + "#" + timestamp;
  };

  Remote.prototype._add_revision_to = function(attributes) {
    var current_rev_id, current_rev_nr, new_revision_id, _ref;
    try {
      _ref = attributes._rev.split(/-/), current_rev_nr = _ref[0], current_rev_id = _ref[1];
    } catch (_error) {}
    current_rev_nr = parseInt(current_rev_nr) || 0;
    new_revision_id = this._generate_new_revision_id();
    attributes._rev = "" + (current_rev_nr + 1) + "-" + new_revision_id;
    attributes._revisions = {
      start: 1,
      ids: [new_revision_id]
    };
    if (current_rev_id) {
      attributes._revisions.start += current_rev_nr;
      return attributes._revisions.ids.push(current_rev_id);
    }
  };

  Remote.prototype._parse_from_pull = function(obj) {
    var id, _ref;
    id = obj._id || obj.id;
    delete obj._id;
    _ref = id.split(/\//), obj.type = _ref[0], obj.id = _ref[1];
    if (obj.created_at) {
      obj.created_at = new Date(Date.parse(obj.created_at));
    }
    if (obj.updated_at) {
      obj.updated_at = new Date(Date.parse(obj.updated_at));
    }
    if (obj.rev) {
      obj._rev = obj.rev;
      delete obj.rev;
    }
    return obj;
  };

  Remote.prototype._parse_from_push = function(obj) {
    var id, _ref;
    id = obj._id || delete obj._id;
    _ref = obj.id.split(/\//), obj.type = _ref[0], obj.id = _ref[1];
    obj._rev = obj.rev;
    delete obj.rev;
    delete obj.ok;
    return obj;
  };

  Remote.prototype._handle_pull_results = function(changes) {
    var doc, promise, _changed_docs, _destroyed_docs, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _results,
      _this = this;
    _destroyed_docs = [];
    _changed_docs = [];
    for (_i = 0, _len = changes.length; _i < _len; _i++) {
      doc = changes[_i].doc;
      doc = this._parse_from_pull(doc);
      if (doc._deleted) {
        _destroyed_docs.push([
          doc, this.hoodie.store.destroy(doc.type, doc.id, {
            remote: true
          })
        ]);
      } else {
        _changed_docs.push([
          doc, this.hoodie.store.update(doc.type, doc.id, doc, {
            remote: true
          })
        ]);
      }
    }
    for (_j = 0, _len1 = _destroyed_docs.length; _j < _len1; _j++) {
      _ref = _destroyed_docs[_j], doc = _ref[0], promise = _ref[1];
      promise.then(function(object) {
        _this.hoodie.trigger('remote:destroyed', doc.type, doc.id, object);
        _this.hoodie.trigger("remote:destroyed:" + doc.type, doc.id, object);
        _this.hoodie.trigger("remote:destroyed:" + doc.type + ":" + doc.id, object);
        _this.hoodie.trigger('remote:changed', 'destroyed', doc.type, doc.id, object);
        _this.hoodie.trigger("remote:changed:" + doc.type, 'destroyed', doc.id, object);
        return _this.hoodie.trigger("remote:changed:" + doc.type + ":" + doc.id, 'destroyed', object);
      });
    }
    _results = [];
    for (_k = 0, _len2 = _changed_docs.length; _k < _len2; _k++) {
      _ref1 = _changed_docs[_k], doc = _ref1[0], promise = _ref1[1];
      _results.push(promise.then(function(object, object_was_created) {
        var event;
        event = object_was_created ? 'created' : 'updated';
        _this.hoodie.trigger("remote:" + event, doc.type, doc.id, object);
        _this.hoodie.trigger("remote:" + event + ":" + doc.type, doc.id, object);
        _this.hoodie.trigger("remote:" + event + ":" + doc.type + ":" + doc.id, object);
        _this.hoodie.trigger("remote:changed", event, doc.type, doc.id, object);
        _this.hoodie.trigger("remote:changed:" + doc.type, event, doc.id, object);
        return _this.hoodie.trigger("remote:changed:" + doc.type + ":" + doc.id, event, object);
      }));
    }
    return _results;
  };

  Remote.prototype._handle_push_success = function(docs, pushed_docs) {
    var _this = this;
    return function() {
      var doc, i, options, update, _i, _len, _results;
      _results = [];
      for (i = _i = 0, _len = docs.length; _i < _len; i = ++_i) {
        doc = docs[i];
        update = {
          _rev: pushed_docs[i]._rev
        };
        options = {
          remote: true
        };
        _results.push(_this.hoodie.store.update(doc.type, doc.id, update, options));
      }
      return _results;
    };
  };

  return Remote;

})();
// Generated by CoffeeScript 1.3.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Hoodie.Store = (function() {

  function Store(hoodie) {
    this.hoodie = hoodie;
    this.clear = __bind(this.clear, this);

    if (!this.is_persistent()) {
      this.db = {
        getItem: function() {
          return null;
        },
        setItem: function() {
          return null;
        },
        removeItem: function() {
          return null;
        },
        key: function() {
          return null;
        },
        length: function() {
          return 0;
        },
        clear: function() {
          return null;
        }
      };
    }
    this.hoodie.on('account:signed_out', this.clear);
  }

  Store.prototype.db = {
    getItem: function(key) {
      return window.localStorage.getItem(key);
    },
    setItem: function(key, value) {
      return window.localStorage.setItem(key, value);
    },
    removeItem: function(key) {
      return window.localStorage.removeItem(key);
    },
    key: function(nr) {
      return window.localStorage.key(nr);
    },
    length: function() {
      return window.localStorage.length;
    },
    clear: function() {
      return window.localStorage.clear();
    }
  };

  Store.prototype.save = function(type, id, object, options) {
    var defer, is_new;
    if (options == null) {
      options = {};
    }
    defer = this.hoodie.defer();
    if (typeof object !== 'object') {
      defer.reject(Hoodie.Errors.INVALID_ARGUMENTS("object is " + (typeof object)));
      return defer.promise();
    }
    object = $.extend({}, object);
    if (id && !this._is_valid_id(id)) {
      return defer.reject(Hoodie.Errors.INVALID_KEY({
        id: id
      })).promise();
    }
    if (!this._is_valid_type(type)) {
      return defer.reject(Hoodie.Errors.INVALID_KEY({
        type: type
      })).promise();
    }
    if (id) {
      is_new = typeof this._cached["" + type + "/" + id] !== 'object';
    } else {
      is_new = true;
      id = this.uuid();
    }
    if (options.remote) {
      object._synced_at = this._now();
    } else if (!options.silent) {
      object.updated_at = this._now();
      object.created_at || (object.created_at = object.updated_at);
    }
    delete object.id;
    delete object.type;
    try {
      object = this.cache(type, id, object, options);
      defer.resolve(object, is_new).promise();
    } catch (error) {
      defer.reject(error).promise();
    }
    return defer.promise();
  };

  Store.prototype.create = function(type, object, options) {
    if (options == null) {
      options = {};
    }
    return this.save(type, void 0, object);
  };

  Store.prototype.update = function(type, id, object_update, options) {
    var defer, _load_promise,
      _this = this;
    if (options == null) {
      options = {};
    }
    defer = this.hoodie.defer();
    _load_promise = this.load(type, id).pipe(function(current_obj) {
      var changed_properties, key, value;
      if (typeof object_update === 'function') {
        object_update = object_update($.extend({}, current_obj));
      }
      if (!object_update) {
        return defer.resolve(current_obj);
      }
      changed_properties = (function() {
        var _results;
        _results = [];
        for (key in object_update) {
          value = object_update[key];
          if (!(current_obj[key] !== value)) {
            continue;
          }
          current_obj[key] = value;
          _results.push(key);
        }
        return _results;
      })();
      if (!changed_properties.length) {
        return defer.resolve(current_obj);
      }
      return _this.save(type, id, current_obj, options).then(defer.resolve, defer.reject);
    });
    _load_promise.fail(function() {
      return _this.save(type, id, object_update, options).then(defer.resolve, defer.reject);
    });
    return defer.promise();
  };

  Store.prototype.updateAll = function(filter_or_objects, object_update, options) {
    var promise,
      _this = this;
    if (options == null) {
      options = {};
    }
    if (this.hoodie.isPromise(filter_or_objects)) {
      promise = filter_or_objects;
    } else {
      promise = this.hoodie.defer().resolve(filter_or_objects).resolve();
    }
    return promise.pipe(function(objects) {
      var defer, object, _update_promises;
      defer = _this.hoodie.defer();
      _update_promises = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = objects.length; _i < _len; _i++) {
          object = objects[_i];
          _results.push(this.update(object.type, object.id, object_update, options));
        }
        return _results;
      }).call(_this);
      $.when.apply(null, _update_promises).then(defer.resolve);
      return defer.promise();
    });
  };

  Store.prototype.load = function(type, id) {
    var defer, object;
    defer = this.hoodie.defer();
    if (!(typeof type === 'string' && typeof id === 'string')) {
      return defer.reject(Hoodie.Errors.INVALID_ARGUMENTS("type & id are required")).promise();
    }
    try {
      object = this.cache(type, id);
      if (!object) {
        return defer.reject(Hoodie.Errors.NOT_FOUND(type, id)).promise();
      }
      defer.resolve(object);
    } catch (error) {
      defer.reject(error);
    }
    return defer.promise();
  };

  Store.prototype.loadAll = function(filter) {
    var current_type, defer, id, key, keys, obj, results, type;
    if (filter == null) {
      filter = function() {
        return true;
      };
    }
    defer = this.hoodie.defer();
    keys = this._index();
    if (typeof filter === 'string') {
      type = filter;
      filter = function(obj) {
        return obj.type === type;
      };
    }
    try {
      results = (function() {
        var _i, _len, _ref, _results;
        _results = [];
        for (_i = 0, _len = keys.length; _i < _len; _i++) {
          key = keys[_i];
          if (!(this._is_semantic_id(key))) {
            continue;
          }
          _ref = key.split('/'), current_type = _ref[0], id = _ref[1];
          obj = this.cache(current_type, id);
          if (filter(obj)) {
            _results.push(obj);
          } else {
            continue;
          }
        }
        return _results;
      }).call(this);
      defer.resolve(results).promise();
    } catch (error) {
      defer.reject(error).promise();
    }
    return defer.promise();
  };

  Store.prototype["delete"] = function(type, id, options) {
    var defer, key, object;
    if (options == null) {
      options = {};
    }
    defer = this.hoodie.defer();
    object = this.cache(type, id);
    if (!object) {
      return defer.reject(Hoodie.Errors.NOT_FOUND(type, id)).promise();
    }
    if (object._synced_at && !options.remote) {
      object._deleted = true;
      this.cache(type, id, object);
    } else {
      key = "" + type + "/" + id;
      this.db.removeItem(key);
      this._cached[key] = false;
      this.clear_changed(type, id);
    }
    return defer.resolve($.extend({}, object)).promise();
  };

  Store.prototype.destroy = Store.prototype["delete"];

  Store.prototype.cache = function(type, id, object, options) {
    var key;
    if (object == null) {
      object = false;
    }
    if (options == null) {
      options = {};
    }
    key = "" + type + "/" + id;
    if (object) {
      this._cached[key] = $.extend(object, {
        type: type,
        id: id
      });
      this._setObject(type, id, object);
      if (options.remote) {
        this.clear_changed(type, id);
        return $.extend({}, this._cached[key]);
      }
    } else {
      if (this._cached[key] != null) {
        return $.extend({}, this._cached[key]);
      }
      this._cached[key] = this._getObject(type, id);
    }
    if (this._cached[key] && (this._is_dirty(this._cached[key]) || this._is_marked_as_deleted(this._cached[key]))) {
      this.mark_as_changed(type, id, this._cached[key]);
    } else {
      this.clear_changed(type, id);
    }
    if (this._cached[key]) {
      return $.extend({}, this._cached[key]);
    } else {
      return this._cached[key];
    }
  };

  Store.prototype.clear_changed = function(type, id) {
    var key;
    if (type && id) {
      key = "" + type + "/" + id;
      delete this._dirty[key];
    } else {
      this._dirty = {};
    }
    return this.hoodie.trigger('store:dirty');
  };

  Store.prototype.is_marked_as_deleted = function(type, id) {
    return this._is_marked_as_deleted(this.cache(type, id));
  };

  Store.prototype.mark_as_changed = function(type, id, object) {
    var key, timeout,
      _this = this;
    key = "" + type + "/" + id;
    this._dirty[key] = object;
    this.hoodie.trigger('store:dirty');
    timeout = 2000;
    window.clearTimeout(this._dirty_timeout);
    return this._dirty_timeout = window.setTimeout((function() {
      return _this.hoodie.trigger('store:dirty:idle');
    }), timeout);
  };

  Store.prototype.changed_docs = function() {
    var key, object, _ref, _results;
    _ref = this._dirty;
    _results = [];
    for (key in _ref) {
      object = _ref[key];
      _results.push(object);
    }
    return _results;
  };

  Store.prototype.is_dirty = function(type, id) {
    if (!type) {
      return $.isEmptyObject(this._dirty);
    }
    return this._is_dirty(this.cache(type, id));
  };

  Store.prototype.clear = function() {
    var defer;
    defer = this.hoodie.defer();
    try {
      this.db.clear();
      this._cached = {};
      this.clear_changed();
      defer.resolve();
    } catch (error) {
      defer.reject(error);
    }
    return defer.promise();
  };

  Store.prototype.is_persistent = function() {
    try {
      if (!window.localStorage) {
        return false;
      }
      localStorage.setItem('Storage-Test', "1");
      if (localStorage.getItem('Storage-Test') !== "1") {
        return false;
      }
      localStorage.removeItem('Storage-Test');
    } catch (e) {
      return false;
    }
    return true;
  };

  Store.prototype.uuid = function(len) {
    var chars, i, radix;
    if (len == null) {
      len = 7;
    }
    chars = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
    radix = chars.length;
    return ((function() {
      var _i, _results;
      _results = [];
      for (i = _i = 0; 0 <= len ? _i < len : _i > len; i = 0 <= len ? ++_i : --_i) {
        _results.push(chars[0 | Math.random() * radix]);
      }
      return _results;
    })()).join('');
  };

  Store.prototype._setObject = function(type, id, object) {
    var key, store;
    key = "" + type + "/" + id;
    store = $.extend({}, object);
    delete store.type;
    delete store.id;
    return this.db.setItem(key, JSON.stringify(store));
  };

  Store.prototype._getObject = function(type, id) {
    var json, key, obj;
    key = "" + type + "/" + id;
    json = this.db.getItem(key);
    if (json) {
      obj = JSON.parse(json);
      obj.type = type;
      obj.id = id;
      if (obj.created_at) {
        obj.created_at = new Date(Date.parse(obj.created_at));
      }
      if (obj.updated_at) {
        obj.updated_at = new Date(Date.parse(obj.updated_at));
      }
      if (obj._synced_at) {
        obj._synced_at = new Date(Date.parse(obj._synced_at));
      }
      return obj;
    } else {
      return false;
    }
  };

  Store.prototype._now = function() {
    return new Date;
  };

  Store.prototype._is_valid_id = function(key) {
    return /^[a-z0-9\-]+$/.test(key);
  };

  Store.prototype._is_valid_type = function(key) {
    return /^[a-z$][a-z0-9]+$/.test(key);
  };

  Store.prototype._is_semantic_id = function(key) {
    return /^[a-z$][a-z0-9]+\/[a-z0-9]+$/.test(key);
  };

  Store.prototype._cached = {};

  Store.prototype._dirty = {};

  Store.prototype._is_dirty = function(object) {
    if (!object._synced_at) {
      return true;
    }
    if (!object.updated_at) {
      return false;
    }
    return object._synced_at.getTime() < object.updated_at.getTime();
  };

  Store.prototype._is_marked_as_deleted = function(object) {
    return object._deleted === true;
  };

  Store.prototype._index = function() {
    var i, _i, _ref, _results;
    _results = [];
    for (i = _i = 0, _ref = this.db.length(); 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      _results.push(this.db.key(i));
    }
    return _results;
  };

  return Store;

})();