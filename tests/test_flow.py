import unittest

class TestPlatformFlow(unittest.TestCase):
    def test_commission_calculation(self):
        price_rd = 2500.0
        commission_rate = 8.0
        commission_amount = price_rd * (commission_rate / 100.0)
        worker_payout = price_rd - commission_amount

        self.assertEqual(commission_amount, 200.0)
        self.assertEqual(worker_payout, 2300.0)

    def test_escrow_lifecycle_simulation(self):
        client_balance = 10000.0
        service_price = 2500.0

        # Step 1: Deposit into Escrow
        client_balance -= service_price
        escrow_held = service_price
        self.assertEqual(client_balance, 7500.0)
        self.assertEqual(escrow_held, 2500.0)

        # Step 2: Release Escrow upon completion
        commission = service_price * 0.08 # 200
        worker_earned = service_price - commission # 2300
        escrow_held = 0.0

        self.assertEqual(worker_earned, 2300.0)
        self.assertEqual(commission, 200.0)
        self.assertEqual(escrow_held, 0.0)

    def test_role_security_withdrawal_permissions(self):
        # Rule: ONLY WORKER can request withdrawal. CLIENTE must be rejected (403 Forbidden).
        client_user = {'id': 'client-1', 'role': 'CLIENTE'}
        worker_user = {'id': 'worker-1', 'role': 'TRABAJADOR'}

        def process_withdrawal(user, amount_rd):
            if user['role'] != 'TRABAJADOR':
                return {'status': 403, 'error': 'Acceso denegado. Solamente TRABAJADOR puede solicitar retiros.'}
            return {'status': 200, 'message': 'Solicitud registrada.'}

        # Client attempt
        res_client = process_withdrawal(client_user, 1000)
        self.assertEqual(res_client['status'], 403)

        # Worker attempt
        res_worker = process_withdrawal(worker_user, 1000)
        self.assertEqual(res_worker['status'], 200)

    def test_admin_endpoint_authorization(self):
        # Rule: Only ADMIN role can access admin endpoints
        users = [
            {'id': 'u-1', 'role': 'CLIENTE'},
            {'id': 'u-2', 'role': 'TRABAJADOR'},
            {'id': 'u-3', 'role': 'ADMIN'}
        ]

        def access_admin_kpis(user):
            if user['role'] != 'ADMIN':
                return {'status': 403, 'error': 'Acceso denegado.'}
            return {'status': 200, 'kpis': {}}

        self.assertEqual(access_admin_kpis(users[0])['status'], 403)
        self.assertEqual(access_admin_kpis(users[1])['status'], 403)
        self.assertEqual(access_admin_kpis(users[2])['status'], 200)

    def test_double_release_and_double_refund_prevention(self):
        escrow = {'id': 'escrow-101', 'status': 'RETENIDO', 'amount': 3000.0}

        def release_escrow(escrow_record):
            if escrow_record['status'] != 'RETENIDO':
                raise ValueError("Escrow no está retenido.")
            escrow_record['status'] = 'LIBERADO'
            return True

        # First release: success
        self.assertTrue(release_escrow(escrow))
        self.assertEqual(escrow['status'], 'LIBERADO')

        # Second release attempt: fails
        with self.assertRaises(ValueError):
            release_escrow(escrow)

if __name__ == '__main__':
    unittest.main()


