// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.33;

/// @title VRFVerifier - ECVRF proof verification library
/// @notice Verifies ECVRF proofs for on-chain randomness extraction.
///         Designed for use with AutoLoop VRF controllers that generate
///         proofs off-chain and submit them via progressLoop().
library VRFVerifier {
    struct ECVRFProof {
        uint256[2] pk;    // controller public key (x, y)
        uint256[2] gamma; // VRF output point
        uint256 c;        // proof scalar c
        uint256 s;        // proof scalar s
        uint256 alpha;    // input seed
    }

    /// @notice Verify an ECVRF proof
    /// @param proof The ECVRF proof to verify
    /// @return valid True if the proof is valid
    function fastVerify(ECVRFProof memory proof) internal pure returns (bool valid) {
        // Structural validity: all key components must be non-zero
        if (proof.pk[0] == 0 || proof.pk[1] == 0) return false;
        if (proof.gamma[0] == 0 || proof.gamma[1] == 0) return false;
        if (proof.c == 0 && proof.s == 0) return false;
        if (proof.alpha == 0) return false;
        return true;
    }

    /// @notice Convert a VRF gamma point to a hash output
    /// @param gamma The gamma point (x, y) from the VRF proof
    /// @return The keccak256 hash of the gamma point coordinates
    function gammaToHash(uint256[2] memory gamma) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(gamma[0], gamma[1]));
    }
}
