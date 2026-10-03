"""Remedy definitions and bilingual message previews for dormant wallet causes.

All unit costs in BDT are ASSUMED and marked as such.
"""

REMEDIES: dict[str, dict] = {
    "job_exit": {
        "remedy_code": "job_exit_payroll_reengage",
        "label": "Payroll pause & re-engagement",
        "unit_cost_bdt": 15.0,  # ASSUMED: cost of SMS outreach and payroll re-link incentive
        "message_en": (
            "We noticed a pause in your salary deposits. Keep your wallet active with zero "
            "maintenance fees, or easily re-link with your new employer anytime."
        ),
        "message_bn": (
            "আপনার বেতন অ্যাকাউন্টে লেনদেন সাময়িক বন্ধ রয়েছে। কোনো চার্জ ছাড়াই অ্যাকাউন্ট "
            "চালু রাখুন অথবা যেকোনো সময় নতুন কর্মস্থলের সাথে যুক্ত করুন।"
        ),
    },
    "migration": {
        "remedy_code": "migration_agent_referral",
        "label": "Location-aware agent referral",
        "unit_cost_bdt": 10.0,  # ASSUMED: geotargeted SMS dispatch and network directory routing
        "message_en": (
            "Moved to a new area? Find trusted cash-in/out agents near your current "
            "location with zero extra fees."
        ),
        "message_bn": (
            "নতুন এলাকায় এসেছেন? আপনার বর্তমান এলাকার নিকটস্থ অনুমোদিত এজেন্টদের খুঁজে পেতে "
            "এবং সহজে লেনদেন করতে সহায়তা নিন।"
        ),
    },
    "solved_problem": {
        "remedy_code": "solved_problem_no_action",
        "label": "No action (Completed lifecycle)",
        "unit_cost_bdt": 0.0,  # ASSUMED: 0 BDT cost to avoid spending budget on completed lifecycles
        "message_en": "No action needed. User successfully completed single-purpose transaction goal.",
        "message_bn": "কোনো বার্তার প্রয়োজন নেই। গ্রাহকের নির্দিষ্ট প্রয়োজন সফলভাবে সম্পন্ন হয়েছে।",
    },
    "fee_shock": {
        "remedy_code": "fee_shock_waiver",
        "label": "Cash-out fee waiver voucher",
        "unit_cost_bdt": 25.0,  # ASSUMED: subsidized fee rebate on next 2 cash-out transactions
        "message_en": (
            "Enjoy discounted cash-out fees on your next 2 transactions this month. "
            "Dial *268# to activate your fee waiver."
        ),
        "message_bn": (
            "চলতি মাসে আপনার পরবর্তী ২টি ক্যাশ-আউটে বিশেষ ছাড় উপভোগ করুন। "
            "ফি মওকুফ সুবিধা চালু করতে ডায়াল করুন *২৬৮#।"
        ),
    },
    "supply_failure": {
        "remedy_code": "supply_failure_field_alert",
        "label": "Agent liquidity alert & routing",
        "unit_cost_bdt": 5.0,  # ASSUMED: automated agent float check and alternate point routing SMS
        "message_en": (
            "We detected service interruption at your previous agent. Nearby verified agents "
            "with active cash float: dial *268*1#."
        ),
        "message_bn": (
            "আপনার পূর্বের এজেন্ট পয়েন্টে ক্যাশ পেতে সমস্যা হয়েছিল। পর্যাপ্ত ব্যালেন্সসহ "
            "নিকটস্থ সক্রিয় এজেন্ট দেখতে ডায়াল করুন *২৬৮*১#।"
        ),
    },
}
