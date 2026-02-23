// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

/**
 * @title VRFVerifier
 * @notice Gas-efficient ECVRF proof verification for secp256k1 using the ecrecover precompile.
 * @dev Local copy of lib/autoloop/src/VRFVerifier.sol with pragma fixed to ^0.8.33.
 *      Ported from Witnet vrf-solidity. Implements ECVRF-SECP256K1-SHA256-TAI (cipher suite 0xFE).
 *
 *      The key insight: instead of doing full EC point multiplication on-chain (~millions of gas),
 *      we use ecrecover as an EC multiplication oracle (~3k gas). The prover computes helper points
 *      (U, V) off-chain, and the verifier checks them using ecrecover + EC addition only.
 */
library VRFVerifier {
    // secp256k1 curve parameters
    uint256 internal constant GX =
        0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
    uint256 internal constant GY =
        0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8;
    uint256 internal constant PP =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
    uint256 internal constant NN =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    /**
     * @notice Verifies an ECVRF proof using the fastVerify approach.
     * @param publicKey The [x, y] coordinates of the prover's public key.
     * @param proof The [gamma_x, gamma_y, c, s] VRF proof components.
     * @param message The input message (seed) that was signed.
     * @param uPoint The [x, y] coordinates of precomputed point U = s*G - c*PublicKey.
     * @param vComponents The [sH_x, sH_y, cGamma_x, cGamma_y] precomputed components
     *                    where V = s*H - c*Gamma (H = hashToCurve(message)).
     * @return True if the proof is valid.
     */
    function fastVerify(
        uint256[2] memory publicKey,
        uint256[4] memory proof,
        bytes memory message,
        uint256[2] memory uPoint,
        uint256[4] memory vComponents
    ) internal pure returns (bool) {
        uint256 gammaX = proof[0];
        uint256 gammaY = proof[1];
        uint256 c = proof[2];
        uint256 s = proof[3];

        // Step 1: Hash message to curve point H
        (uint256 hx, uint256 hy) = hashToCurve(publicKey, message);

        // Step 2: Verify U = s*G - c*PK using ecrecover
        if (!_verifyU(publicKey, c, s, uPoint)) {
            return false;
        }

        // Step 3: Verify V components are on curve
        if (!_verifySH(hx, hy, s, vComponents[0], vComponents[1])) {
            return false;
        }
        if (!_verifyCGamma(gammaX, gammaY, c, vComponents[2], vComponents[3])) {
            return false;
        }

        // Step 4: Compute V = sH - cGamma (as sH + (-cGamma))
        (uint256 vx, uint256 vy) = ecSub(
            vComponents[0],
            vComponents[1],
            vComponents[2],
            vComponents[3]
        );

        // Step 5: Recompute c' = hash(G, H, PK, Gamma, U, V) and check c' == c
        uint256 derivedC = _hashPoints(
            hx, hy,
            publicKey[0], publicKey[1],
            gammaX, gammaY,
            uPoint[0], uPoint[1],
            vx, vy
        );

        return derivedC == c;
    }

    /**
     * @notice Derives a deterministic random output from a verified VRF proof.
     * @param gammaX The x-coordinate of the Gamma point from the proof.
     * @param gammaY The y-coordinate of the Gamma point from the proof.
     * @return The 32-byte random output.
     */
    function gammaToHash(uint256 gammaX, uint256 gammaY) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("VRF_OUTPUT", gammaX, gammaY));
    }

    /**
     * @notice Hash-to-curve: deterministically maps a message to a secp256k1 point.
     * @dev Uses try-and-increment method (TAI) as specified in ECVRF-SECP256K1-SHA256-TAI.
     */
    function hashToCurve(
        uint256[2] memory publicKey,
        bytes memory message
    ) internal pure returns (uint256 x, uint256 y) {
        bytes32 hash;
        for (uint256 ctr = 0; ctr < 256; ctr++) {
            hash = keccak256(
                abi.encodePacked(
                    uint8(0xFE),
                    uint8(0x01),
                    publicKey[0],
                    publicKey[1],
                    message,
                    uint8(ctr)
                )
            );
            x = uint256(hash);
            if (x >= PP) continue;

            uint256 y2 = addmod(mulmod(mulmod(x, x, PP), x, PP), 7, PP);
            y = _expMod(y2, (PP + 1) / 4, PP);
            if (mulmod(y, y, PP) == y2) {
                if (y % 2 != 0) {
                    y = PP - y;
                }
                return (x, y);
            }
        }
        revert("VRFVerifier: hash-to-curve failed");
    }

    // ---------------------------------------------------------------
    //  Internal verification helpers
    // ---------------------------------------------------------------

    function _verifyU(
        uint256[2] memory publicKey,
        uint256 c,
        uint256 s,
        uint256[2] memory uPoint
    ) private pure returns (bool) {
        address expectedAddr = _pointToAddress(uPoint[0], uPoint[1]);

        uint256 pkX = publicKey[0] % NN;
        if (pkX == 0) return false;

        uint256 e = mulmod(c, pkX, NN);
        uint256 sParam = mulmod(s, pkX, NN);

        uint8 v = publicKey[1] % 2 == 0 ? uint8(27) : uint8(28);

        address recovered = ecrecover(bytes32(e), v, bytes32(pkX), bytes32(sParam));
        return recovered == expectedAddr && recovered != address(0);
    }

    function _verifySH(
        uint256,
        uint256,
        uint256,
        uint256 shX,
        uint256 shY
    ) private pure returns (bool) {
        return _isOnCurve(shX, shY);
    }

    function _verifyCGamma(
        uint256,
        uint256,
        uint256,
        uint256 cgX,
        uint256 cgY
    ) private pure returns (bool) {
        return _isOnCurve(cgX, cgY);
    }

    function _hashPoints(
        uint256 hx, uint256 hy,
        uint256 pkx, uint256 pky,
        uint256 gammaX, uint256 gammaY,
        uint256 ux, uint256 uy,
        uint256 vx, uint256 vy
    ) private pure returns (uint256) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                uint8(0xFE),
                uint8(0x02),
                hx, hy,
                pkx, pky,
                gammaX, gammaY,
                ux, uy,
                vx, vy
            )
        );
        return uint256(hash) % NN;
    }

    // ---------------------------------------------------------------
    //  Elliptic curve arithmetic helpers
    // ---------------------------------------------------------------

    function _isOnCurve(uint256 x, uint256 y) private pure returns (bool) {
        if (x == 0 && y == 0) return false;
        if (x >= PP || y >= PP) return false;
        uint256 lhs = mulmod(y, y, PP);
        uint256 rhs = addmod(mulmod(mulmod(x, x, PP), x, PP), 7, PP);
        return lhs == rhs;
    }

    function _pointToAddress(uint256 x, uint256 y) private pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(x, y)))));
    }

    function ecSub(
        uint256 x1, uint256 y1,
        uint256 x2, uint256 y2
    ) internal pure returns (uint256, uint256) {
        return ecAdd(x1, y1, x2, PP - y2);
    }

    function ecAdd(
        uint256 x1, uint256 y1,
        uint256 x2, uint256 y2
    ) internal pure returns (uint256 x3, uint256 y3) {
        if (x1 == 0 && y1 == 0) return (x2, y2);
        if (x2 == 0 && y2 == 0) return (x1, y1);

        if (x1 == x2) {
            if (y1 == y2) {
                return _ecDouble(x1, y1);
            } else {
                return (0, 0);
            }
        }

        uint256 lambda = mulmod(
            addmod(y2, PP - y1, PP),
            _invMod(addmod(x2, PP - x1, PP), PP),
            PP
        );
        x3 = addmod(mulmod(lambda, lambda, PP), PP - addmod(x1, x2, PP), PP);
        y3 = addmod(mulmod(lambda, addmod(x1, PP - x3, PP), PP), PP - y1, PP);
    }

    function _ecDouble(uint256 x, uint256 y) private pure returns (uint256 x3, uint256 y3) {
        uint256 lambda = mulmod(
            mulmod(3, mulmod(x, x, PP), PP),
            _invMod(mulmod(2, y, PP), PP),
            PP
        );
        x3 = addmod(mulmod(lambda, lambda, PP), PP - mulmod(2, x, PP), PP);
        y3 = addmod(mulmod(lambda, addmod(x, PP - x3, PP), PP), PP - y, PP);
    }

    function _expMod(uint256 base, uint256 exp, uint256 mod) private pure returns (uint256 result) {
        result = 1;
        base = base % mod;
        while (exp > 0) {
            if (exp % 2 == 1) {
                result = mulmod(result, base, mod);
            }
            exp = exp / 2;
            base = mulmod(base, base, mod);
        }
    }

    function _invMod(uint256 a, uint256 mod) private pure returns (uint256) {
        require(a != 0, "VRFVerifier: zero has no inverse");
        return _expMod(a, mod - 2, mod);
    }
}
