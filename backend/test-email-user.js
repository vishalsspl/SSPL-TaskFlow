import 'dotenv/config';
import { sendVerificationOTPEmail } from './src/services/emailService.js';
(async () => {
  console.log('Testing email...');
  const res = await sendVerificationOTPEmail('raj05099168@gmail.com', 'Raj', '123456');
  console.log('Result:', res ? 'Success' : 'Failed');
  process.exit();
})();
