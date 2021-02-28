pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./Payment.sol";

contract Asset is ERC721, Payment {
    using Counters for Counters.Counter;
    using EnumerableMap for EnumerableMap.UintToAddressMap;

    Counters.Counter private _tokenIds;

    EnumerableMap.UintToAddressMap private _tokenCreators;

    mapping(uint256 => int96) private records;
    uint256[] private availableIds;
    uint256[] private rentedIds;

    constructor(
        string memory _name,
        string memory _symbol,
        ISuperfluid host,
        IConstantFlowAgreementV1 cfa,
        ISuperToken acceptedToken
    ) ERC721(_name, _symbol) Payment(host, cfa, acceptedToken) {}

    receive() external payable {}

    function setAvailableTokens() public returns (bool) {
        delete availableIds;
        for (uint256 i = 0; i < totalSupply(); i++) {
            if (ownerOf(tokenByIndex(i)) == _tokenCreators.get(tokenByIndex(i)))
                availableIds.push(tokenByIndex(i));
        }
        return true;
    }

    function getAvailableTokens() public view returns (uint256[] memory) {
        return availableIds;
    }

    function setRentedTokens() public returns (bool) {
        delete rentedIds;
        for (uint256 i = 0; i < balanceOf(msg.sender); i++) {
            if (_tokenCreators.get(tokenByIndex(i)) != msg.sender)
                rentedIds.push(tokenByIndex(i));
        }
        return true;
    }

    function getRentedTokens() public view returns (uint256[] memory) {
        return rentedIds;
    }

    function createAsset(string memory tokenURI) public returns (uint256) {
        _tokenIds.increment();

        uint256 newAssetId = _tokenIds.current();
        _safeMint(msg.sender, newAssetId);
        _setTokenURI(newAssetId, tokenURI);
        _tokenCreators.set(newAssetId, msg.sender);

        return newAssetId;
    }

    function updateAsset(bytes calldata ctx, uint256 tokenId)
        private
        returns (bytes memory newCtx)
    {
        address requester = host.decodeCtx(ctx).msgSender;

        newCtx = ctx;
        int96 netFlowRate = cfa.getNetFlow(acceptedToken, address(this));
        if (netFlowRate > 0) {
            if (ownerOf(tokenId) == _tokenCreators.get(tokenId)) {
                (, int96 currentRate, , ) =
                    cfa.getFlow(acceptedToken, address(this), ownerOf(tokenId));

                if (currentRate == 0) {
                    (newCtx, ) = host.callAgreementWithContext(
                        cfa,
                        abi.encodeWithSelector(
                            cfa.createFlow.selector,
                            acceptedToken,
                            ownerOf(tokenId),
                            netFlowRate,
                            new bytes(0)
                        ),
                        new bytes(0),
                        newCtx
                    );
                } else {
                    (newCtx, ) = host.callAgreementWithContext(
                        cfa,
                        abi.encodeWithSelector(
                            cfa.updateFlow.selector,
                            acceptedToken,
                            ownerOf(tokenId),
                            currentRate + netFlowRate,
                            new bytes(0)
                        ),
                        new bytes(0),
                        newCtx
                    );
                }

                records[tokenId] = netFlowRate;
                _safeTransfer(ownerOf(tokenId), requester, tokenId, "");
            } else {
                (newCtx, ) = host.callAgreementWithContext(
                    cfa,
                    abi.encodeWithSelector(
                        cfa.deleteFlow.selector,
                        acceptedToken,
                        address(this),
                        ownerOf(tokenId),
                        new bytes(0)
                    ),
                    new bytes(0),
                    newCtx
                );
            }
        } else if (netFlowRate < 0) {
            if (_exists(tokenId) && ownerOf(tokenId) == requester) {
                _safeTransfer(
                    requester,
                    _tokenCreators.get(tokenId),
                    tokenId,
                    ""
                );

                (, int96 currentRate, , ) =
                    cfa.getFlow(acceptedToken, address(this), ownerOf(tokenId));
                int96 newRate = currentRate + netFlowRate;
                if (newRate == 0) {
                    (newCtx, ) = host.callAgreementWithContext(
                        cfa,
                        abi.encodeWithSelector(
                            cfa.deleteFlow.selector,
                            acceptedToken,
                            address(this),
                            ownerOf(tokenId),
                            new bytes(0)
                        ),
                        new bytes(0),
                        newCtx
                    );
                } else {
                    (newCtx, ) = host.callAgreementWithContext(
                        cfa,
                        abi.encodeWithSelector(
                            cfa.updateFlow.selector,
                            acceptedToken,
                            ownerOf(tokenId),
                            newRate,
                            new bytes(0)
                        ),
                        new bytes(0),
                        newCtx
                    );
                }

                delete records[tokenId];
            }
        }
        return newCtx;
    }

    function afterAgreementCreated(
        ISuperToken _superToken,
        address _agreementClass,
        bytes32, // _agreementId
        bytes calldata, // _agreementData
        bytes calldata, // _cbdata
        bytes calldata _ctx
    )
        external
        override
        onlyExpected(_superToken, _agreementClass)
        onlyHost
        returns (bytes memory)
    {
        uint256 userData = abi.decode(host.decodeCtx(_ctx).userData, (uint256));
        return updateAsset(_ctx, userData);
    }

    function afterAgreementUpdated(
        ISuperToken _superToken,
        address _agreementClass,
        bytes32, // _agreementId
        bytes calldata, // _agreementData
        bytes calldata, // _cbdata
        bytes calldata _ctx
    )
        external
        override
        onlyExpected(_superToken, _agreementClass)
        onlyHost
        returns (bytes memory)
    {
        uint256 userData = abi.decode(host.decodeCtx(_ctx).userData, (uint256));
        return updateAsset(_ctx, userData);
    }

    function afterAgreementTerminated(
        ISuperToken _superToken,
        address _agreementClass,
        bytes32, // _agreementId
        bytes calldata, // _agreementData
        bytes calldata, // _cbdata
        bytes calldata _ctx
    )
        external
        override
        onlyExpected(_superToken, _agreementClass)
        onlyHost
        returns (bytes memory)
    {
        uint256 userData = abi.decode(host.decodeCtx(_ctx).userData, (uint256));
        bytes memory newCtx = updateAsset(_ctx, userData);
        return newCtx;
    }
}
