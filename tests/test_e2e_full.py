import unittest

class TestFullSERVIYAEngine(unittest.TestCase):
    def setUp(self):
        self.platform_commission_percent = 8.0
        self.wallets = {
            'client-101': {'id': 'w-client-101', 'user_id': 'client-101', 'available_rd': 0.0, 'escrow_rd': 0.0, 'pending_rd': 0.0},
            'worker-202': {'id': 'w-worker-202', 'user_id': 'worker-202', 'available_rd': 0.0, 'escrow_rd': 0.0, 'pending_rd': 0.0},
            'admin-1': {'id': 'w-admin-1', 'user_id': 'admin-1', 'available_rd': 0.0, 'escrow_rd': 0.0, 'pending_rd': 0.0}
        }
        self.users = [
            {'id': 'client-101', 'email': 'cliente@serviya.do', 'role': 'CLIENTE', 'name': 'Juan Pérez'},
            {'id': 'worker-202', 'email': 'tecnico@serviya.do', 'role': 'TRABAJADOR', 'name': 'Pedro Técnico'},
            {'id': 'admin-1', 'email': 'admin@serviya.do', 'role': 'ADMIN', 'name': 'Admin SERVIYA'}
        ]
        self.services = []
        self.applications = []
        self.contracts = []
        self.escrows = []
        self.payment_transactions = []
        self.withdrawals = []
        self.audit_logs = []
        self.notifications = []

    def test_full_serviya_e2e_lifecycle(self):
        # 1. CLIENTE deposits RD$ 10,000 via simulation
        client_wallet = self.wallets['client-101']
        deposit_amount = 10000.0
        client_wallet['available_rd'] += deposit_amount
        self.audit_logs.append({'action': 'DEPOSIT_SIMULATED', 'user_id': 'client-101', 'amount': deposit_amount})
        self.assertEqual(client_wallet['available_rd'], 10000.0)

        # 2. CLIENTE publishes service
        service = {
            'id': 'srv-501',
            'client_id': 'client-101',
            'title': 'Instalación de Cerradura Digital',
            'price_rd': 3500.0,
            'status': 'ABIERTA',
            'worker_id': None
        }
        self.services.append(service)

        # 3. TRABAJADOR applies
        application = {
            'id': 'app-901',
            'service_id': 'srv-501',
            'worker_id': 'worker-202',
            'proposed_price_rd': 3500.0,
            'status': 'PENDIENTES'
        }
        self.applications.append(application)

        # 4. CLIENTE accepts worker & CONTRACT is created
        service['worker_id'] = 'worker-202'
        service['status'] = 'EN_PROGRESO'
        application['status'] = 'ACEPTADA'

        contract = {
            'id': 'contract-801',
            'service_id': 'srv-501',
            'client_id': 'client-101',
            'worker_id': 'worker-202',
            'price_rd': 3500.0,
            'commission_percent': self.platform_commission_percent,
            'status': 'FUNDED'
        }
        self.contracts.append(contract)

        # 5. CLIENTE pays -> ESCROW HELD
        price = service['price_rd']
        commission_amount = price * (self.platform_commission_percent / 100.0) # 280.0
        worker_payout = price - commission_amount # 3220.0

        client_wallet['available_rd'] -= price
        client_wallet['escrow_rd'] += price

        escrow = {
            'id': 'escrow-301',
            'service_id': 'srv-501',
            'client_id': 'client-101',
            'worker_id': 'worker-202',
            'total_amount_rd': price,
            'commission_amount_rd': commission_amount,
            'worker_payout_rd': worker_payout,
            'status': 'RETENIDO'
        }
        self.escrows.append(escrow)

        self.assertEqual(client_wallet['available_rd'], 6500.0)
        self.assertEqual(client_wallet['escrow_rd'], 3500.0)

        # 6. TRABAJADOR completes service & CLIENTE confirms completion -> ESCROW RELEASED
        escrow['status'] = 'LIBERADO'
        client_wallet['escrow_rd'] -= price

        worker_wallet = self.wallets['worker-202']
        worker_wallet['available_rd'] += worker_payout

        admin_wallet = self.wallets['admin-1']
        admin_wallet['available_rd'] += commission_amount

        self.assertEqual(client_wallet['escrow_rd'], 0.0)
        self.assertEqual(worker_wallet['available_rd'], 3220.0)
        self.assertEqual(admin_wallet['available_rd'], 280.0)

        # 7. SECURITY RULE: CLIENTE attempts withdrawal -> MUST BE REJECTED (403)
        client_user = self.users[0]
        def process_withdrawal_request(user, amount, bank_name):
            if user['role'] != 'TRABAJADOR':
                return {'status': 403, 'error': 'Acceso denegado. Solamente TRABAJADOR puede solicitar retiros.'}
            wallet = self.wallets[user['id']]
            if wallet['available_rd'] < amount:
                return {'status': 400, 'error': 'Saldo insuficiente.'}
            wallet['available_rd'] -= amount
            wallet['pending_rd'] += amount
            withdrawal = {
                'id': f'w-req-{len(self.withdrawals)+1}',
                'user_id': user['id'],
                'amount_rd': amount,
                'bank_name': bank_name,
                'status': 'PENDING'
            }
            self.withdrawals.append(withdrawal)
            return {'status': 200, 'withdrawal': withdrawal}

        res_client_withdraw = process_withdrawal_request(client_user, 1000.0, 'Banreservas')
        self.assertEqual(res_client_withdraw['status'], 403)

        # 8. TRABAJADOR requests bank withdrawal -> PERMITTED
        worker_user = self.users[1]
        res_worker_withdraw = process_withdrawal_request(worker_user, 2000.0, 'Banreservas')
        self.assertEqual(res_worker_withdraw['status'], 200)
        self.assertEqual(worker_wallet['available_rd'], 1220.0)
        self.assertEqual(worker_wallet['pending_rd'], 2000.0)

        # 9. ADMIN approves and completes withdrawal
        withdrawal_item = self.withdrawals[0]
        withdrawal_item['status'] = 'COMPLETED'
        worker_wallet['pending_rd'] -= withdrawal_item['amount_rd']

        self.assertEqual(worker_wallet['pending_rd'], 0.0)
        self.assertEqual(worker_wallet['available_rd'], 1220.0)
        self.assertEqual(withdrawal_item['status'], 'COMPLETED')

if __name__ == '__main__':
    unittest.main()
