var serand = require('serand');
var redirect = serand.redirect;

var user;

serand.on('user', 'ready', function (usr) {
    user = usr;
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
    ctx.options = {
        clientId: ctx.query.client_id,
        scope: ctx.query.scope,
        location: ctx.query.redirect_uri
    };
    if (!user) {
        return next();
    }
    redirect('/authorize', {
        user: user,
        options: ctx.options
    });
};