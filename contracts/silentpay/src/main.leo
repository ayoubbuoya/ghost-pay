// The 'silentpay' program.
program silentpay.aleo {
    // This is the constructor for the program.
    // The constructor allows you to manage program upgrades.
    // It is called when the program is deployed or upgraded.
    // It is currently configured to **prevent** upgrades.
    // Other configurations include:
    //  - @admin(address="aleo1...")
    //  - @checksum(mapping="credits.aleo/fixme", key="0field")
    //  - @custom
    // For more information, please refer to the documentation: `https://docs.leo-lang.org/guides/upgradability`
    @noupgrade
    async constructor() {}

    transition main(public a: u32, b: u32) -> u32 {
        let c: u32 = a + b;
        return c;
    }

    // The Private Paycheck Record
    // "owner" is built-in. Private by default.
    record Paycheck {
        owner: address,
        amount: u64,
        issuer: address,
        timestamp: i64, // unix timestamp
    }

    // A public receipt for the employee to show (optional)
    struct IncomeProof {
        employee: address,
        is_eligible: bool,
        threshold: u64,
        timestamp: u32
    }


    // TRANSITION 1: ISSUE SALARY (Employer Only)
    // The "owner" is the one receiving the money.
    // The "amount" input is private, so it's encrypted on-chain.
    // The "issue_timestamp" input is public, so it's visible on-chain.
    transition issue_paycheck(owner: address, private amount: u64, public issue_timestamp: i64) -> Paycheck {

       let paycheck =  Paycheck {
            owner: owner,
            amount: amount,
            issuer: self.caller,
            timestamp: issue_timestamp,
        };

        // Output the record
        return paycheck; 
    }

    // TRANSITION 2: PROVE INCOME
    // Input: The private paycheck + a public threshold (e.g., Landlord asks "Do you make > 5000?")
    // Output: 1. A NEW Paycheck record (so you keep your money)
    //         2. A Public IncomeProof (Yes/No)
    transition verify_income(
        private pay: Paycheck, 
        public threshold: u64, 
        public current_time: u32
    ) -> (Paycheck, IncomeProof) {
        
        // Logic: Check if salary > threshold
        let eligibility: bool = pay.amount >= threshold;

        // Re-issue the paycheck to the owner (so they don't lose the record)
        let returned_paycheck: Paycheck = Paycheck {
            owner: pay.owner,
            amount: pay.amount,
            issuer: pay.issuer,
            timestamp: pay.timestamp,
        };

        // Create the public proof
        let proof: IncomeProof = IncomeProof {
            employee: self.caller,
            is_eligible: eligibility,
            threshold: threshold,
            timestamp: current_time
        };

        return (returned_paycheck, proof);
    }
}
