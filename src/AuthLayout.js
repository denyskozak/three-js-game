import {ConnectButton, ConnectModal, useCurrentAccount} from '@mysten/dapp-kit';
import { useState } from 'react';

export function AuthLayout( { children }) {
    const currentAccount = useCurrentAccount();
    const [open, setOpen] = useState(false);

    return (
        <>
            <ConnectButton/>
            {currentAccount && children}

        </>
    );
}