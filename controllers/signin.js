var serand = require('serand');
var utils = require('utils');
var redirect = serand.redirect;

var ready;

var pending = [];

var user;

var base = utils.resolve('accounts:///');

serand.on('user', 'ready', function (usr) {
    user = usr;
    ready = true;
    if (!pending.length) {
        return;
    }
    pending.forEach(function (fn) {
        fn();
    });
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
        serand.emit('user', 'authenticator', {
            type: 'serandives',
            location: utils.resolve('accounts:///auth')
        }, function (err, uri) {
            if (err) {
                return console.error(err);
            }
            uri = '/' + uri.substring(base.length);
            redirect(uri);
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
        pending.push(process);
        return;
    }
    process();
};

module.exports.force = function (ctx, next) {
    if (user) {
        return next();
    }
    var path = ctx.path;
    serand.store('state', {
        path: path
    });
    var signin = utils.resolve('accounts:///signin');
    if (ready) {
        return redirect(signin);
    }
    pending.push(function () {
        user ? next() : redirect(signin);
    });
};
