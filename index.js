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
        if (ctx.token) {
            return next();
        }
        utils.emit('user', 'login', ctx.path);
    };
};

page(function (ctx, next) {
    utils.loading();
    next();
});

page('/signin', auth.signin, function (ctx, next) {
    var client = ctx.query.client_id;
    var location = ctx.query.redirect_uri;
    location = location || utils.resolve('accounts:///auth');
    layout('one-column')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('accounts-client:signin', {
            client: client,
            location: location
        })
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/recover', function (ctx, next) {
    var client = ctx.query.client_id;
    var location = ctx.query.redirect_uri;
    location = location || utils.resolve('accounts:///auth');
    layout('one-column')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('accounts-client:recover', {
            client: client,
            location: location
        })
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/recovered', function (ctx, next) {
    var email = ctx.query.email;
    layout('one-column')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('accounts-client:recovered', {
            email: email
        })
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/confirm', function (ctx, next) {
    var email = ctx.query.email;
    layout('one-column')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('accounts-client:confirm', {
            email: ctx.query.email,
            user: ctx.query.user,
            otp: ctx.query.otp
        })
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/reset', function (ctx, next) {
    var user = ctx.query.user;
    var email = ctx.query.email;
    var otp = ctx.query.otp;
    layout('one-column')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('accounts-client:reset', {
            user: user,
            email: email,
            otp: otp
        })
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/auth/oauth', function (ctx, next) {
    var el = $('#content');
    layout('one-column')
      .area('#header')
      .add('accounts-client:navigation')
      .area('#middle')
      .add('accounts-client:token', {
          scope: sera.scope,
          code: sera.code,
          error: sera.error,
          errorCode: sera.errorCode
      })
      .area('#footer')
      .add('footer')
      .render(ctx, next);
});

page('/signup', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('home', {title: 'Welcome to serandives.com'})
        .area('#middle')
        .add('accounts-client:signup', {
            client: ctx.query.client_id,
            location: ctx.query.redirect_uri
        })
        .area('#footer')
        .add('footer')
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
        .add('accounts-client:navigation')
        .area('#middle')
        .add('accounts-client:home')
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/authorize', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('accounts-client:authorize', ctx.state)
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/authorized', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('accounts-client:authorized', ctx.state)
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/unauthorized', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('accounts-client:unauthorized', ctx.state)
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/profile', function (ctx, next) {
    layout('two-column-right')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('accounts-client:profile', ctx.token.user)
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/create-contacts', function (ctx, next) {
    layout('two-column-right')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('contacts:create', {title: 'Create Contacts'})
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/contacts/:id', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('contacts:findone', {id: ctx.params.id})
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/contacts/:id/edit', function (ctx, next) {
    layout('two-column-right')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('contacts:create', {id: ctx.params.id})
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/contacts/:id/delete', function (ctx, next) {
    layout('two-column-right')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('contacts:remove', {id: ctx.params.id})
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/contacts', function (ctx, next) {
    layout('two-column-right')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('contacts:find', {title: 'Manage Contacts'})
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/create-locations', function (ctx, next) {
    layout('two-column-right')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('locations:create', {title: 'Create Locations'})
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/locations/:id/edit', function (ctx, next) {
    layout('two-column-right')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('locations:create', {id: ctx.params.id})
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/locations/:id/delete', function (ctx, next) {
    layout('one-column')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('locations:remove', {id: ctx.params.id})
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

page('/locations', function (ctx, next) {
    layout('two-column-right')
        .area('#header')
        .add('accounts-client:navigation')
        .area('#middle')
        .add('locations:find', {title: 'Manage Locations'})
        .area('#footer')
        .add('footer')
        .render(ctx, next);
});

utils.on('user', 'login', function (path) {
    dest = path;
    utils.emit('user', 'authenticator', {type: 'serandives', location: dest}, function (err, uri) {
        redirect(uri);
    });
});

utils.on('user', 'logged in', function (token, options) {
    options = options || {};
    if (!options.location) {
        return redirect('/');
    }
    var self = utils.resolve('accounts:///auth');
    if (options.location === self) {
        return redirect('/auth');
    }
    redirect('/authorize', null,{
        token: token,
        options: options
    });
});

utils.on('user', 'logged out', function (usr) {
    redirect('/');
});

utils.emit('serand', 'ready');