import { Wallet, WalletSigner, WalletStorageManager, StorageClient } from 'wallet-storage-client';
import { KeyDeriver, PrivateKey } from '@bsv/sdk'

export default async function makeWallet(chain: 'test' | 'main', privateKey: string, storageURL: string): Promise<Wallet> {
    const keyDeriver = new KeyDeriver(new PrivateKey(privateKey, 'hex'));
    const storageManager = new WalletStorageManager(keyDeriver.identityKey);
    const signer = new WalletSigner(chain, keyDeriver, storageManager);
    const wallet = new Wallet(signer, keyDeriver);
    const client = new StorageClient(wallet, storageURL);
    await storageManager.addWalletStorageProvider(client);
    return wallet;
}