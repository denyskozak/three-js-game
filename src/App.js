import {AuthLayout} from "./AuthLayout";
import {CharacterManager} from "./Character";
import {SuiClientProvider, WalletProvider, createNetworkConfig} from '@mysten/dapp-kit';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import { getFullnodeUrl } from '@mysten/sui/client';
import '@mysten/dapp-kit/dist/index.css';
import {useState} from "react";
import {Game} from "./Game";

const {networkConfig} = createNetworkConfig({
    devnet: {url: getFullnodeUrl('devnet')},
});
const queryClient = new QueryClient()

export function App() {
    const [activeCharacter, setActiveCharacter] = useState(true);
    return (
        <QueryClientProvider client={queryClient}>
            <SuiClientProvider networks={networkConfig} defaultNetwork="devnet">
                <WalletProvider>
                    {/*<AuthLayout>*/}
                        <Game />
                    {/*</AuthLayout>*/}
                </WalletProvider>
            </SuiClientProvider>
        </QueryClientProvider>
    );
}