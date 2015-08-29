var dust = require('dust')();

var serand = require('serand');
var page = serand.page;
var redirect = serand.redirect;
var current = serand.current;
var layout = serand.layout('serandomps~accounts@master');

var user;

var dest;

require('user');
require('user-login');
require('navigation');
//require('accounts-navigation');
var can = function (permission) {
    return function (ctx, next) {
        if (user) {
            return next();
        }
        serand.emit('user', 'login', ctx.path);
    };
};

//registering jquery, bootstrap etc. plugins
require('upload');
//init app

page('/', function (ctx) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .add('breadcrumb')
        .area('#middle')
        .add('accounts-home')
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

page('/signin', function (ctx) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('accounts-signin')
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

page('/add', can('vehicle:create'), function (ctx) {
    layout('one-column')
        .area('#header')
        .add('accounts-navigation')
        .area('#middle')
        .add('auto-add', {})
        .render();
});

//TODO: redirect user to login page when authentication is needed
//TODO: basically a front controller pattern
serand.on('user', 'login', function (path) {
    dest = path;
    redirect('/signin');
});

serand.on('user', 'logged in', function (usr) {
    user = usr;
    if (!dest) {
        return;
    }
    redirect(dest);
});

serand.on('user', 'logged out', function (data) {
    user = null;
    redirect('/');
});

serand.emit('serand', 'ready');