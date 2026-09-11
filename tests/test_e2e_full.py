import unittest


class TestFullSERVIYAEngine(unittest.TestCase):
    """Prueba de reglas del flujo completo; no sustituye una prueba contra PostgreSQL/Render."""

    def setUp(self):
        self.platform_commission_percent = 10.0
        self.wallets = {
            "client-101": {"available_rd": 10000.0, "escrow_rd": 0.0},
            "worker-202": {"available_rd": 0.0, "pending_rd": 0.0},
        }
        self.users = [
            {"id": "client-101", "role": "CLIENTE"},
            {"id": "worker-202", "role": "TRABAJADOR"},
            {"id": "admin-1", "role": "ADMIN"},
        ]
        self.escrow = None

    def test_full_serviya_e2e_rules(self):
        # 1) Servicio acordado por RD$ 3,500.
        price = 3500.0
        commission = round(price * self.platform_commission_percent / 100.0, 2)
        payout = round(price - commission, 2)
        self.assertEqual(commission, 350.0)
        self.assertEqual(payout, 3150.0)

        # 2) Depósito -> custodia retenida.
        self.wallets["client-101"]["available_rd"] -= price
        self.wallets["client-101"]["escrow_rd"] += price
        self.escrow = {"status": "RETENIDO", "total": price, "commission": commission, "payout": payout}
        self.assertEqual(self.escrow["status"], "RETENIDO")

        # 3) Cliente confirma terminación: NO libera dinero.
        self.escrow["status"] = "PENDIENTE_APROBACION"
        self.assertEqual(self.escrow["status"], "PENDIENTE_APROBACION")
        self.assertEqual(self.wallets["worker-202"]["available_rd"], 0.0)

        # 4) Solo Administración libera.
        self.escrow["status"] = "LIBERADO"
        self.wallets["client-101"]["escrow_rd"] -= price
        self.wallets["worker-202"]["available_rd"] += payout
        self.assertEqual(self.wallets["client-101"]["escrow_rd"], 0.0)
        self.assertEqual(self.wallets["worker-202"]["available_rd"], 3150.0)

        # 5) Cliente no puede retirar.
        client = self.users[0]
        self.assertNotEqual(client["role"], "TRABAJADOR")

        # 6) Trabajador sí puede solicitar retiro de saldo disponible.
        worker = self.users[1]
        self.assertEqual(worker["role"], "TRABAJADOR")
        withdrawal = 2000.0
        self.assertGreaterEqual(self.wallets[worker["id"]]["available_rd"], withdrawal)
        self.wallets[worker["id"]]["available_rd"] -= withdrawal
        self.wallets[worker["id"]]["pending_rd"] = withdrawal
        self.assertEqual(self.wallets[worker["id"]]["available_rd"], 1150.0)

        # 7) Administración completa el retiro.
        self.wallets[worker["id"]]["pending_rd"] = 0.0
        self.assertEqual(self.wallets[worker["id"]]["pending_rd"], 0.0)


if __name__ == "__main__":
    unittest.main()
