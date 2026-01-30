// VeilMarkets Oracle Contract
// Handles market resolution through trusted oracles and dispute mechanisms

program veilmarkets_oracle.aleo {
    
    // ============================================================================
    // STRUCTS & RECORDS
    // ============================================================================
    
    record OracleCredential {
        owner: address,
        oracle_id: field,
        reputation_score: u64,
        active: bool,
    }
    
    struct ResolutionProposal {
        market_id: field,
        proposed_outcome: u8,
        proposer: address,
        timestamp: u64,
        votes_for: u64,
        votes_against: u64,
    }
    
    record Dispute {
        owner: address,
        market_id: field,
        disputed_outcome: u8,
        evidence_hash: field,
        stake_amount: u64,
    }
    
    record Credits {
        owner: address,
        amount: u64,
    }

    // ============================================================================
    // MAPPINGS
    // ============================================================================
    
    mapping oracles: address => bool;
    mapping proposals: field => ResolutionProposal;
    mapping dispute_deadlines: field => u64;
    mapping oracle_reputation: address => u64;

    // ============================================================================
    // ADMIN TRANSITIONS
    // ============================================================================

    // Register a new oracle
    async transition register_oracle(
        public oracle_address: address,
        public initial_reputation: u64,
    ) -> (OracleCredential, Future) {
        let credential: OracleCredential = OracleCredential {
            owner: oracle_address,
            oracle_id: BHP256::hash_to_field(oracle_address),
            reputation_score: initial_reputation,
            active: true,
        };
        
        let f: Future = finalize_register_oracle(oracle_address, initial_reputation);
        return (credential, f);
    }

    async function finalize_register_oracle(oracle_address: address, reputation: u64) {
        Mapping::set(oracles, oracle_address, true);
        Mapping::set(oracle_reputation, oracle_address, reputation);
    }

    // Revoke oracle credentials
    async transition revoke_oracle(
        credential: OracleCredential,
        public oracle_address: address,
    ) -> Future {
        assert_eq(credential.owner, oracle_address);
        return finalize_revoke_oracle(oracle_address);
    }

    async function finalize_revoke_oracle(oracle_address: address) {
        Mapping::set(oracles, oracle_address, false);
    }

    // ============================================================================
    // ORACLE TRANSITIONS
    // ============================================================================

    // Propose market resolution
    async transition propose_resolution(
        credential: OracleCredential,
        public market_id: field,
        public outcome: u8,
        public evidence_hash: field,
    ) -> (OracleCredential, Future) {
        assert(credential.active);
        
        let f: Future = finalize_propose_resolution(market_id, outcome, credential.owner, evidence_hash);
        return (credential, f);
    }

    async function finalize_propose_resolution(
        market_id: field,
        outcome: u8,
        proposer: address,
        evidence_hash: field,
    ) {
        let is_oracle: bool = Mapping::get(oracles, proposer);
        assert(is_oracle);
        
        let proposal: ResolutionProposal = ResolutionProposal {
            market_id: market_id,
            proposed_outcome: outcome,
            proposer: proposer,
            timestamp: block.height,
            votes_for: 1u64,
            votes_against: 0u64,
        };
        
        Mapping::set(proposals, market_id, proposal);
        
        let deadline: u64 = block.height + 14400u64;
        Mapping::set(dispute_deadlines, market_id, deadline);
    }

    // Vote on resolution proposal
    async transition vote_on_resolution(
        credential: OracleCredential,
        public market_id: field,
        public vote_for: bool,
    ) -> (OracleCredential, Future) {
        assert(credential.active);
        
        let f: Future = finalize_vote_on_resolution(market_id, vote_for, credential.owner);
        return (credential, f);
    }

    async function finalize_vote_on_resolution(
        market_id: field,
        vote_for: bool,
        voter: address,
    ) {
        let is_oracle: bool = Mapping::get(oracles, voter);
        assert(is_oracle);
        
        let proposal: ResolutionProposal = Mapping::get(proposals, market_id);
        let deadline: u64 = Mapping::get(dispute_deadlines, market_id);
        assert(block.height < deadline);
        
        let new_votes_for: u64 = vote_for ? proposal.votes_for + 1u64 : proposal.votes_for;
        let new_votes_against: u64 = vote_for ? proposal.votes_against : proposal.votes_against + 1u64;
        
        let updated_proposal: ResolutionProposal = ResolutionProposal {
            market_id: proposal.market_id,
            proposed_outcome: proposal.proposed_outcome,
            proposer: proposal.proposer,
            timestamp: proposal.timestamp,
            votes_for: new_votes_for,
            votes_against: new_votes_against,
        };
        
        Mapping::set(proposals, market_id, updated_proposal);
    }

    // Finalize resolution after dispute period
    async transition finalize_resolution(
        public market_id: field,
    ) -> Future {
        return finalize_finalize_resolution(market_id);
    }

    async function finalize_finalize_resolution(market_id: field) {
        let proposal: ResolutionProposal = Mapping::get(proposals, market_id);
        let deadline: u64 = Mapping::get(dispute_deadlines, market_id);
        assert(block.height >= deadline);
        
        let total_votes: u64 = proposal.votes_for + proposal.votes_against;
        let threshold: u64 = (total_votes * 2u64) / 3u64;
        assert(proposal.votes_for >= threshold);
    }

    // ============================================================================
    // DISPUTE TRANSITIONS
    // ============================================================================

    // File dispute against resolution
    async transition file_dispute(
        stake: Credits,
        public market_id: field,
        public disputed_outcome: u8,
        public evidence_hash: field,
        public stake_amount: u64,
    ) -> (Credits, Dispute, Future) {
        assert(stake.amount >= stake_amount);
        
        let dispute: Dispute = Dispute {
            owner: self.caller,
            market_id: market_id,
            disputed_outcome: disputed_outcome,
            evidence_hash: evidence_hash,
            stake_amount: stake_amount,
        };
        
        let change: Credits = Credits {
            owner: self.caller,
            amount: stake.amount - stake_amount,
        };
        
        let f: Future = finalize_file_dispute(market_id);
        return (change, dispute, f);
    }

    async function finalize_file_dispute(market_id: field) {
        let deadline: u64 = Mapping::get(dispute_deadlines, market_id);
        assert(block.height < deadline);
        
        let extended_deadline: u64 = block.height + 28800u64;
        Mapping::set(dispute_deadlines, market_id, extended_deadline);
    }

    // Resolve dispute
    async transition resolve_dispute(
        dispute: Dispute,
        public market_id: field,
        public dispute_valid: bool,
    ) -> (Credits, Future) {
        assert_eq(dispute.market_id, market_id);
        
        let payout_amount: u64 = dispute_valid ? dispute.stake_amount * 2u64 : 0u64;
        
        let payout: Credits = Credits {
            owner: dispute.owner,
            amount: payout_amount,
        };
        
        let f: Future = finalize_resolve_dispute(market_id, dispute_valid);
        return (payout, f);
    }

    async function finalize_resolve_dispute(market_id: field, dispute_valid: bool) {
        if dispute_valid {
            let proposal: ResolutionProposal = Mapping::get(proposals, market_id);
            let invalidated: ResolutionProposal = ResolutionProposal {
                market_id: proposal.market_id,
                proposed_outcome: proposal.proposed_outcome,
                proposer: proposal.proposer,
                timestamp: proposal.timestamp,
                votes_for: proposal.votes_for,
                votes_against: 999u64,
            };
            Mapping::set(proposals, market_id, invalidated);
        }
    }
}
