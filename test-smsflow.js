
const https = require('https');

const clientId = '9b3b0657-10e5-450a-a84a-874c9f8dbcce';
const clientSecret = '6314169f-726c-49ff-bfaa-af0498cff602';

async function request(url, method, headers, body) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request({
            hostname: u.hostname,
            port: 443,
            path: u.pathname,
            method: method,
            headers: headers
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

(async () => {
    // 1. Authenticate with Basic
    const authString = Buffer.from(clientId + ':' + clientSecret).toString('base64');
    console.log('Authenticating...');
    const authRes = await request('https://portal.smsflow.co.za/api/integration/authentication', 'GET', {
        'Accept': 'application/json',
        'Authorization': 'Basic ' + authString
    });

    console.log('Auth status:', authRes.statusCode);
    if (authRes.statusCode !== 200) {
        console.error('Auth failed:', authRes.body);
        return;
    }

    const token = JSON.parse(authRes.body).token;
    console.log('Token:', token.substring(0, 10) + '...');

    // 2. Try to send a message
    const endpoints = [
        // Integration prefix
        { method: 'GET', url: 'https://portal.smsflow.co.za/api/integration/sms' },
        { method: 'OPTIONS', url: 'https://portal.smsflow.co.za/api/integration/sms' },
        { method: 'GET', url: 'https://portal.smsflow.co.za/api/integration/messages' },
        { method: 'POST', url: 'https://portal.smsflow.co.za/api/integration/sms' }, // Retry just in case
    ];

    const payload = JSON.stringify({
        to: '27000000000',
        message: 'Test',
        sender_id: 'Loyalty'
    });

    for (const ep of endpoints) {
        console.log(`\nTesting ${ep.method} ${ep.url}`);
        try {
            const res = await request(ep.url, ep.method, {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': ep.method === 'POST' ? Buffer.byteLength(payload) : 0
            }, ep.method === 'POST' ? payload : undefined);
            console.log(`Status: ${res.statusCode}`);
            if (res.body) console.log(`Body: ${res.body.substring(0, 300)}`);
            if (res.headers && res.headers['allow']) console.log('Allow:', res.headers['allow']);
        } catch (e) {
            console.error(e.message);
        }
    }
})();
