import React, { createContext, useState, useEffect, useContext } from 'react';
import { Wallet } from '@bsv/sdk'
import makeWallet from '../utils/makeWallet'

interface WalletContextValue {
    wallet: Wallet | null;
    setWallet: React.Dispatch<React.SetStateAction<Wallet | null>>;
}

// We create the actual context
const WalletContext = createContext<WalletContextValue>({
    wallet: null,
    setWallet: () => { }
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [wallet, setWallet] = useState<Wallet | null>(null);

    // On mount, check if we have a privateKey in localStorage
    useEffect(() => {
        (async () => {
            const storedKey = localStorage.getItem('brc100privkey');
            const storedStorageURL = localStorage.getItem('brc100storage');
            const storedNetwork = localStorage.getItem('brc100network');
            if (storedKey && storedStorageURL && storedNetwork) {
                // create a new wallet
                const wallet = await makeWallet(storedNetwork as 'test' | 'main', storedKey, storedStorageURL);
                setWallet(wallet);
            }
        })();
    }, []);

    return (
        <WalletContext.Provider value={{ wallet, setWallet }}>
            {children}
        </WalletContext.Provider>
    );
};

export function useWallet() {
    return useContext(WalletContext);
}
