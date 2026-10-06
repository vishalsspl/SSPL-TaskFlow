import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve('./backend/.env') });

async function test() {
    const { sendVerificationOTPEmail } = await import('./src/services/emailService.js');
    console.log('Testing OTP Email...');
    const result = await sendVerificationOTPEmail('raj05099168@gmail.com', 'Raj', '123456');
    console.log('Result:', result ? 'Success' : 'Failed');
    process.exit(result ? 0 : 1);
}
test();
