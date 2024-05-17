import * as web3 from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import {
    MAINNET_PROGRAM_ID,
    Liquidity,
    TokenAmount,
    Percent,
    Token
} from '@raydium-io/raydium-sdk';
import { Market } from "@openbook-dex/openbook";
import { Wallet } from './types';

export async function getSolanaBalance(connection: web3.Connection, wallet: Wallet): Promise<number | string> {
    try {
        const pkey = new web3.PublicKey(wallet.publickey);
        const lamports = await connection.getBalance(pkey);
        if (lamports === 0) {
            return lamports;
        }
        let sol = lamports / web3.LAMPORTS_PER_SOL;
        sol = parseFloat(sol.toFixed(2));
        return sol;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

export async function getTokenBalance(connection: web3.Connection, wallet: Wallet, tokenAddress: string): Promise<number> {
    const token = new web3.PublicKey(tokenAddress);
    const walletkey = new web3.PublicKey(wallet.publickey);

    const tokenAccountAddress = await splToken.getAssociatedTokenAddress(
        token,
        walletkey,
        false
    );

    const balance = await connection.getTokenAccountBalance(tokenAccountAddress);
    return parseFloat(balance.value.amount) / 1000000;
}

export async function fetchTokenprice(connection: web3.Connection, marketAddress: string, tokenAddress: string): Promise<number> {
    const marketPublicKey = new web3.PublicKey(marketAddress);

    const tokenPublicKey = new web3.PublicKey(tokenAddress);

    const { decoded } = await Market.load(
        connection,
        marketPublicKey,
        { commitment: "confirmed", skipPreflight: true },
        MAINNET_PROGRAM_ID.OPENBOOK_MARKET
    );

    const {
        baseVault,
        quoteVault,
        bids,
        asks,
        eventQueue,
    } = decoded;

    const poolkeys = Liquidity.getAssociatedPoolKeys({
        version: 4,
        marketVersion: 3,
        marketId: marketPublicKey,
        baseMint: tokenPublicKey,
        quoteMint: new web3.PublicKey('So11111111111111111111111111111111111111112'),
        baseDecimals: 6,
        quoteDecimals: 9,
        programId: MAINNET_PROGRAM_ID.AmmV4,
        marketProgramId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
    });

    const liquidityPoolKeys = {
        ...poolkeys,
        marketAsks: asks,
        marketBids: bids,
        marketEventQueue: eventQueue,
        marketQuoteVault: quoteVault,
        marketBaseVault: baseVault,
    };

    const poolInfo = await Liquidity.fetchInfo({ connection, poolKeys: liquidityPoolKeys });
    const from = await splToken.getMint(connection, tokenPublicKey);
    const wsol = await splToken.getMint(connection, new web3.PublicKey('So11111111111111111111111111111111111111112'));
    const tokenIn = new Token(splToken.TOKEN_PROGRAM_ID, tokenPublicKey, from.decimals, "", "");
    const tokenOut = new Token(splToken.TOKEN_PROGRAM_ID, new web3.PublicKey('So11111111111111111111111111111111111111112'), wsol.decimals, "", "");

    const amountIn = new TokenAmount(tokenIn, 1, false);

    const { amountOut } = Liquidity.computeAmountOut({
        poolKeys: liquidityPoolKeys,
        poolInfo: poolInfo,
        amountIn: amountIn,
        currencyOut: tokenOut,
        slippage: new Percent(0, 100),
    });

    return amountOut.raw.toNumber() / web3.LAMPORTS_PER_SOL;
}