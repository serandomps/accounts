var dust = require('dust')();

var serand = require('serand');
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
        .add('auto-search', ctx.query)
        .area('#middle')
        .add('auto-listing', ctx.query)
        .render();
});

page('/vehicles/:id', can('vehicle:read'), function (ctx) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .add('breadcrumb')
        .area('#middle')
        .add('auto-details', {
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
        .add('auto-add', {
            id: ctx.params.id
        })
        .render();
});

page('/add', can('vehicle:create'), function (ctx) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('auto-add', {})
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
