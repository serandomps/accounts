var serand = require('serand');
var utils = require('utils');
var auth = require('auth');
var direct = serand.direct;

var base = utils.resolve('accounts://');

module.exports.signin = function (ctx, next) {
    var clientId = ctx.query.client_id;
    var location = ctx.query.redirect_uri
    if (!clientId || !location) {
        auth.authenticator({
            type: 'serandives',
            location: location || utils.resolve('accounts:///auth')
        }, function (err, uri) {
            if (err) {
                return next(err);
            }
            uri = uri.substring(base.length);
            direct(uri);
        })
        return;
    }
    if (ctx.user) {
        direct('/authorize', {
            user: ctx.user,
            options: {
                clientId: clientId,
                scope: ctx.query.scope,
                location: location
            }
        });
        return;
    }
    serand.store('oauth', null);
    next();
};

module.exports.force = function (ctx, next) {
    if (ctx.user) {
        return next();
    }
    var path = ctx.path;
    var self = utils.resolve('accounts://');
    if (path.indexOf(self) === 0) {
        path = path.substring(self.length);
    }
    serand.store('state', {
        path: path
    });
    direct('/signin');
};
