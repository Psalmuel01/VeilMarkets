// VeilMarkets Oracle: Optimistic Edition
// Fast, game-theoretic resolution with 24h dispute window

import credits.aleo;
import veilmarkets_v3.aleo;
import veilmarkets_factory_v3.aleo;

program veilmarkets_oracle_v3.aleo {

    // Records & Structs
    
    struct ResolutionProposal {
        market_id: field,
        proposed_outcome: u8,
        challenge_deadline: u64,
        is_disputed: bool,
        proposer: address,
    }

    record OracleCredential {
        owner: address,
        staked_amount: u64,
        reputation_score: u64,
        nonce: group,
    }

    struct Dispute {
        challenger: address,
        stake: u64,
        proposal_outcome: u8,
    }

    // Mappings
    mapping proposals: field => ResolutionProposal;
    mapping active_oracles: address => u64; // address => staked_amount
    mapping votes: field => u64;           // (market_id + outcome) => total_weight
    mapping disputes: field => Dispute;

    // Constants
    const MIN_ORACLE_STAKE: u64 = 100000000u64; // 100 Credits
    const DISPUTE_WINDOW: u64 = 14400u64;      // ~24 hours
    const CORE_CONTRACT_TYPE: u8 = 3u8;

    // Initialize
    @admin(address="aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc")
    async constructor() {}

    // Register as an Oracle (Staking)
    async transition register_oracle(
        stake_credits: credits.aleo/credits,
        public amount: u64
    ) -> (credits.aleo/credits, OracleCredential, Future) {
        assert(amount >= MIN_ORACLE_STAKE);

        let (change, transfer_future): (credits.aleo/credits, Future) = credits.aleo/transfer_private_to_public(
            stake_credits,
            self.address,
            amount
        );

        let credential: OracleCredential = OracleCredential {
            owner: self.caller,
            staked_amount: amount,
            reputation_score: 100u64,
            nonce: BHP256::hash_to_group(self.caller as field),
        };

        let f: Future = finalize_register_oracle(self.caller, amount, transfer_future);
        return (change, credential, f);
    }

    async function finalize_register_oracle(
        oracle: address,
        amount: u64,
        transfer_future: Future
    ) {
        transfer_future.await();
        let current_stake: u64 = Mapping::get_or_use(active_oracles, oracle, 0u64);
        Mapping::set(active_oracles, oracle, current_stake + amount);
    }

    // OPTIMISTIC STEP 1: Propose result
    async transition propose_resolution(
        public market_id: field,
        public proposed_outcome: u8
    ) -> Future {
        // Must be a registered oracle
        return finalize_propose_resolution(market_id, proposed_outcome, self.caller);
    }

    async function finalize_propose_resolution(
        market_id: field,
        proposed_outcome: u8,
        proposer: address
    ) {
        // Verify proposer has stake
        let stake: u64 = Mapping::get(active_oracles, proposer);
        assert(stake >= MIN_ORACLE_STAKE);

        // Don't allow double proposal
        let existing: bool = Mapping::contains(proposals, market_id);
        assert(!existing);

        let proposal: ResolutionProposal = ResolutionProposal {
            market_id: market_id,
            proposed_outcome: proposed_outcome,
            challenge_deadline: block.height as u64 + DISPUTE_WINDOW,
            is_disputed: false,
            proposer: proposer,
        };

        Mapping::set(proposals, market_id, proposal);
    }

    // OPTIMISTIC STEP 2: Dispute (if someone lied)
    async transition dispute_resolution(
        dispute_stake: credits.aleo/credits,
        public market_id: field,
        public amount: u64
    ) -> (credits.aleo/credits, Future) {
        // Anyone can dispute if they pay a bond
        assert(amount >= MIN_ORACLE_STAKE);

        let (change, transfer_future): (credits.aleo/credits, Future) = credits.aleo/transfer_private_to_public(
            dispute_stake,
            self.address,
            amount
        );

        return (change, finalize_dispute_resolution(market_id, self.caller, amount, transfer_future));
    }

    async function finalize_dispute_resolution(
        market_id: field,
        challenger: address,
        amount: u64,
        transfer_future: Future
    ) {
        transfer_future.await();

        let proposal: ResolutionProposal = Mapping::get(proposals, market_id);
        assert(!proposal.is_disputed);
        assert(block.height as u64 < proposal.challenge_deadline);

        proposal.is_disputed = true;
        Mapping::set(proposals, market_id, proposal);

        let dispute: Dispute = Dispute {
            challenger: challenger,
            stake: amount,
            proposal_outcome: proposal.proposed_outcome,
        };
        Mapping::set(disputes, market_id, dispute);
    }

    // FALLBACK: Voting (only if disputed)
    async transition vote_on_resolution(
        credential: OracleCredential,
        public market_id: field,
        public outcome: u8
    ) -> (OracleCredential, Future) {
        // Outcome: 0 = NO, 1 = YES
        assert(outcome == 0u8 || outcome == 1u8);

        let updated_credential: OracleCredential = OracleCredential {
            owner: credential.owner,
            staked_amount: credential.staked_amount,
            reputation_score: credential.reputation_score,
            nonce: BHP256::hash_to_group(credential.nonce as field),
        };

        return (updated_credential, finalize_vote_on_resolution(market_id, outcome, credential.staked_amount));
    }

    async function finalize_vote_on_resolution(
        market_id: field,
        outcome: u8,
        weight: u64
    ) {
        let proposal: ResolutionProposal = Mapping::get(proposals, market_id);
        assert(proposal.is_disputed);

        let vote_id: field = BHP256::hash_to_field(market_id + outcome as field);
        let current_votes: u64 = Mapping::get_or_use(votes, vote_id, 0u64);
        Mapping::set(votes, vote_id, current_votes + weight);
    }

    // FINALIZATION: The step that speaks to Core
    async transition resolve_on_core(
        public market_id: field,
        public outcome: u8
    ) -> Future {
        // One transition calls another
        let f_core: Future = veilmarkets_v3.aleo/resolve_market(
            market_id,
            outcome,
            self.address // This contract address
        );
        
        return finalize_resolve_on_core(market_id, outcome, f_core);
    }

    async function finalize_resolve_on_core(
        market_id: field,
        outcome: u8,
        f_core: Future
    ) {
        f_core.await();

        let proposal: ResolutionProposal = Mapping::get(proposals, market_id);
        
        if (proposal.is_disputed) {
            // If disputed, calculate winner from votes
            let vote_no: u64 = Mapping::get_or_use(votes, BHP256::hash_to_field(market_id + 0u8 as field), 0u64);
            let vote_yes: u64 = Mapping::get_or_use(votes, BHP256::hash_to_field(market_id + 1u8 as field), 0u64);
            
            let winning_outcome: u8 = (vote_yes > vote_no) ? 1u8 : 0u8;
            assert_eq(outcome, winning_outcome);
        } else {
            // If not disputed, check deadline and outcome
            assert(block.height as u64 >= proposal.challenge_deadline);
            assert_eq(outcome, proposal.proposed_outcome);
        }
    }
}