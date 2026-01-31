
import axios from 'axios';

async function test() {
    const API_URL = 'http://localhost:8000/api/v1';
    // Use a known vendor ID from the screenshot or seed
    // admin user needs to be authenticated via cookie usually, but admin routes depend on verifyAdmin.
    // verifyAdmin checks for 'admin_token' cookie.

    // We might not be able to easy test auth-guarded routes without logging in.
    // But we can check if it returns 401 (Auth required) or 404 (Not Found).
    // 401 means the route EXISTS. 404 means route MISSING.

    const targetUrl = `${API_URL}/admin/vendors/875e2dc5-7a01-4abf-a9da-ddcb5e649578/staff`;

    console.log(`Testing GET ${targetUrl}`);

    try {
        await axios.get(targetUrl);
    } catch (e: any) {
        if (e.response) {
            console.log(`Status: ${e.response.status}`);
            console.log('Headers:', e.response.headers);
        } else {
            console.log('Error:', e.message);
        }
    }
}

test();
