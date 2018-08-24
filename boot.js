var serand = require('serand');
var utils = require('utils');
var page = serand.page;
var redirect = serand.redirect;

var app = serand.boot('accounts');
var layout = serand.layout(app);

var signin = require('./controllers/signin');

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

page('/', signin.force, function (ctx) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-home')
        .render();
});

page('/signin', signin.already, function (ctx) {
    var clientId = ctx.query.client_id;
    var location = ctx.query.redirect_uri;
    location = location || utils.resolve('accounts:///auth');
    layout('one-column')
        .area('#header')
        .add('home', {title: 'Welcome to serandives.com'})
        .area('#middle')
        .add('accounts-signin', {
            clientId: clientId,
            location: location
        })
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

page('/auth', function (ctx) {
    var el = $('#content');
    var usr = {
        tid: el.data('tid'),
        username: el.data('username'),
        access: el.data('access'),
        expires: el.data('expires'),
        refresh: el.data('refresh')
    }
    if (usr.username) {
        return serand.emit('user', 'logged in', usr);
    }
    serand.emit('user', 'logged out');
});

page('/signup', function (ctx) {
    layout('one-column')
        .area('#header')
        .add('home', {title: 'Welcome to serandives.com'})
        .area('#middle')
        .add('accounts-signup', {
            clientId: ctx.query.client_id,
            location: ctx.query.redirect_uri
        })
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

serand.on('user', 'login', function (path) {
    dest = path;
    serand.emit('user', 'authenticator', {type: 'serandives', location: dest}, function (err, uri) {
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
