const path = require('path');
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');

const { mail } = require('../.env');

// nodemailer config
var transport = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    auth: {
        user: mail.user,
        pass: mail.pass
    }
});

// nodemailer handlebars config
transport.use('compile', hbs({
    viewEngine: {
        defaultLayout: undefined,
        partialsDir: path.resolve('./resources/mail/')
    },
    viewPath: path.resolve('./resources/mail/'),
    extName: '.html'
}));

module.exports = transport;