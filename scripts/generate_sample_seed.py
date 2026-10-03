import json


def generate_sample_seed():
    honesty_line = (
        "Real ledgers contain no cause label. We train a multi-cause classifier on SIMULATED causes "
        "(population A) and evaluate it on a SHIFTED population B it has never seen. We claim robustness "
        "to distribution shift in simulation, not real-world accuracy."
    )

    remedies = {
        "job_exit": {
            "remedy_code": "REM_JOB_PAUSE",
            "label": "Pause payroll deductions & hold wallet active",
            "unit_cost_bdt": 5.0,
            "message_en": "We noticed your salary account is quiet. Your wallet is kept active with zero maintenance fees until your next payroll starts.",
            "message_bn": "আপনার বেতন একাউন্ট নিষ্ক্রিয় দেখাচ্ছে। পরবর্তী বেতন চালু না হওয়া পর্যন্ত শূন্য ফি-তে আপনার একাউন্ট সক্রিয় রাখা হয়েছে।"
        },
        "migration": {
            "remedy_code": "REM_MIG_ROAM",
            "label": "Location-aware agent referral & regional network",
            "unit_cost_bdt": 3.5,
            "message_en": "Moved to a new area? Find verified cash-in/cash-out agents near your new location with zero roaming surcharge.",
            "message_bn": "নতুন এলাকায় গেছেন? কোনো অতিরিক্ত চার্জ ছাড়াই আপনার আশেপাশের অনুমোদিত এজেন্ট খুঁজুন ও লেনদেন করুন।"
        },
        "solved_problem": {
            "remedy_code": "REM_NO_ACTION",
            "label": "No action (Zero spend)",
            "unit_cost_bdt": 0.0,
            "message_en": "Thank you for using our service. Your wallet remains ready whenever you need it.",
            "message_bn": "আমাদের সেবা ব্যবহারের জন্য ধন্যবাদ। আপনার প্রয়োজনে যেকোনো সময় ওয়ালেটটি ব্যবহার করতে পারেন।"
        },
        "fee_shock": {
            "remedy_code": "REM_FEE_WAIVER",
            "label": "Fee discount voucher on next 3 cash-outs",
            "unit_cost_bdt": 15.0,
            "message_en": "Enjoy 50% cash-out fee rebate on your next 3 transactions. Valid for the next 30 days.",
            "message_bn": "আপনার পরবর্তী ৩টি ক্যাশআউটে ৫০% ফি রিবেট উপভোগ করুন। মেয়াদ ৩০ দিন।"
        },
        "supply_failure": {
            "remedy_code": "REM_AGENT_ALERT",
            "label": "Agent liquidity routing & merchant status alert",
            "unit_cost_bdt": 2.0,
            "message_en": "We resolved recent cash-in/out bottlenecks in your union. Nearby agents now have guaranteed liquidity.",
            "message_bn": "আপনার এলাকার এজেন্ট পয়েন্টের তারল্য সমস্যা সমাধান করা হয়েছে। নিকটস্থ এজেন্ট থেকে নির্বিঘ্নে লেনদেন করুন।"
        }
    }

    report = {
        "ml": {
            "macro_f1_a_test": 0.742,
            "macro_f1_b": 0.684,
            "gap": 0.058,
            "refusal_rate_a": 0.182,
            "refusal_rate_b": 0.245,
            "ece_b": 0.052,
            "shuffled_label_f1_b": 0.201,
            "best_single_feature": "post_fee_cashout_ratio",
            "best_single_feature_f1_b": 0.384,
            "rule_baseline_f1_b": 0.221
        },
        "confusion_b": {
            "labels": ["job_exit", "migration", "solved_problem", "fee_shock", "supply_failure"],
            "matrix": [
                [380, 28, 12, 18, 14],
                [32, 340, 16, 24, 20],
                [14, 18, 410, 8, 10],
                [20, 22, 10, 365, 25],
                [16, 24, 14, 28, 355]
            ]
        },
        "fairness": [
            {"slice": "worker_type", "group": "garment", "n": 950, "macro_f1": 0.692, "refusal_rate": 0.231},
            {"slice": "worker_type", "group": "domestic", "n": 720, "macro_f1": 0.678, "refusal_rate": 0.252},
            {"slice": "worker_type", "group": "transport", "n": 680, "macro_f1": 0.681, "refusal_rate": 0.248},
            {"slice": "worker_type", "group": "retail", "n": 650, "macro_f1": 0.689, "refusal_rate": 0.255},
            {"slice": "pay_cycle", "group": "weekly", "n": 1050, "macro_f1": 0.688, "refusal_rate": 0.240},
            {"slice": "pay_cycle", "group": "biweekly", "n": 750, "macro_f1": 0.679, "refusal_rate": 0.251},
            {"slice": "pay_cycle", "group": "monthly", "n": 1200, "macro_f1": 0.686, "refusal_rate": 0.246}
        ],
        "money": [
            {"recovery_rate": 0.01, "strategy": "rule", "wallets_actioned": 1270000, "users_recovered": 5080, "cost_bdt": 2540000, "value_bdt": 254000},
            {"recovery_rate": 0.01, "strategy": "model", "wallets_actioned": 965200, "users_recovered": 7721, "cost_bdt": 3860800, "value_bdt": 386000},
            {"recovery_rate": 0.01, "strategy": "oracle", "wallets_actioned": 1270000, "users_recovered": 12700, "cost_bdt": 5080000, "value_bdt": 1905000},
            {"recovery_rate": 0.04, "strategy": "rule", "wallets_actioned": 1270000, "users_recovered": 20320, "cost_bdt": 2540000, "value_bdt": 8636000},
            {"recovery_rate": 0.04, "strategy": "model", "wallets_actioned": 965200, "users_recovered": 38608, "cost_bdt": 3860800, "value_bdt": 21000000},
            {"recovery_rate": 0.04, "strategy": "oracle", "wallets_actioned": 1270000, "users_recovered": 50800, "cost_bdt": 5080000, "value_bdt": 22860000},
            {"recovery_rate": 0.08, "strategy": "rule", "wallets_actioned": 1270000, "users_recovered": 40640, "cost_bdt": 2540000, "value_bdt": 19812000},
            {"recovery_rate": 0.08, "strategy": "model", "wallets_actioned": 965200, "users_recovered": 77216, "cost_bdt": 3860800, "value_bdt": 46000000},
            {"recovery_rate": 0.08, "strategy": "oracle", "wallets_actioned": 1270000, "users_recovered": 101600, "cost_bdt": 5080000, "value_bdt": 50800000}
        ],
        "assumptions": [
            "Dormant base modelled at 3.63m wallets; triage rate ASSUMED at 35% (1.27m wallets)",
            "Base recovery rate ASSUMED at 4.0% with sensitivity sweep across 1.0% and 8.0%",
            "Annual ARPU ASSUMED at BDT 550 per recovered active user with 12-month value ramp",
            "Generic SMS reminder cost ASSUMED at BDT 2.00 per message",
            "Remedy unit costs ASSUMED: job_exit BDT 5.0, migration BDT 3.5, solved_problem BDT 0.0, fee_shock BDT 15.0, supply_failure BDT 2.0",
            "Rule baseline recovers at generic factor of 40% relative to cause-targeted remedy"
        ]
    }

    # Helper to generate 26-week series
    def make_series(pattern_type, weeks_silent, pay_cycle="monthly"):
        series = []
        active_weeks = 26 - weeks_silent
        for w in range(1, 27):
            if w > active_weeks:
                series.append({"week": w, "txn_count": 0, "amount_bdt": 0.0})
                continue
            
            if pattern_type == "job_exit":
                # Regular salary spike every 4 weeks (or 1 week / 2 weeks)
                is_payday = (w % 4 == 0) if pay_cycle == "monthly" else ((w % 2 == 0) if pay_cycle == "biweekly" else True)
                if is_payday:
                    tx = 5 + (w % 3)
                    amt = 8500.0 + (w * 150.0)
                else:
                    tx = 1 if (w % 2 == 1) else 0
                    amt = 400.0 if tx > 0 else 0.0
            elif pattern_type == "migration":
                # Moderate activity, then taper down in last 3 active weeks
                if w > active_weeks - 3:
                    tx = 1
                    amt = 500.0
                else:
                    tx = 3 + (w % 4)
                    amt = 3200.0 + (w * 80.0)
            elif pattern_type == "solved_problem":
                # Quiet except for weeks 8-10 high burst
                if 8 <= w <= 10:
                    tx = 8 + (w - 8) * 3
                    amt = 15000.0
                else:
                    tx = 1 if w in (2, 4, 7, 12, 15) else 0
                    amt = 300.0 if tx > 0 else 0.0
            elif pattern_type == "fee_shock":
                # High frequency transactions, cash-out heavy, abrupt end after fee shock week
                tx = 6 + (w % 3)
                amt = 6500.0 + (w * 200.0)
            elif pattern_type == "supply_failure":
                # Multiple failed attempts / small repeated transactions before stopping
                if w == active_weeks:
                    tx = 9
                    amt = 250.0  # many failed or tiny cash-outs
                else:
                    tx = 4 + (w % 2)
                    amt = 2200.0
            elif pattern_type == "uniform_refused":
                # Very sparse, irregular transactions
                tx = 1 if (w % 3 == 0) else 0
                amt = 250.0 if tx > 0 else 0.0
            elif pattern_type == "tie_refused":
                # Mixed salary + travel/location shift
                tx = 2 + (w % 3)
                amt = 2800.0
            else: # ambiguous_refused
                tx = 2 if (w % 2 == 0) else 1
                amt = 1200.0 + (w * 50.0)
            
            series.append({"week": w, "txn_count": tx, "amount_bdt": round(amt, 2)})
        return series

    # 20 Wallets specifications
    wallets = [
        # --- 3 x job_exit ---
        {
            "wallet_id": "W-7K9A1B",
            "worker_type": "garment",
            "pay_cycle": "monthly",
            "weeks_silent": 6,
            "verdict": "attributed",
            "cause": "job_exit",
            "posterior": {"job_exit": 0.86, "migration": 0.06, "solved_problem": 0.03, "fee_shock": 0.03, "supply_failure": 0.02},
            "contributions": [
                {"feature": "last_payroll_gap_weeks", "value": 6.0, "contribution": 0.42},
                {"feature": "payday_regularity_score", "value": 0.94, "contribution": 0.28},
                {"feature": "post_salary_cashout_speed", "value": 1.2, "contribution": 0.12},
                {"feature": "p2p_channel_entropy", "value": 0.15, "contribution": -0.05},
                {"feature": "agent_location_consistency", "value": 0.88, "contribution": 0.04},
                {"feature": "average_monthly_volume_bdt", "value": 9200.0, "contribution": 0.03},
                {"feature": "fee_sensitivity_index", "value": 0.10, "contribution": -0.02},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.01}
            ],
            "refusal_reasons": [],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("job_exit", 6, "monthly")
        },
        {
            "wallet_id": "W-3M8N2X",
            "worker_type": "transport",
            "pay_cycle": "weekly",
            "weeks_silent": 4,
            "verdict": "attributed",
            "cause": "job_exit",
            "posterior": {"job_exit": 0.79, "migration": 0.09, "solved_problem": 0.04, "fee_shock": 0.05, "supply_failure": 0.03},
            "contributions": [
                {"feature": "last_payroll_gap_weeks", "value": 4.0, "contribution": 0.38},
                {"feature": "weekly_cycle_coherence", "value": 0.91, "contribution": 0.24},
                {"feature": "post_salary_cashout_speed", "value": 0.8, "contribution": 0.11},
                {"feature": "agent_location_consistency", "value": 0.82, "contribution": 0.05},
                {"feature": "p2p_channel_entropy", "value": 0.22, "contribution": -0.04},
                {"feature": "average_monthly_volume_bdt", "value": 6400.0, "contribution": 0.03},
                {"feature": "fee_sensitivity_index", "value": 0.12, "contribution": -0.02},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.01}
            ],
            "refusal_reasons": [],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("job_exit", 4, "weekly")
        },
        {
            "wallet_id": "W-9P4Q7R",
            "worker_type": "retail",
            "pay_cycle": "biweekly",
            "weeks_silent": 5,
            "verdict": "attributed",
            "cause": "job_exit",
            "posterior": {"job_exit": 0.82, "migration": 0.07, "solved_problem": 0.03, "fee_shock": 0.05, "supply_failure": 0.03},
            "contributions": [
                {"feature": "last_payroll_gap_weeks", "value": 5.0, "contribution": 0.40},
                {"feature": "biweekly_coherence_score", "value": 0.89, "contribution": 0.26},
                {"feature": "post_salary_cashout_speed", "value": 1.0, "contribution": 0.10},
                {"feature": "p2p_channel_entropy", "value": 0.18, "contribution": -0.04},
                {"feature": "agent_location_consistency", "value": 0.85, "contribution": 0.04},
                {"feature": "average_monthly_volume_bdt", "value": 7800.0, "contribution": 0.03},
                {"feature": "fee_sensitivity_index", "value": 0.08, "contribution": -0.02},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.01}
            ],
            "refusal_reasons": [],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("job_exit", 5, "biweekly")
        },

        # --- 3 x migration ---
        {
            "wallet_id": "W-2D5E8F",
            "worker_type": "domestic",
            "pay_cycle": "monthly",
            "weeks_silent": 5,
            "verdict": "attributed",
            "cause": "migration",
            "posterior": {"job_exit": 0.08, "migration": 0.81, "solved_problem": 0.04, "fee_shock": 0.04, "supply_failure": 0.03},
            "contributions": [
                {"feature": "cell_tower_dispersion", "value": 3.8, "contribution": 0.39},
                {"feature": "new_district_agent_ratio", "value": 0.92, "contribution": 0.27},
                {"feature": "p2p_geo_distance_km", "value": 184.0, "contribution": 0.14},
                {"feature": "last_payroll_gap_weeks", "value": 5.0, "contribution": -0.06},
                {"feature": "agent_location_consistency", "value": 0.12, "contribution": 0.05},
                {"feature": "average_monthly_volume_bdt", "value": 4100.0, "contribution": 0.02},
                {"feature": "fee_sensitivity_index", "value": 0.15, "contribution": -0.01},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.01}
            ],
            "refusal_reasons": [],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("migration", 5, "monthly")
        },
        {
            "wallet_id": "W-6H1J4K",
            "worker_type": "garment",
            "pay_cycle": "monthly",
            "weeks_silent": 7,
            "verdict": "attributed",
            "cause": "migration",
            "posterior": {"job_exit": 0.11, "migration": 0.77, "solved_problem": 0.04, "fee_shock": 0.04, "supply_failure": 0.04},
            "contributions": [
                {"feature": "cell_tower_dispersion", "value": 4.1, "contribution": 0.35},
                {"feature": "new_district_agent_ratio", "value": 0.88, "contribution": 0.24},
                {"feature": "p2p_geo_distance_km", "value": 240.0, "contribution": 0.16},
                {"feature": "last_payroll_gap_weeks", "value": 7.0, "contribution": -0.05},
                {"feature": "agent_location_consistency", "value": 0.09, "contribution": 0.04},
                {"feature": "average_monthly_volume_bdt", "value": 5300.0, "contribution": 0.02},
                {"feature": "fee_sensitivity_index", "value": 0.09, "contribution": -0.01},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.01}
            ],
            "refusal_reasons": [],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("migration", 7, "monthly")
        },
        {
            "wallet_id": "W-8L3N5P",
            "worker_type": "transport",
            "pay_cycle": "weekly",
            "weeks_silent": 4,
            "verdict": "attributed",
            "cause": "migration",
            "posterior": {"job_exit": 0.09, "migration": 0.75, "solved_problem": 0.05, "fee_shock": 0.06, "supply_failure": 0.05},
            "contributions": [
                {"feature": "cell_tower_dispersion", "value": 3.4, "contribution": 0.33},
                {"feature": "new_district_agent_ratio", "value": 0.84, "contribution": 0.23},
                {"feature": "p2p_geo_distance_km", "value": 145.0, "contribution": 0.15},
                {"feature": "last_payroll_gap_weeks", "value": 4.0, "contribution": -0.04},
                {"feature": "agent_location_consistency", "value": 0.18, "contribution": 0.04},
                {"feature": "average_monthly_volume_bdt", "value": 4800.0, "contribution": 0.02},
                {"feature": "fee_sensitivity_index", "value": 0.11, "contribution": -0.01},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.01}
            ],
            "refusal_reasons": [],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("migration", 4, "weekly")
        },

        # --- 3 x solved_problem ---
        {
            "wallet_id": "W-4T7U1V",
            "worker_type": "retail",
            "pay_cycle": "monthly",
            "weeks_silent": 12,
            "verdict": "attributed",
            "cause": "solved_problem",
            "posterior": {"job_exit": 0.04, "migration": 0.03, "solved_problem": 0.87, "fee_shock": 0.03, "supply_failure": 0.03},
            "contributions": [
                {"feature": "burst_concentration_ratio", "value": 0.89, "contribution": 0.44},
                {"feature": "pre_burst_dormancy_weeks", "value": 7.0, "contribution": 0.25},
                {"feature": "specific_merchant_category_share", "value": 0.95, "contribution": 0.16},
                {"feature": "last_payroll_gap_weeks", "value": 12.0, "contribution": -0.05},
                {"feature": "agent_location_consistency", "value": 0.90, "contribution": 0.04},
                {"feature": "average_monthly_volume_bdt", "value": 1200.0, "contribution": -0.03},
                {"feature": "fee_sensitivity_index", "value": 0.04, "contribution": -0.01},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.01}
            ],
            "refusal_reasons": [],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("solved_problem", 12, "monthly")
        },
        {
            "wallet_id": "W-5X9Y2Z",
            "worker_type": "domestic",
            "pay_cycle": "monthly",
            "weeks_silent": 10,
            "verdict": "attributed",
            "cause": "solved_problem",
            "posterior": {"job_exit": 0.05, "migration": 0.04, "solved_problem": 0.84, "fee_shock": 0.04, "supply_failure": 0.03},
            "contributions": [
                {"feature": "burst_concentration_ratio", "value": 0.85, "contribution": 0.41},
                {"feature": "pre_burst_dormancy_weeks", "value": 6.0, "contribution": 0.23},
                {"feature": "specific_merchant_category_share", "value": 0.91, "contribution": 0.17},
                {"feature": "last_payroll_gap_weeks", "value": 10.0, "contribution": -0.04},
                {"feature": "agent_location_consistency", "value": 0.86, "contribution": 0.04},
                {"feature": "average_monthly_volume_bdt", "value": 980.0, "contribution": -0.03},
                {"feature": "fee_sensitivity_index", "value": 0.05, "contribution": -0.01},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.01}
            ],
            "refusal_reasons": [],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("solved_problem", 10, "monthly")
        },
        {
            "wallet_id": "W-1A3B5C",
            "worker_type": "garment",
            "pay_cycle": "biweekly",
            "weeks_silent": 9,
            "verdict": "attributed",
            "cause": "solved_problem",
            "posterior": {"job_exit": 0.06, "migration": 0.05, "solved_problem": 0.81, "fee_shock": 0.04, "supply_failure": 0.04},
            "contributions": [
                {"feature": "burst_concentration_ratio", "value": 0.82, "contribution": 0.38},
                {"feature": "pre_burst_dormancy_weeks", "value": 5.0, "contribution": 0.22},
                {"feature": "specific_merchant_category_share", "value": 0.88, "contribution": 0.18},
                {"feature": "last_payroll_gap_weeks", "value": 9.0, "contribution": -0.04},
                {"feature": "agent_location_consistency", "value": 0.84, "contribution": 0.04},
                {"feature": "average_monthly_volume_bdt", "value": 1400.0, "contribution": -0.02},
                {"feature": "fee_sensitivity_index", "value": 0.06, "contribution": -0.01},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.01}
            ],
            "refusal_reasons": [],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("solved_problem", 9, "biweekly")
        },

        # --- 3 x fee_shock ---
        {
            "wallet_id": "W-7D9E2G",
            "worker_type": "transport",
            "pay_cycle": "weekly",
            "weeks_silent": 4,
            "verdict": "attributed",
            "cause": "fee_shock",
            "posterior": {"job_exit": 0.05, "migration": 0.04, "solved_problem": 0.03, "fee_shock": 0.84, "supply_failure": 0.04},
            "contributions": [
                {"feature": "post_fee_cashout_ratio", "value": 0.94, "contribution": 0.43},
                {"feature": "last_tx_fee_burden_pct", "value": 3.8, "contribution": 0.26},
                {"feature": "zero_balance_sweep_speed", "value": 0.98, "contribution": 0.14},
                {"feature": "last_payroll_gap_weeks", "value": 4.0, "contribution": -0.05},
                {"feature": "agent_location_consistency", "value": 0.92, "contribution": 0.04},
                {"feature": "average_monthly_volume_bdt", "value": 11500.0, "contribution": 0.03},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.02},
                {"feature": "p2p_channel_entropy", "value": 0.19, "contribution": -0.01}
            ],
            "refusal_reasons": [],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("fee_shock", 4, "weekly")
        },
        {
            "wallet_id": "W-8J2K4L",
            "worker_type": "retail",
            "pay_cycle": "biweekly",
            "weeks_silent": 5,
            "verdict": "attributed",
            "cause": "fee_shock",
            "posterior": {"job_exit": 0.06, "migration": 0.05, "solved_problem": 0.03, "fee_shock": 0.81, "supply_failure": 0.05},
            "contributions": [
                {"feature": "post_fee_cashout_ratio", "value": 0.90, "contribution": 0.39},
                {"feature": "last_tx_fee_burden_pct", "value": 3.5, "contribution": 0.24},
                {"feature": "zero_balance_sweep_speed", "value": 0.95, "contribution": 0.15},
                {"feature": "last_payroll_gap_weeks", "value": 5.0, "contribution": -0.04},
                {"feature": "agent_location_consistency", "value": 0.89, "contribution": 0.04},
                {"feature": "average_monthly_volume_bdt", "value": 10200.0, "contribution": 0.03},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.02},
                {"feature": "p2p_channel_entropy", "value": 0.16, "contribution": -0.01}
            ],
            "refusal_reasons": [],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("fee_shock", 5, "biweekly")
        },
        {
            "wallet_id": "W-3N6P9R",
            "worker_type": "garment",
            "pay_cycle": "monthly",
            "weeks_silent": 6,
            "verdict": "attributed",
            "cause": "fee_shock",
            "posterior": {"job_exit": 0.07, "migration": 0.05, "solved_problem": 0.03, "fee_shock": 0.79, "supply_failure": 0.06},
            "contributions": [
                {"feature": "post_fee_cashout_ratio", "value": 0.88, "contribution": 0.37},
                {"feature": "last_tx_fee_burden_pct", "value": 3.4, "contribution": 0.23},
                {"feature": "zero_balance_sweep_speed", "value": 0.92, "contribution": 0.16},
                {"feature": "last_payroll_gap_weeks", "value": 6.0, "contribution": -0.04},
                {"feature": "agent_location_consistency", "value": 0.86, "contribution": 0.04},
                {"feature": "average_monthly_volume_bdt", "value": 8900.0, "contribution": 0.03},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.02},
                {"feature": "p2p_channel_entropy", "value": 0.14, "contribution": -0.01}
            ],
            "refusal_reasons": [],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("fee_shock", 6, "monthly")
        },

        # --- 2 x supply_failure ---
        {
            "wallet_id": "W-5S8T1U",
            "worker_type": "domestic",
            "pay_cycle": "monthly",
            "weeks_silent": 4,
            "verdict": "attributed",
            "cause": "supply_failure",
            "posterior": {"job_exit": 0.05, "migration": 0.04, "solved_problem": 0.04, "fee_shock": 0.07, "supply_failure": 0.80},
            "contributions": [
                {"feature": "failed_cashout_attempt_count", "value": 7.0, "contribution": 0.44},
                {"feature": "agent_liquidity_starvation_score", "value": 0.88, "contribution": 0.25},
                {"feature": "repeated_failed_pin_retry", "value": 0.0, "contribution": -0.08},
                {"feature": "last_payroll_gap_weeks", "value": 4.0, "contribution": -0.04},
                {"feature": "agent_location_consistency", "value": 0.94, "contribution": 0.05},
                {"feature": "average_monthly_volume_bdt", "value": 3400.0, "contribution": 0.02},
                {"feature": "fee_sensitivity_index", "value": 0.08, "contribution": -0.01},
                {"feature": "p2p_channel_entropy", "value": 0.12, "contribution": -0.01}
            ],
            "refusal_reasons": [],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("supply_failure", 4, "monthly")
        },
        {
            "wallet_id": "W-2W4X7Y",
            "worker_type": "retail",
            "pay_cycle": "biweekly",
            "weeks_silent": 3,
            "verdict": "attributed",
            "cause": "supply_failure",
            "posterior": {"job_exit": 0.06, "migration": 0.05, "solved_problem": 0.04, "fee_shock": 0.08, "supply_failure": 0.77},
            "contributions": [
                {"feature": "failed_cashout_attempt_count", "value": 6.0, "contribution": 0.41},
                {"feature": "agent_liquidity_starvation_score", "value": 0.84, "contribution": 0.24},
                {"feature": "repeated_failed_pin_retry", "value": 0.0, "contribution": -0.07},
                {"feature": "last_payroll_gap_weeks", "value": 3.0, "contribution": -0.04},
                {"feature": "agent_location_consistency", "value": 0.91, "contribution": 0.05},
                {"feature": "average_monthly_volume_bdt", "value": 4200.0, "contribution": 0.02},
                {"feature": "fee_sensitivity_index", "value": 0.07, "contribution": -0.01},
                {"feature": "p2p_channel_entropy", "value": 0.15, "contribution": -0.01}
            ],
            "refusal_reasons": [],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("supply_failure", 3, "biweekly")
        },

        # --- 6 x REFUSED WALLETS ---
        # 1. Near-uniform posterior
        {
            "wallet_id": "W-9R2S4T",
            "worker_type": "garment",
            "pay_cycle": "monthly",
            "weeks_silent": 5,
            "verdict": "refused",
            "cause": None,
            "posterior": {"job_exit": 0.22, "migration": 0.21, "solved_problem": 0.19, "fee_shock": 0.19, "supply_failure": 0.19},
            "contributions": [
                {"feature": "last_payroll_gap_weeks", "value": 5.0, "contribution": 0.03},
                {"feature": "cell_tower_dispersion", "value": 1.2, "contribution": 0.02},
                {"feature": "post_fee_cashout_ratio", "value": 0.20, "contribution": 0.02},
                {"feature": "burst_concentration_ratio", "value": 0.18, "contribution": -0.02},
                {"feature": "agent_location_consistency", "value": 0.55, "contribution": 0.01},
                {"feature": "average_monthly_volume_bdt", "value": 2100.0, "contribution": -0.01},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.01},
                {"feature": "fee_sensitivity_index", "value": 0.14, "contribution": -0.01}
            ],
            "refusal_reasons": [
                "Top cause probability 0.22 < τ 0.50 (low confidence threshold)",
                "Posterior distribution is near-uniform across all 5 cause hypotheses",
                "SHAP feature contributions sum to near-zero; no feature discriminates"
            ],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("uniform_refused", 5, "monthly")
        },

        # 2. 2-cause tie / small margin
        {
            "wallet_id": "W-1M4N7Q",
            "worker_type": "transport",
            "pay_cycle": "weekly",
            "weeks_silent": 6,
            "verdict": "refused",
            "cause": None,
            "posterior": {"job_exit": 0.44, "migration": 0.42, "solved_problem": 0.05, "fee_shock": 0.05, "supply_failure": 0.04},
            "contributions": [
                {"feature": "last_payroll_gap_weeks", "value": 6.0, "contribution": 0.18},
                {"feature": "cell_tower_dispersion", "value": 2.9, "contribution": 0.17},
                {"feature": "new_district_agent_ratio", "value": 0.65, "contribution": 0.12},
                {"feature": "weekly_cycle_coherence", "value": 0.68, "contribution": 0.09},
                {"feature": "agent_location_consistency", "value": 0.42, "contribution": -0.05},
                {"feature": "post_fee_cashout_ratio", "value": 0.15, "contribution": -0.03},
                {"feature": "average_monthly_volume_bdt", "value": 5200.0, "contribution": 0.02},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.01}
            ],
            "refusal_reasons": [
                "Top-2 margin (job_exit 0.44 vs migration 0.42 = 0.02) < δ 0.10 threshold",
                "Ambiguous signal between job cessation and geographic relocation"
            ],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("tie_refused", 6, "weekly")
        },

        # 3. Low max posterior (0.38 < tau 0.50)
        {
            "wallet_id": "W-6B8C1D",
            "worker_type": "retail",
            "pay_cycle": "biweekly",
            "weeks_silent": 4,
            "verdict": "refused",
            "cause": None,
            "posterior": {"job_exit": 0.15, "migration": 0.10, "solved_problem": 0.06, "fee_shock": 0.38, "supply_failure": 0.31},
            "contributions": [
                {"feature": "post_fee_cashout_ratio", "value": 0.45, "contribution": 0.16},
                {"feature": "failed_cashout_attempt_count", "value": 2.0, "contribution": 0.14},
                {"feature": "last_tx_fee_burden_pct", "value": 2.1, "contribution": 0.09},
                {"feature": "agent_liquidity_starvation_score", "value": 0.40, "contribution": 0.07},
                {"feature": "last_payroll_gap_weeks", "value": 4.0, "contribution": -0.04},
                {"feature": "agent_location_consistency", "value": 0.61, "contribution": 0.03},
                {"feature": "average_monthly_volume_bdt", "value": 4600.0, "contribution": 0.02},
                {"feature": "p2p_channel_entropy", "value": 0.28, "contribution": -0.02}
            ],
            "refusal_reasons": [
                "Top cause probability 0.38 < τ 0.50 threshold",
                "Weak signals across both fee shock and agent supply failure"
            ],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("ambiguous_refused", 4, "biweekly")
        },

        # 4. Noisy history with 3-cause split
        {
            "wallet_id": "W-3F6G9H",
            "worker_type": "domestic",
            "pay_cycle": "monthly",
            "weeks_silent": 8,
            "verdict": "refused",
            "cause": None,
            "posterior": {"job_exit": 0.32, "migration": 0.25, "solved_problem": 0.35, "fee_shock": 0.04, "supply_failure": 0.04},
            "contributions": [
                {"feature": "burst_concentration_ratio", "value": 0.42, "contribution": 0.15},
                {"feature": "last_payroll_gap_weeks", "value": 8.0, "contribution": 0.13},
                {"feature": "cell_tower_dispersion", "value": 1.9, "contribution": 0.10},
                {"feature": "pre_burst_dormancy_weeks", "value": 3.0, "contribution": 0.06},
                {"feature": "agent_location_consistency", "value": 0.52, "contribution": -0.04},
                {"feature": "average_monthly_volume_bdt", "value": 1800.0, "contribution": -0.03},
                {"feature": "fee_sensitivity_index", "value": 0.08, "contribution": -0.01},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.01}
            ],
            "refusal_reasons": [
                "Top cause probability 0.35 < τ 0.50 threshold",
                "Top-2 margin (solved_problem 0.35 vs job_exit 0.32 = 0.03) < δ 0.10 threshold"
            ],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("ambiguous_refused", 8, "monthly")
        },

        # 5. Sparse activity with short silence (< 3 weeks, rule did not fire)
        {
            "wallet_id": "W-4K7L1M",
            "worker_type": "garment",
            "pay_cycle": "weekly",
            "weeks_silent": 2,
            "verdict": "refused",
            "cause": None,
            "posterior": {"job_exit": 0.31, "migration": 0.24, "solved_problem": 0.21, "fee_shock": 0.14, "supply_failure": 0.10},
            "contributions": [
                {"feature": "last_payroll_gap_weeks", "value": 2.0, "contribution": 0.11},
                {"feature": "weekly_cycle_coherence", "value": 0.45, "contribution": 0.08},
                {"feature": "cell_tower_dispersion", "value": 1.4, "contribution": 0.06},
                {"feature": "post_fee_cashout_ratio", "value": 0.22, "contribution": -0.04},
                {"feature": "agent_location_consistency", "value": 0.68, "contribution": 0.03},
                {"feature": "average_monthly_volume_bdt", "value": 3100.0, "contribution": 0.02},
                {"feature": "failed_tx_ratio", "value": 0.0, "contribution": -0.01},
                {"feature": "fee_sensitivity_index", "value": 0.10, "contribution": -0.01}
            ],
            "refusal_reasons": [
                "Insufficient dormancy window: 2 weeks silent < 3 weeks triage threshold",
                "Top cause probability 0.31 < τ 0.50 threshold"
            ],
            "rule_baseline": {"fired": False, "action": "none"},
            "series": make_series("ambiguous_refused", 2, "weekly")
        },

        # 6. High variance ambiguous wallet
        {
            "wallet_id": "W-8V1W3X",
            "worker_type": "transport",
            "pay_cycle": "biweekly",
            "weeks_silent": 4,
            "verdict": "refused",
            "cause": None,
            "posterior": {"job_exit": 0.11, "migration": 0.08, "solved_problem": 0.04, "fee_shock": 0.36, "supply_failure": 0.41},
            "contributions": [
                {"feature": "failed_cashout_attempt_count", "value": 3.0, "contribution": 0.18},
                {"feature": "post_fee_cashout_ratio", "value": 0.48, "contribution": 0.15},
                {"feature": "agent_liquidity_starvation_score", "value": 0.45, "contribution": 0.10},
                {"feature": "last_tx_fee_burden_pct", "value": 2.4, "contribution": 0.08},
                {"feature": "last_payroll_gap_weeks", "value": 4.0, "contribution": -0.04},
                {"feature": "agent_location_consistency", "value": 0.58, "contribution": 0.03},
                {"feature": "average_monthly_volume_bdt", "value": 5600.0, "contribution": 0.02},
                {"feature": "p2p_channel_entropy", "value": 0.24, "contribution": -0.02}
            ],
            "refusal_reasons": [
                "Top cause probability 0.41 < τ 0.50 threshold",
                "Top-2 margin (supply_failure 0.41 vs fee_shock 0.36 = 0.05) < δ 0.10 threshold"
            ],
            "rule_baseline": {"fired": True, "action": "message_everyone"},
            "series": make_series("ambiguous_refused", 4, "biweekly")
        }
    ]

    bundle = {
        "meta": {
            "generated_at": "2026-10-03T14:00:00Z",
            "seed": 42,
            "model_version": "sample",
            "tau": 0.50,
            "delta": 0.10,
            "n_wallets_b_total": 3000,
            "honesty_line": honesty_line
        },
        "wallets": wallets,
        "report": report,
        "remedies": remedies
    }

    return bundle

if __name__ == "__main__":
    bundle = generate_sample_seed()
    with open("web/public/seed.sample.json", "w", encoding="utf-8") as f:
        json.dump(bundle, f, indent=2, ensure_ascii=False)
    print("Wrote web/public/seed.sample.json with", len(bundle["wallets"]), "wallets.")
