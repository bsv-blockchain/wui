import React, { createContext, useState, useEffect, useContext } from 'react';

// ------------------------------------------------------
// 1) Mock Implementation of BRC100 Wallet
// ------------------------------------------------------

// We define a simplified interface or type. In a real app, 
// you would use the full BRC-100 interface exactly as described.
export interface BRC100Wallet {
    // Pretend we store some ephemeral in-memory states
    privateKey: string;
    isAuthenticated: () => Promise<{ authenticated: boolean }>;
    waitForAuthentication: () => Promise<{ authenticated: true }>;
    getVersion: () => Promise<{ version: string }>;
    getNetwork: () => Promise<{ network: 'mainnet' | 'testnet' }>;
    getHeight: () => Promise<{ height: number }>;
    getHeaderForHeight: (args: { height: number }) => Promise<{ header: string }>;

    // Actions
    createAction: (args: any) => Promise<any>;
    signAction: (args: any) => Promise<any>;
    abortAction: (args: any) => Promise<{ aborted: true }>;
    listActions: (args: any) => Promise<any>;
    internalizeAction: (args: any) => Promise<{ accepted: true }>;

    // Outputs
    listOutputs: (args: any) => Promise<any>;
    relinquishOutput: (args: any) => Promise<{ relinquished: true }>;

    // Keys & Linkage
    getPublicKey: (args: any) => Promise<{ publicKey: string }>;
    revealCounterpartyKeyLinkage: (args: any) => Promise<any>;
    revealSpecificKeyLinkage: (args: any) => Promise<any>;

    // Cryptography
    encrypt: (args: any) => Promise<{ ciphertext: number[] }>;
    decrypt: (args: any) => Promise<{ plaintext: number[] }>;
    createHmac: (args: any) => Promise<{ hmac: number[] }>;
    verifyHmac: (args: any) => Promise<{ valid: true }>;
    createSignature: (args: any) => Promise<{ signature: number[] }>;
    verifySignature: (args: any) => Promise<{ valid: true }>;

    // Certificates
    acquireCertificate: (args: any) => Promise<any>;
    listCertificates: (args: any) => Promise<any>;
    proveCertificate: (args: any) => Promise<any>;
    relinquishCertificate: (args: any) => Promise<{ relinquished: true }>;
    discoverByIdentityKey: (args: any) => Promise<any>;
    discoverByAttributes: (args: any) => Promise<any>;
}

export class MockBRC100Wallet implements BRC100Wallet {
    privateKey: string;
    constructor(privKey: string) {
        this.privateKey = privKey;
    }

    // In a real wallet, you'd do real checks. 
    // Here, we just treat the presence of a private key as "authenticated."
    isAuthenticated = async () => {
        return { authenticated: Boolean(this.privateKey) };
    };

    waitForAuthentication = async () => {
        // In a real scenario, might block until user logs in. 
        // Here, we assume user is instantly "authenticated".
        return { authenticated: true };
    };

    getVersion = async () => {
        return { version: 'mock-v1.0.0' };
    };

    getNetwork = async () => {
        // Hardcode "testnet" for demonstration
        return { network: 'testnet' as const };
    };

    getHeight = async () => {
        return { height: 123456 }; // mock
    };

    getHeaderForHeight = async (args: { height: number }) => {
        // Return a fake 80-byte hex string
        return {
            header:
                '00000020a7f... (mock header for block ' + args.height + ') ...deadbeef'
        };
    };

    // Actions (Transaction) methods:
    createAction = async (args: any) => {
        console.log('Mock createAction called with:', args);
        // Return a mock result
        return {
            txid: 'abcd1234... (mock txid)',
            tx: new Array(20).fill(0), // mock AtomicBEEF
            noSendChange: [],
            sendWithResults: [],
            // signableTransaction could also be returned if the user wants partial sign
            signableTransaction: undefined
        };
    };

