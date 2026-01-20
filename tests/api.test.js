const request = require('supertest');
const app = require('../src/app');

describe('MaxyAcademy REST API Tests', () => {
    let accessToken;
    let userId;
    const testPhoneNumber = `081${Date.now().toString().slice(-8)}`;

    describe('1. Authentication Tests', () => {
        test('POST /register - should register new user successfully', async () => {
            const response = await request(app)
                .post('/register')
                .send({
                    first_name: 'Guntur',
                    last_name: 'Saputro',
                    phone_number: testPhoneNumber,
                    address: 'Jl. Kebon Sirih No. 1',
                    pin: '123456'
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('SUCCESS');
            expect(response.body.result).toHaveProperty('user_id');
            expect(response.body.result.first_name).toBe('Guntur');
            userId = response.body.result.user_id;
        });

        test('POST /register - should fail with duplicate phone number', async () => {
            const response = await request(app)
                .post('/register')
                .send({
                    first_name: 'Test',
                    last_name: 'User',
                    phone_number: testPhoneNumber,
                    address: 'Test Address',
                    pin: '123456'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Phone Number already registered');
        });

        test('POST /login - should login successfully', async () => {
            const response = await request(app)
                .post('/login')
                .send({
                    phone_number: testPhoneNumber,
                    pin: '123456'
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('SUCCESS');
            expect(response.body.result).toHaveProperty('access_token');
            expect(response.body.result).toHaveProperty('refresh_token');
            accessToken = response.body.result.access_token;
        });

        test('POST /login - should fail with wrong pin', async () => {
            const response = await request(app)
                .post('/login')
                .send({
                    phone_number: testPhoneNumber,
                    pin: 'wrongpin'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Phone number and pin doesn't match.");
        });
    });

    describe('2. Transaction Tests', () => {
        test('POST /topup - should top up balance successfully', async () => {
            const response = await request(app)
                .post('/topup')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 500000
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('SUCCESS');
            expect(response.body.result.amount_top_up).toBe(500000);
            expect(response.body.result.balance_after).toBe(500000);
        });

        test('POST /topup - should fail without authentication', async () => {
            const response = await request(app)
                .post('/topup')
                .send({
                    amount: 100000
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Unauthenticated');
        });

        test('POST /pay - should make payment successfully', async () => {
            const response = await request(app)
                .post('/pay')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 100000,
                    remarks: 'Pulsa Telkomsel 100k'
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('SUCCESS');
            expect(response.body.result.amount).toBe(100000);
            expect(response.body.result.remarks).toBe('Pulsa Telkomsel 100k');
        });

        test('POST /pay - should fail with insufficient balance', async () => {
            const response = await request(app)
                .post('/pay')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 999999999,
                    remarks: 'Test payment'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Balance is not enough');
        });

        test('GET /transactions - should get transaction history', async () => {
            const response = await request(app)
                .get('/transactions')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('SUCCESS');
            expect(Array.isArray(response.body.result)).toBe(true);
            expect(response.body.result.length).toBeGreaterThan(0);
        });
    });

    describe('3. Profile Tests', () => {
        test('PUT /profile - should update profile successfully', async () => {
            const response = await request(app)
                .put('/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    first_name: 'Tom',
                    last_name: 'Araya',
                    address: 'Jl. Diponegoro No. 215'
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('SUCCESS');
            expect(response.body.result.first_name).toBe('Tom');
            expect(response.body.result.last_name).toBe('Araya');
        });

        test('PUT /profile - should fail without authentication', async () => {
            const response = await request(app)
                .put('/profile')
                .send({
                    first_name: 'Test',
                    last_name: 'User'
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Unauthenticated');
        });
    });

    describe('4. Health Check', () => {
        test('GET /health - should return OK status', async () => {
            const response = await request(app)
                .get('/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OK');
        });
    });
});
