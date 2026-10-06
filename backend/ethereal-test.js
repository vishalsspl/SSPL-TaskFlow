import nodemailer from 'nodemailer';

nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create a testing account. ' + err.message);
        return process.exit(1);
    }
    console.log('Credentials obtained:');
    console.log('User: ' + account.user);
    console.log('Pass: ' + account.pass);
    console.log('Host: ' + account.smtp.host);
    console.log('Port: ' + account.smtp.port);
});
