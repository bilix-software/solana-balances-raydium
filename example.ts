import { fetchTokenprice, getTokenBalance, getSolanaBalance } from './src/balances';
import { Wallet } from './src/types';
import { Connection, clusterApiUrl } from '@solana/web3.js';

class Example {
    private marketAddress: string;
    private tokenAddress: string;
    private wallets: Wallet[];

    constructor(marketAddress: string, tokenAddress: string, wallets: Wallet[]) {
        this.marketAddress = marketAddress;
        this.tokenAddress = tokenAddress;
        this.wallets = wallets;
    }

    async main() {

        try {
            const connection = new Connection(
                clusterApiUrl("mainnet-beta"),
                'confirmed'
            );
       
            for(let wallet of this.wallets){
                const solBalance = await getSolanaBalance(connection, wallet);
                const tokenprice = await fetchTokenprice(connection, this.marketAddress, this.tokenAddress);
                const tokenBalance = await getTokenBalance(connection, wallet, this.tokenAddress);
                const tokenValue = parseFloat((tokenBalance * tokenprice).toFixed(2))
                
                console.log('---------------------------------');
                console.log(`Wallet: ${wallet.publickey}`);
                console.log(`Sol balance: ${solBalance} SOL`);
                console.log(`Token balance: ${tokenBalance}`);
                console.log(`Token price: ${tokenprice} SOL`);
                console.log(`Wallet token value: ${tokenValue} SOL`);
            }
        } catch (error) {
            console.error('Error in main function:', error);
        }
    }
}

// Usage
const marketAddress = 'openbook-market-public-key-here'; // Replace with your actual token marketAddress, this example is for dogwifhat
const tokenAddress = 'token-public-key-here'; //Replace with actual token mint address, this example is for dogwifhat
const wallets = [
    { publickey: 'your-public-key-here' },
    { publickey: 'your-public-key-here' } // Replace with your actual wallets
];
const example = new Example(marketAddress,tokenAddress, wallets);
example.main();
