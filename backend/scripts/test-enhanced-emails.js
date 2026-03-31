import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const ADMIN_ID = '5e871d13-2f33-4dc3-b26d-b09c0a80f2bb';
const MANAGER_ID = 'f4a66222-3635-449d-a29e-93e7d2dd71b4';
const CLIENT_ID = 'f1fcf02e-f704-4448-a783-dd94860d229b';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

async function verifyEnhancedEmails() {
  try {
    const token = jwt.sign({ userId: ADMIN_ID }, JWT_SECRET, { expiresIn: '1h' });
    const projectName = 'Enhanced Email Test Project ' + Date.now();

    console.log(`\n--- Testing Project Creation with Enhanced Emails ---`);
    console.log(`Project Name: ${projectName}`);
    console.log(`Manager: Priya Patel (f4a66222...)`);
    console.log(`Client: Client 1 (f1fcf02e...)`);

    const payload = {
      name: projectName,
      description: 'Verifying that manager, client, and all team members receive emails.',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      totalBudget: 50000,
      status: 'PLANNING',
      category: 'CLIENT',
      clientId: CLIENT_ID,
      managerId: MANAGER_ID,
    };

    const response = await fetch('http://localhost:5000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log(`Response Status: ${response.status}`);
    
    if (response.status === 201) {
      console.log(`Project created successfully: ${result.id}`);
      console.log(`\nCHECK SERVER LOGS FOR EMAIL DISPATCH MESSAGES:`);
      console.log(`1. Manager Project Email sent to priya.patel@sspl.in`);
      console.log(`2. Client Project Email sent to client1@sspl.in`);
      console.log(`3. Team Member Project Email sent to [Team Member Emails]`);
    } else {
      console.error('Failed to create project:', result);
    }

  } catch (error) {
    console.error('Verification Script Error:', error);
  }
}

verifyEnhancedEmails();
