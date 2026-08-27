import { sendProjectManagerEmail } from './src/services/emailService.js';

async function test() {
  try {
    console.log('Testing sendProjectManagerEmail...');
    const result = await sendProjectManagerEmail(
      'test@example.com',
      { name: 'Test Project', startDate: new Date(), endDate: new Date(), totalBudget: 1000, status: 'PLANNING' },
      { name: 'Manager' },
      null,
      'Admin',
      'http://localhost:5173'
    );
    console.log('Result:', result);
  } catch (e) {
    console.error('Error caught:', e);
  }
}

test();
