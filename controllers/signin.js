var serand = require('serand');
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