    signAction = async (args: any) => {
        console.log('Mock signAction called with:', args);
        return {
            txid: 'efgh5678... (mock signed txid)',
            tx: new Array(20).fill(1),
            sendWithResults: []
        };
    };

    abortAction = async (args: any) => {
        console.log('Mock abortAction called with:', args);
        return { aborted: true };
    };

    listActions = async (args: any) => {
        console.log('Mock listActions called with:', args);
        return {
            totalActions: 2,
            actions: [
                {
                    txid: 'mocktxid1234',
                    satoshis: 1000,
                    status: 'completed',
                    isOutgoing: false,
                    description: 'Mock action #1',
                    labels: ['demo'],
                    version: 2,
                    lockTime: 0,
                    inputs: [],
                    outputs: []
                },
                {
                    txid: 'mocktxid5678',
                    satoshis: 2000,
                    status: 'sending',
                    isOutgoing: true,
                    description: 'Mock action #2',
                    labels: ['some-label'],
                    version: 2,
                    lockTime: 0,
                    inputs: [],
                    outputs: []
                }
            ]
        };
    };

    internalizeAction = async (args: any) => {
        console.log('Mock internalizeAction called with:', args);
        return { accepted: true };
    };

    // Outputs
    listOutputs = async (args: any) => {
        console.log('Mock listOutputs called with:', args);
        return {
            totalOutputs: 2,
            outputs: [
                {
                    outpoint: 'mocktxid1111.0',
                    satoshis: 500,
                    lockingScript: '76a914...mock...88ac',
                    spendable: true,
                    customInstructions: 'custom stuff',
                    tags: ['demo'],
                    labels: []
                },
                {
                    outpoint: 'mocktxid2222.1',
                    satoshis: 1500,
                    lockingScript: '76a914...anothermock...88ac',
                    spendable: true,
                    customInstructions: 'some instructions',
                    tags: [],
                    labels: ['label']
                }
            ]
        };
    };

    relinquishOutput = async (args: any) => {
        console.log('Mock relinquishOutput called with:', args);
        return { relinquished: true };
    };

    // Keys & Linkage
    getPublicKey = async (args: any) => {
        console.log('Mock getPublicKey called with:', args);
        // Return a dummy 33-byte hex
        return { publicKey: '02abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd' };
    };

    revealCounterpartyKeyLinkage = async (args: any) => {
        console.log('Mock revealCounterpartyKeyLinkage called with:', args);
        return {
            prover: '02aaaaaa...',
            verifier: args.verifier,
            counterparty: args.counterparty,
            revelationTime: new Date().toISOString(),
            encryptedLinkage: [1, 2, 3],
            encryptedLinkageProof: [4, 5, 6]
        };
    };

    revealSpecificKeyLinkage = async (args: any) => {
        console.log('Mock revealSpecificKeyLinkage called with:', args);
        return {
            prover: '02aaaaaa...',
            verifier: args.verifier,
            counterparty: args.counterparty,
            protocolID: args.protocolID,
            keyID: args.keyID,
            encryptedLinkage: [7, 8, 9],
            encryptedLinkageProof: [10, 11, 12],
            proofType: 1
        };
    };

    // Crypto
    encrypt = async (args: any) => {
        console.log('Mock encrypt called with:', args);
        // Return random ciphertext bytes
        return { ciphertext: [99, 100, 101, 102] };
    };

    decrypt = async (args: any) => {
        console.log('Mock decrypt called with:', args);
        // Return a random plaintext
        return { plaintext: [11, 22, 33, 44] };
    };

    createHmac = async (args: any) => {
        console.log('Mock createHmac called with:', args);
        return { hmac: [99, 88, 77] };
    };

    verifyHmac = async (args: any) => {
        console.log('Mock verifyHmac called with:', args);
        return { valid: true };
    };

    createSignature = async (args: any) => {
        console.log('Mock createSignature called with:', args);
        // Return a mock signature
        return { signature: [1, 2, 3, 4, 5] };
    };

