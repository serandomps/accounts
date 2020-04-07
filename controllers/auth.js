var serand = require('serand');
var utils = require('utils');
var auth = require('auth');
var redirect = serand.redirect;

var base = utils.resolve('accounts://');

module.exports.signin = function (ctx, next) {
    var client = ctx.query.client_id;
    var location = ctx.query.redirect_uri
    if (!client || !location) {
        auth.authenticator({
            type: 'serandives',
            location: location || utils.resolve('accounts:///auth')
        }, function (err, uri) {
            if (err) {
                return next(err);
            }
            uri = uri.substring(base.length);
            redirect(uri);
        });
        return;
    }
    if (ctx.token) {
        redirect('/authorize', null, {
            token: ctx.token,
            options: {
                client: client,
                scope: ctx.query.scope,
                location: location
            }
        });
        return;
    }
    serand.store('oauth', null);
    next();
};

module.exports.signup = function (ctx, next) {
    var client = ctx.query.client_id;
    var location = ctx.query.redirect_uri
    if (client && location) {
        return next();
    }
    auth.registrar({
        path: ctx.pathname,
        location: location || utils.resolve('accounts:///auth')
    }, function (err, uri) {
        if (err) {
            return next(err);
        }
        redirect(uri);
    });
};

module.exports.force = function (ctx, next) {
    if (ctx.token) {
        return next();
    }
    var location = ctx.path;
    var self = utils.resolve('accounts://');
    if (location.indexOf(self) === 0) {
        location = location.substring(self.length);
    }
    serand.store('state', {
        location: location
    });
    redirect('/signin');
};
