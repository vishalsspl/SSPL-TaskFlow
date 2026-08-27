import { sendProjectManagerEmail } from './src/services/emailService.js';

async function test() {
  try {
    const to = "test@example.com";
    const project = {
      name: "Test Project",
      startDate: new Date(),
      endDate: new Date(),
      totalBudget: 5000,
      status: "PLANNING",
      description: "A test project"
    };
    const manager = { name: "John Doe" };
    const client = { name: "Client Corp" };
    
    console.log('Sending email...');
    const result = await sendProjectManagerEmail(to, project, manager, client, "Admin User", "http://localhost:5173");
    console.log('Result:', result);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