    verifySignature = async (args: any) => {
        console.log('Mock verifySignature called with:', args);
        return { valid: true };
    };

    // Certificates
    acquireCertificate = async (args: any) => {
        console.log('Mock acquireCertificate called with:', args);
        // Return a mock certificate
        return {
            type: args.type,
            subject: '02mocksubject',
            serialNumber: 'someSerial',
            certifier: args.certifier,
            revocationOutpoint: 'mocktxid0000.0',
            signature: 'abcd1234mocked',
            fields: args.fields
        };
    };

    listCertificates = async (args: any) => {
        console.log('Mock listCertificates called with:', args);
        return {
            totalCertificates: 1,
            certificates: [
                {
                    type: 'mocktype',
                    subject: '02mocksubject',
                    serialNumber: 'mockSerial',
                    certifier: '02somecertifierpubkey',
                    revocationOutpoint: 'mocktxid9999.0',
                    signature: 'deadbeef',
                    fields: { name: 'Alice', location: 'Wonderland' }
                }
            ]
        };
    };

    proveCertificate = async (args: any) => {
        console.log('Mock proveCertificate called with:', args);
        // Return a partial keyring
        return {
            keyringForVerifier: {
                name: 'someEncryptedKeyForName',
                location: 'someEncryptedKeyForLocation'
            }
        };
    };

    relinquishCertificate = async (args: any) => {
        console.log('Mock relinquishCertificate called with:', args);
        return { relinquished: true };
    };

    discoverByIdentityKey = async (args: any) => {
        console.log('Mock discoverByIdentityKey called with:', args);
        return {
            totalCertificates: 1,
            certificates: [
                {
                    type: 'mockdiscovertype',
                    subject: args.identityKey,
                    serialNumber: 'discoveredSerial',
                    certifier: '02certifierPubKey',
                    revocationOutpoint: 'discovertxid.1',
                    signature: 'discoSig',
                    fields: { name: 'FoundUser' },
                    certifierInfo: {
                        name: 'MyCertifier',
                        iconUrl: 'https://example.com/icon.png',
                        description: 'Trusted Certifier',
                        trust: 5
                    },
                    publiclyRevealedKeyring: {},
                    decryptedFields: { name: 'FoundUser' }
                }
            ]
        };
    };

    discoverByAttributes = async (args: any) => {
        console.log('Mock discoverByAttributes called with:', args);
        return {
            totalCertificates: 1,
            certificates: [
                {
                    type: 'mockdiscovertype2',
                    subject: '02someUser',
                    serialNumber: 'discoveredSerial2',
                    certifier: '02certifierPubKey2',
                    revocationOutpoint: 'discovertxid.2',
                    signature: 'discoSig2',
                    fields: args.attributes,
                    certifierInfo: {
                        name: 'AnotherCertifier',
                        iconUrl: 'https://example.com/icon2.png',
                        description: 'Trusted Certifier #2',
                        trust: 7
                    },
                    publiclyRevealedKeyring: {},
                    decryptedFields: { ...args.attributes }
                }
            ]
        };
    };
}

// ------------------------------------------------------
// 2) The React Context & Provider
// ------------------------------------------------------

interface WalletContextValue {
    wallet: BRC100Wallet | null;
    setWallet: React.Dispatch<React.SetStateAction<BRC100Wallet | null>>;
}

// We create the actual context
const WalletContext = createContext<WalletContextValue>({
    wallet: null,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setWallet: () => { }
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [wallet, setWallet] = useState<BRC100Wallet | null>(null);

    // On mount, check if we have a privateKey in localStorage
    useEffect(() => {
        const storedKey = localStorage.getItem('brc100privkey');
        if (storedKey) {
            // create a new wallet
            const w = new MockBRC100Wallet(storedKey);
            setWallet(w);
        }
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
