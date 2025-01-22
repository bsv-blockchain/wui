import { Wallet, WalletSigner, WalletStorageManager, StorageClient, Services } from 'wallet-storage-client';
import { WalletClient, Wallet as WalletInterface, KeyDeriver, PrivateKey } from '@bsv/sdk'

export default async function makeWallet(chain: 'test' | 'main' | 'local', privateKey: string, storageURL: string): Promise<WalletInterface> {
    if (chain === 'local') {
        return new WalletClient()
    }
    const keyDeriver = new KeyDeriver(new PrivateKey(privateKey, 'hex'));
    const storageManager = new WalletStorageManager(keyDeriver.identityKey);
    const signer = new WalletSigner(chain, keyDeriver, storageManager);
    const services = new Services(chain);
    const wallet = new Wallet(signer, keyDeriver, services);
    const client = new StorageClient(wallet, storageURL);
    await client.makeAvailable();
    await storageManager.addWalletStorageProvider(client);
    return wallet;
}