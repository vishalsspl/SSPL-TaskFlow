import 'dotenv/config';
import { sendVerificationOTPEmail } from './src/services/emailService.js';
(async () => {
  console.log('Testing email...');
  const res = await sendVerificationOTPEmail('sipamara401@gmail.com', 'Test User', '123456');
  console.log('Result:', res ? 'Success' : 'Failed');
  process.exit();
})();
