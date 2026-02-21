// VeilMarkets Oracle
// Decentralized resolution with dispute mechanism
// Integrated with core contract for finalization

import veilmarkets.aleo;
import veilmarkets_factory.aleo;

program veilmarkets_oracle.aleo {

    // Structs & Records
    
    struct ResolutionProposal {
        market_id: field,
        proposed_outcome: u8,
        proposer: address,
        timestamp: u64,
        votes_for: u64,
        votes_against: u64,
        total_stake_for: u64,
        resolved: bool,
    }

    struct DisputeInfo {
        holder: address,
        market_id: field,
        disputed_outcome: u8,
        evidence_hash: field,
        stake_amount: u64,
        filed_at: u64,
    }
    
    record OracleCredential {
        owner: address,
        oracle_id: field,
        reputation_score: u64,
        staked_amount: u64,
        active: bool,
    }
    
    record Dispute {
        owner: address,
        market_id: field,
        disputed_outcome: u8,
        evidence_hash: field,
        stake_amount: u64,
        filed_at: u64,
    }
    
    record Credits {
        owner: address,
        amount: u64,
        nonce: group,
    }

    // Mappings
    mapping oracles: address => bool;
    mapping oracle_stakes: address => u64;
    mapping proposals: field => ResolutionProposal;
    mapping dispute_deadlines: field => u64;
    mapping disputes: field => DisputeInfo; // market_id => info
    mapping resolution_outcomes: field => u8; // Final verified outcomes
    
    // Constants
    const MIN_ORACLE_STAKE: u64 = 100000000000u64; // 100k credits
    const DISPUTE_PERIOD: u64 = 14400u64; // ~1 day in blocks
    const VOTE_THRESHOLD_NUM: u64 = 2u64; // 2/3 threshold
    const VOTE_THRESHOLD_DEN: u64 = 3u64;
    const CORE_CONTRACT: address = aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc; // Simplified

    // Initialize
    @admin(address="aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc")
    async constructor() {}

    // Register as oracle with stake
    async transition register_oracle(
        stake: Credits,
    ) -> (OracleCredential, Credits, Future) {
        assert(stake.amount >= MIN_ORACLE_STAKE);
        
        let credential: OracleCredential = OracleCredential {
            owner: self.caller,
            oracle_id: BHP256::hash_to_field(self.caller),
            reputation_score: 100u64, // Starting reputation
            staked_amount: stake.amount,
            active: true,
        };

        let f: Future = finalize_register_oracle(self.caller, stake.amount);
        
        // Return change record
        let change: Credits = Credits {
            owner: self.caller,
            amount: 0u64,
            nonce: stake.nonce, // Keep same nonce or generate new
        };

        return (credential, change, f);
    }

    async function finalize_register_oracle(oracle: address, amount: u64) {
        Mapping::set(oracles, oracle, true);
        Mapping::set(oracle_stakes, oracle, amount);
    }

    // Propose resolution (called by oracle)
    async transition propose_resolution(
        credential: OracleCredential,
        public market_id: field,
        public outcome: u8,
        public evidence_hash: field,
    ) -> (OracleCredential, Future) {
        assert(credential.active);
        assert(credential.staked_amount >= MIN_ORACLE_STAKE);
        assert(outcome == 0u8 || outcome == 1u8);

        let f: Future = finalize_propose_resolution(
            market_id,
            outcome,
            credential.owner,
            evidence_hash
        );

        return (credential, f);
    }

    async function finalize_propose_resolution(
        market_id: field,
        outcome: u8,
        proposer: address,
        evidence_hash: field,
    ) {
        let is_oracle: bool = Mapping::get_or_use(oracles, proposer, false);
        assert(is_oracle);

        // Check no existing active proposal
        let proposal: ResolutionProposal = ResolutionProposal {
            market_id: market_id,
            proposed_outcome: outcome,
            proposer: proposer,
            timestamp: block.height as u64,
            votes_for: 1u64,
            votes_against: 0u64,
            total_stake_for: Mapping::get(oracle_stakes, proposer),
            resolved: false,
        };

        Mapping::set(proposals, market_id, proposal);
        Mapping::set(dispute_deadlines, market_id, block.height as u64 + DISPUTE_PERIOD);
    }

    // Vote on resolution
    async transition vote_on_resolution(
        credential: OracleCredential,
        public market_id: field,
        public support: bool, // true = for, false = against
    ) -> (OracleCredential, Future) {
        assert(credential.active);
        
        let f: Future = finalize_vote_on_resolution(
            market_id,
            support,
            credential.owner,
            credential.staked_amount
        );
        
        return (credential, f);
    }

    async function finalize_vote_on_resolution(
        market_id: field,
        support: bool,
        voter: address,
        stake: u64,
    ) {
        let is_oracle: bool = Mapping::get_or_use(oracles, voter, false);
        assert(is_oracle);

        let proposal: ResolutionProposal = Mapping::get(proposals, market_id);
        assert(!proposal.resolved);
        
        let deadline: u64 = Mapping::get(dispute_deadlines, market_id);
        assert(block.height as u64 < deadline);

        let new_votes_for: u64 = support ? proposal.votes_for + 1u64 : proposal.votes_for;
        let new_votes_against: u64 = support ? proposal.votes_against : proposal.votes_against + 1u64;
        let new_stake_for: u64 = support ? proposal.total_stake_for + stake : proposal.total_stake_for;

        let updated: ResolutionProposal = ResolutionProposal {
            market_id: proposal.market_id,
            proposed_outcome: proposal.proposed_outcome,
            proposer: proposal.proposer,
            timestamp: proposal.timestamp,
            votes_for: new_votes_for,
            votes_against: new_votes_against,
            total_stake_for: new_stake_for,
            resolved: proposal.resolved,
        };

        Mapping::set(proposals, market_id, updated);
    }

    // Finalize resolution – Pattern: Pass outcome to transition
    async transition finalize_resolution(
        public market_id: field,
        public outcome: u8,
    ) -> Future {
        // Call core contract to execute resolution
        let core_future: Future = veilmarkets.aleo/resolve_market(
            market_id,
            outcome,
            self.caller // In transition, self.caller is the caller of this transition
        );

        return finalize_finalize_resolution(market_id, outcome, core_future);
    }

    async function finalize_finalize_resolution(market_id: field, outcome: u8, core_future: Future) {
        let proposal: ResolutionProposal = Mapping::get(proposals, market_id);
        assert(!proposal.resolved);
        assert_eq(proposal.proposed_outcome, outcome);

        let deadline: u64 = Mapping::get(dispute_deadlines, market_id);
        assert(block.height as u64 >= deadline);

        // Check no active dispute
        let dispute_exists: bool = Mapping::contains(disputes, market_id);
        assert(!dispute_exists);

        // Check threshold
        let total_votes: u64 = proposal.votes_for + proposal.votes_against;
        assert(total_votes >= 3u64);
        
        let threshold: u64 = (total_votes * VOTE_THRESHOLD_NUM) / VOTE_THRESHOLD_DEN;
        assert(proposal.votes_for >= threshold);

        // Mark as resolved
        let updated: ResolutionProposal = ResolutionProposal {
            market_id: proposal.market_id,
            proposed_outcome: proposal.proposed_outcome,
            proposer: proposal.proposer,
            timestamp: proposal.timestamp,
            votes_for: proposal.votes_for,
            votes_against: proposal.votes_against,
            total_stake_for: proposal.total_stake_for,
            resolved: true,
        };
        Mapping::set(proposals, market_id, updated);
        Mapping::set(resolution_outcomes, market_id, outcome);

        // Await core future
        core_future.await();
    }

    // File dispute
    async transition file_dispute(
        stake: Credits,
        public market_id: field,
        public disputed_outcome: u8,
        public evidence_hash: field,
    ) -> (Credits, Dispute, Future) {
        // Dispute record returned to user
        let dispute: Dispute = Dispute {
            owner: self.caller,
            market_id: market_id,
            disputed_outcome: disputed_outcome,
            evidence_hash: evidence_hash,
            stake_amount: stake.amount,
            filed_at: 0u64, // Placeholder, set in finalize or ignored for record
        };

        let change: Credits = Credits {
            owner: self.caller,
            amount: 0u64, 
            nonce: stake.nonce,
        };

        let f: Future = finalize_file_dispute(market_id, self.caller, disputed_outcome, evidence_hash, stake.amount);
        
        return (change, dispute, f);
    }

    async function finalize_file_dispute(
        market_id: field,
        disputer: address,
        disputed_outcome: u8,
        evidence_hash: field,
        stake_amount: u64,
    ) {
        let deadline: u64 = Mapping::get(dispute_deadlines, market_id);
        assert(block.height as u64 < deadline);

        let info: DisputeInfo = DisputeInfo {
            holder: disputer,
            market_id: market_id,
            disputed_outcome: disputed_outcome,
            evidence_hash: evidence_hash,
            stake_amount: stake_amount,
            filed_at: block.height as u64,
        };
        
        Mapping::set(disputes, market_id, info);
        Mapping::set(dispute_deadlines, market_id, block.height as u64 + DISPUTE_PERIOD);
    }

    // Resolve dispute
    async transition resolve_dispute(
        credential: OracleCredential,
        public market_id: field,
        public dispute_valid: bool,
        public correct_outcome: u8,
    ) -> (OracleCredential, Future) {
        assert(credential.active);
        assert(credential.reputation_score >= 500u64); 
        
        let f: Future = finalize_resolve_dispute(
            market_id,
            dispute_valid,
            correct_outcome,
            credential.owner
        );
        
        // Update reputation (in transition for demo, better in finalize)
        let updated_cred: OracleCredential = OracleCredential {
            owner: credential.owner,
            oracle_id: credential.oracle_id,
            reputation_score: credential.reputation_score + (dispute_valid ? 50u64 : 0u64),
            staked_amount: credential.staked_amount,
            active: credential.active,
        };
        
        return (updated_cred, f);
    }

    async function finalize_resolve_dispute(
        market_id: field,
        dispute_valid: bool,
        correct_outcome: u8,
        resolver: address,
    ) {
        let dispute: DisputeInfo = Mapping::get(disputes, market_id);
        Mapping::remove(disputes, market_id);
        
        if dispute_valid {
            let proposal: ResolutionProposal = Mapping::get(proposals, market_id);
            // reset proposal
            let new_proposal: ResolutionProposal = ResolutionProposal {
                market_id: market_id,
                proposed_outcome: correct_outcome,
                proposer: resolver,
                timestamp: block.height as u64,
                votes_for: 1u64,
                votes_against: 0u64,
                total_stake_for: Mapping::get(oracle_stakes, resolver),
                resolved: false,
            };
            Mapping::set(proposals, market_id, new_proposal);
            Mapping::set(dispute_deadlines, market_id, block.height as u64 + DISPUTE_PERIOD);
        }
    }

    // Unregister oracle
    async transition unregister_oracle(
        credential: OracleCredential,
    ) -> (Credits, Future) {
        assert(credential.active);
        
        let returned_stake: Credits = Credits {
            owner: credential.owner,
            amount: credential.staked_amount,
            nonce: BHP256::hash_to_group(credential.oracle_id),
        };
        
        return (returned_stake, finalize_unregister_oracle(credential.owner));
    }

    async function finalize_unregister_oracle(oracle: address) {
        Mapping::set(oracles, oracle, false);
        Mapping::set(oracle_stakes, oracle, 0u64);
    }
}