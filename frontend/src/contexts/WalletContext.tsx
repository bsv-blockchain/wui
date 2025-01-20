import React, { createContext, useState, useEffect, useContext } from 'react';
import { Wallet, WalletSigner, WalletStorageManager, StorageClient } from 'wallet-storage-client';
import { KeyDeriver, PrivateKey } from '@bsv/sdk'

// ------------------------------------------------------
// The React Context & Provider
// ------------------------------------------------------

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
            if (storedKey) {
                // create a new wallet
                const keyDeriver = new KeyDeriver(PrivateKey.fromHex(storedKey));
                const storageManager = new WalletStorageManager(keyDeriver.identityKey);
                const signer = new WalletSigner('test', keyDeriver, storageManager);
                const wallet = new Wallet(signer, keyDeriver);
                const client = new StorageClient(wallet, 'https://staging-dojo.babbage.systems');
                await storageManager.addWalletStorageProvider(client);
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
