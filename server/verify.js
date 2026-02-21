const http = require('http');

const post = (path, data) => {
    return new Promise((resolve, reject) => {
        const jsonData = JSON.stringify(data);
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': jsonData.length
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
        });
        req.on('error', reject);
        req.write(jsonData);
        req.end();
    });
};

async function test() {
    try {
        console.log('Testing Auto-registration via Login...');
        const loginRes = await post('/api/login', { email: 'auto@test.com', password: 'password123' });
        console.log('Login Response:', loginRes);

        const token = loginRes.body.token;
        console.log('Testing Transfer Limit (2000)...');
        // Tester has 2000. Try to transfer 500. Should fail.
        const transferReq = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/transfer',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log('Transfer Response Status:', res.statusCode);
                console.log('Transfer Response Body:', body);
            });
        });
        transferReq.write(JSON.stringify({ receiverEmail: 'omkar@1234', amount: 500 }));
        transferReq.end();

    } catch (err) {
        console.error('Test Failed:', err);
    }
}

test();
