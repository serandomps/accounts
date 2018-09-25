var serand = require('serand');
var utils = require('utils');
var page = serand.page;
var direct = serand.direct;

var app = serand.app({
    self: 'accounts',
    from: 'serandomps'
});

var layout = serand.layout(app);

var auth = require('./controllers/auth');

var dest;

var can = function (permission) {
    return function (ctx, next) {
        if (ctx.user) {
            return next();
        }
        serand.emit('user', 'login', ctx.path);
    };
};

page('/signin', auth.signin, function (ctx, next) {
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
        .render(ctx, next);
});

page('/auth/oauth', function (ctx, next) {
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
      .render(ctx, next);
});

page('/signup', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('home', {title: 'Welcome to serandives.com'})
        .area('#middle')
        .add('accounts-signup', {
            clientId: ctx.query.client_id,
            location: ctx.query.redirect_uri
        })
        .render(ctx, next);
});

page(auth.force);

page('/auth', function (ctx, next) {
    var state = serand.store('state');
    state ? direct(state.path) : direct('/');
});

page('/', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-home')
        .render(ctx, next);
});

page('/authorize', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-authorize', ctx.state)
        .render(ctx, next);
});

page('/authorized', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-authorized', ctx.state)
        .render(ctx, next);
});

page('/profile', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-profile', ctx.user)
        .render(ctx, next);
});

serand.on('user', 'login', function (path) {
    dest = path;
    serand.emit('user', 'authenticator', {type: 'serandives', location: dest}, function (err, uri) {
        direct(uri);
    });
});

serand.on('user', 'logged in', function (usr, options) {
    options = options || {};
    if (!options.location) {
        return direct('/');
    }
    var self = utils.resolve('accounts:///auth');
    if (options.location === self) {
        return direct('/auth');
    }
    direct('/authorize', {
        user: usr,
        options: options
    });
});

serand.on('user', 'authorized', function (options) {
    direct('/authorized', options);
});

serand.on('user', 'logged out', function (usr) {
    direct('/');
});

serand.emit('serand', 'ready');
