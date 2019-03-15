var dust = require('dust')();

var serand = require('serand');
var utils = require('utils');
var page = serand.page;
var redirect = serand.redirect;

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
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-signin', {
            clientId: clientId,
            location: location
        })
        .render(ctx, next);
});

page('/recover', function (ctx, next) {
    var clientId = ctx.query.client_id;
    var location = ctx.query.redirect_uri;
    location = location || utils.resolve('accounts:///auth');
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-recover', {
            clientId: clientId,
            location: location
        })
        .render(ctx, next);
});

page('/recovered', function (ctx, next) {
    var email = ctx.query.email;
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-recovered', {
            email: email
        })
        .render(ctx, next);
});

page('/confirm', function (ctx, next) {
    var email = ctx.query.email;
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-confirm', {
            email: ctx.query.email,
            user: ctx.query.user,
            otp: ctx.query.otp
        })
        .render(ctx, next);
});

page('/reset', function (ctx, next) {
    var user = ctx.query.user;
    var email = ctx.query.email;
    var otp = ctx.query.otp;
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-reset', {
            user: user,
            email: email,
            otp: otp
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
          scope: sera.scope,
          code: sera.code,
          error: sera.error,
          errorCode: sera.errorCode
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
    state ? redirect(state.path) : redirect('/');
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

page('/create-contacts', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('contacts-create', {title: 'Create Contacts'})
        .render(ctx, next);
});

page('/contacts/:id/edit', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('contacts-create', {id: ctx.params.id})
        .render(ctx, next);
});

page('/contacts/:id/delete', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('contacts-remove', {id: ctx.params.id})
        .render(ctx, next);
});

page('/contacts', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('contacts-find', {title: 'Manage Contacts'})
        .render(ctx, next);
});

page('/create-locations', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('locations-create', {title: 'Create Locations'})
        .render(ctx, next);
});

page('/locations/:id/edit', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('locations-create', {id: ctx.params.id})
        .render(ctx, next);
});

page('/locations/:id/delete', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('locations-remove', {id: ctx.params.id})
        .render(ctx, next);
});

page('/locations', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('locations-find', {title: 'Manage Locations'})
        .render(ctx, next);
});

serand.on('user', 'login', function (path) {
    dest = path;
    serand.emit('user', 'authenticator', {type: 'serandives', location: dest}, function (err, uri) {
        redirect(uri);
    });
});

serand.on('user', 'logged in', function (usr, options) {
    options = options || {};
    if (!options.location) {
        return redirect('/');
    }
    var self = utils.resolve('accounts:///auth');
    if (options.location === self) {
        return redirect('/auth');
    }
    redirect('/authorize', null,{
        user: usr,
        options: options
    });
});

serand.on('user', 'authorized', function (options) {
    redirect('/authorized', null, options);
});

serand.on('user', 'logged out', function (usr) {
    redirect('/');
});

serand.emit('serand', 'ready');
