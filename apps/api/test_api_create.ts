
import jwt from 'jsonwebtoken';

const API_URL = 'http://localhost:8000/api/v1/admin/vendors';
const SECRET = 'dev_jwt_secret_12345';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCreate() {
    const admin = await prisma.adminUser.findUnique({ where: { email: 'admin@loyalty.com' } });
    if (!admin) {
        console.error('Admin not found in DB');
        return;
    }

    const token = jwt.sign(
        { sub: admin.admin_id, type: 'ADMIN', role: 'SUPER_ADMIN' },
        SECRET
    );

    console.log('Testing API Create Vendor...');
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${token}`
            },
            body: JSON.stringify({
                legal_name: 'API Test Vendor',
                trading_name: 'API Test Trading',
                vendor_slug: 'api-test-vendor-' + Date.now(),
                billing_email: 'api@test.com',
                monthly_billing_amount: 500,
                billing_start_date: '2026-03-01',
                contact_name: 'Tester',
                contact_surname: 'McTest',
                contact_phone: '1234567890'
            })
        });

        if (res.ok) {
            const data = await res.json();
            console.log('Success:', data);
        } else {
            console.error('Error Status:', res.status);
            const text = await res.text();
            console.error('Error Body:', text);
        }
    } catch (error) {
        console.error('Network Error:', error);
    }
}

testCreate();
