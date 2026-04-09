import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import http from 'http';

const prisma = new PrismaClient();

async function testEndpoint() {
    try {
        // Find an admin user to generate token for
        const admin = await prisma.user.findFirst({
            where: { role: 'ADMIN', organizationId: { not: null } }
        });

        if (!admin) {
            console.log("No ADMIN user found.");
            return;
        }

        const token = jwt.sign(
            { userId: admin.id, organizationId: admin.organizationId, role: admin.role },
            'your-super-secret-jwt-key-change-in-production',
            { expiresIn: '1h' }
        );

        console.log(`Testing with User: ${admin.email}`);

        const postData = JSON.stringify({
            name: 'Test User',
            email: `test_user_${Date.now()}@test.com`,
            role: 'MEMBER'
        });

        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/auth/invite',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log(`Response Status: ${res.statusCode}`);
                console.log(`Response Body: ${data}`);
            });
        });

        req.on('error', (e) => {
            console.error(`Problem with request: ${e.message}`);
        });

        req.write(postData);
        req.end();
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

testEndpoint();
