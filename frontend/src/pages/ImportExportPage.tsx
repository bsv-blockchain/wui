import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Tab,
    Tabs,
    Stack,
    TextField,
    Button,
    Alert,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { CreateActionArgs, InternalizeActionArgs, P2PKH, PrivateKey, PublicKey } from '@bsv/sdk';

import { useWallet } from '../contexts/WalletContext';
import makeWallet from '../utils/makeWallet';

/** Utility to generate a random base64 string for derivation prefix/suffix. */
function randomBase64(len = 16) {
    const arr = new Uint8Array(len);
    window.crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr));
}

/** P2PKH.  */
function buildLockingScriptFromPubKey(pubKeyHex: string): string {
    return new P2PKH().lock(PublicKey.fromString(pubKeyHex).toAddress()).toHex();
}

export default function ImportExportPage() {
    const { wallet } = useWallet();
    const [tab, setTab] = useState('import'); // 'import' | 'export'

    // We'll store localNetwork by calling our local wallet's getNetwork (once).
    const [localNetwork, setLocalNetwork] = useState<'main' | 'test' | null>(null);

    useEffect(() => {
        (async () => {
            if (!wallet) return;
            try {
                const netRes = await wallet.getNetwork({});
                // netRes.network is "mainnet" or "testnet"
                setLocalNetwork(netRes.network === 'mainnet' ? 'main' : 'test');
            } catch (err) {
                console.error('Error loading local network:', err);
            }
        })();
    }, [wallet]);

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 2 }}>
                Import / Export to Key
            </Typography>
            {!localNetwork && (
                <Typography>Loading local wallet info (network) ...</Typography>
            )}
            {localNetwork && (
                <Paper sx={{ p: 2 }}>
                    <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                        <Tab label="Import" value="import" />
                        <Tab label="Export" value="export" />
                    </Tabs>

                    {tab === 'import' && <ImportFunds localNetwork={localNetwork} />}
                    {tab === 'export' && <ExportFunds localNetwork={localNetwork} />}
                </Paper>
            )}
        </Box>
    );
}

/*******************************************************
 * ImportFunds: user supplies foreign wallet info,
 * plus an amount to move from foreign -> local.
 *******************************************************/
function ImportFunds({ localNetwork }: { localNetwork: 'main' | 'test' }) {
    const { wallet } = useWallet();
    const [foreignNet, setForeignNet] = useState<'main' | 'test'>('test');
    const [foreignPrivKey, setForeignPrivKey] = useState('');
    const [foreignStorage, setForeignStorage] = useState('');
    const [amount, setAmount] = useState<number>(0);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successDialogOpen, setSuccessDialogOpen] = useState(false);
    const [resultInfo, setResultInfo] = useState<any>(null);

    async function handleImport() {
        setError('');
        setResultInfo(null);
        if (!wallet) {
            setError('No local wallet available.');
            return;
        }
        if (foreignNet !== localNetwork) {
            setError(`Network mismatch. Local is ${localNetwork}, foreign is ${foreignNet}`);
            return;
        }
        if (!foreignPrivKey || !foreignStorage) {
            setError('Must provide foreign private key and storage URL.');
            return;
        }
        if (amount <= 0) {
            setError('Amount must be positive.');
            return;
        }
        setLoading(true);
        const foreignIdentityKey = new PrivateKey(foreignPrivKey, 'hex').toPublicKey().toString();
        const { publicKey: localIdentityKey } = await wallet.getPublicKey({ identityKey: true });
        try {
            // 1) build foreign wallet:
            const foreign = await makeWallet(foreignNet, foreignPrivKey.trim(), foreignStorage.trim());

            // 2) Derive a "wallet payment" public key from our local wallet
            //    a) generate derivation prefix/suffix (random base64)
            const derivPrefix = randomBase64(8);
            const derivSuffix = randomBase64(8);

            // b) call local getPublicKey with, say, `[1, "wallet payment"]`, or your actual protocol
            const pubResp = await wallet.getPublicKey({
                protocolID: [2, '3241645161d8'],
                keyID: `${derivPrefix} ${derivSuffix}`,
                counterparty: foreignIdentityKey
            });
            const localPubKey = pubResp.publicKey;

            // c) build a locking script for that pubkey
            const lockingScript = buildLockingScriptFromPubKey(localPubKey);

            // 3) On the foreign wallet, create an action that pays the desired `amount` to that script
            const createResp = await foreign.createAction({
                description: 'ImportFunds Payment to local wallet',
                // minimal input. foreign wallet picks UTXOs
                outputs: [
                    {
                        lockingScript,
                        satoshis: amount,
                        outputDescription: 'ImportFlow'
                    }
                ]
            });
            // check if createResp has a signableTransaction? If so, sign it, etc.
            // We'll assume it's all done. We get a final tx + txid in createResp.

            // 4) We have a completed transaction from foreign.
            //    We do local internalizeAction with outputIndex=0 as "wallet payment"
            //    using the derivationPrefix, derivationSuffix, localPubKey as the "senderIdentityKey"?
            //    Actually, in a typical Payment flow, the "sender" is foreign, we may or may not know
            //    their identity key. We'll just set something. For demonstration, let's guess we have
            //    foreign's identity key or we do "any"?  
            //    We'll parse the "atomicBEEF" from createResp if it is there:
            const atomicBEEF: number[] = createResp.tx || [];
            if (!atomicBEEF.length) {
                throw new Error('No transaction data in createResponse. Possibly signableTransaction?');
            }

            // internalize
            const intResp = await wallet.internalizeAction({
                tx: atomicBEEF,
                outputs: [
                    {
                        outputIndex: 0,
                        protocol: 'wallet payment',
                        paymentRemittance: {
                            derivationPrefix: derivPrefix,
                            derivationSuffix: derivSuffix,
                            senderIdentityKey: localIdentityKey
                        }
                    }
                ],
                description: 'Internalizing import funds tx'
            });

            // done
            setResultInfo({ createResp, intResp });
            setSuccessDialogOpen(true);
        } catch (err: any) {
            setError(err?.message || String(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Import Funds Into Local Wallet</Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
                {error && <Alert severity="error">{error}</Alert>}

                <FormControl>
                    <InputLabel>Network</InputLabel>
                    <Select
                        label="Network"
                        value={foreignNet}
                        onChange={(e) => setForeignNet(e.target.value as 'main' | 'test')}
                        disabled={loading}
                    >
                        <MenuItem value="main">Mainnet</MenuItem>
                        <MenuItem value="test">Testnet</MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    label="Foreign Wallet Private Key (Hex)"
                    value={foreignPrivKey}
                    onChange={(e) => setForeignPrivKey(e.target.value)}
                    disabled={loading}
                />

                <TextField
                    label="Foreign Wallet Storage URL"
                    value={foreignStorage}
                    onChange={(e) => setForeignStorage(e.target.value)}
                    disabled={loading}
                />

                <TextField
                    label="Amount (Satoshis)"
                    type="number"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                    disabled={loading}
                />

                <Box>
                    <Button
                        variant="contained"
                        onClick={handleImport}
                        disabled={loading || !foreignPrivKey || !foreignStorage || !amount}
                    >
                        {loading ? <CircularProgress size={18} /> : 'Import'}
                    </Button>
                </Box>
            </Stack>

            <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)} maxWidth="md">
                <DialogTitle>Import Successful</DialogTitle>
                <DialogContent>
                    <Typography>Successfully imported funds to local wallet.</Typography>
                    {resultInfo && (
                        <Box sx={{ mt: 2, background: '#f5f5f5', p: 1, maxHeight: 400, overflow: 'auto' }}>
                            <pre style={{ margin: 0 }}>{JSON.stringify(resultInfo, null, 2)}</pre>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" onClick={() => setSuccessDialogOpen(false)}>
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

/*******************************************************
 * ExportFunds: user supplies foreign wallet info,
 * plus an amount to send from local -> foreign.
 *******************************************************/
function ExportFunds({ localNetwork }: { localNetwork: 'main' | 'test' }) {
    const { wallet } = useWallet();
    const [foreignNet, setForeignNet] = useState<'main' | 'test'>('test');
    const [foreignPrivKey, setForeignPrivKey] = useState('');
    const [foreignStorage, setForeignStorage] = useState('');
    const [amount, setAmount] = useState<number>(0);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successDialogOpen, setSuccessDialogOpen] = useState(false);
    const [resultInfo, setResultInfo] = useState<any>(null);

    async function handleExport() {
        setError('');
        setResultInfo(null);
        if (!wallet) {
            setError('No local wallet available.');
            return;
        }
        if (foreignNet !== localNetwork) {
            setError(`Network mismatch. Local is ${localNetwork}, foreign is ${foreignNet}`);
            return;
        }
        if (!foreignPrivKey || !foreignStorage) {
            setError('Must provide foreign private key and storage URL.');
            return;
        }
        if (amount <= 0) {
            setError('Amount must be positive.');
            return;
        }
        setLoading(true);
        const { publicKey: localIdentityKey } = await wallet.getPublicKey({ identityKey: true });
        try {
            // 1) build foreign wallet:
            const foreign = await makeWallet(foreignNet, foreignPrivKey.trim(), foreignStorage.trim());
            const { publicKey: foreignIdentityKey } = await foreign.getPublicKey({ identityKey: true });

            // 2) Derive a "wallet payment" key from the foreign wallet (so we can pay them).
            //    Let's do a random derivation prefix/suffix again:
            const derivPrefix = randomBase64(8);
            const derivSuffix = randomBase64(8);

            //    call foreign getPublicKey to get a pubkey
            const pubResp = await wallet.getPublicKey({
                protocolID: [2, '3241645161d8'],
                keyID: `${derivPrefix} ${derivSuffix}`,
                counterparty: foreignIdentityKey
            });
            const foreignPubKey = pubResp.publicKey;
            const lockingScript = buildLockingScriptFromPubKey(foreignPubKey);

            // 3) We do a local createAction paying `amount` to that script
            const args: CreateActionArgs = {
                description: 'Export funds to foreign wallet',
                outputs: [
                    {
                        lockingScript,
                        satoshis: amount,
                        outputDescription: 'Funds for foreign wallet',
                        customInstructions: JSON.stringify({ prefix: derivPrefix, suffix: derivSuffix, counterparty: foreignIdentityKey, type: 'BRC29' })
                    }
                ],
                options: {
                    randomizeOutputs: false
                }
            }
            const createResp = await wallet.createAction(args);
            // parse out the final transaction from createResp
            const atomicBEEF = createResp.tx as number[]
            if (!atomicBEEF.length) {
                throw new Error('No final transaction data from local createAction.');
            }

            // 4) We then "internalize" that transaction on the foreign wallet.
            //    In a typical flow, foreign might do so automatically, or we do it here
            //    since user has foreign's private key as well.
            const iargs: InternalizeActionArgs = {
                tx: atomicBEEF,
                outputs: [
                    {
                        outputIndex: 0,
                        protocol: 'wallet payment',
                        paymentRemittance: {
                            derivationPrefix: derivPrefix,
                            derivationSuffix: derivSuffix,
                            senderIdentityKey: localIdentityKey,
                        }
                    }
                ],
                description: 'Internalizing export funds tx into foreign wallet'
            }
            const intResp = await foreign.internalizeAction(iargs);

            setResultInfo({ createResp, intResp });
            setSuccessDialogOpen(true);
        } catch (err: any) {
            setError(err?.message || String(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Export Funds From Local Wallet</Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
                {error && <Alert severity="error">{error}</Alert>}

                <FormControl>
                    <InputLabel>Network</InputLabel>
                    <Select
                        label="Network"
                        value={foreignNet}
                        onChange={(e) => setForeignNet(e.target.value as 'main' | 'test')}
                        disabled={loading}
                    >
                        <MenuItem value="main">Mainnet</MenuItem>
                        <MenuItem value="test">Testnet</MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    label="Foreign Wallet Private Key (Hex)"
                    value={foreignPrivKey}
                    onChange={(e) => setForeignPrivKey(e.target.value)}
                    disabled={loading}
                />

                <TextField
                    label="Foreign Wallet Storage URL"
                    value={foreignStorage}
                    onChange={(e) => setForeignStorage(e.target.value)}
                    disabled={loading}
                />

                <TextField
                    label="Amount (Satoshis)"
                    type="number"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                    disabled={loading}
                />

                <Box>
                    <Button
                        variant="contained"
                        onClick={handleExport}
                        disabled={loading || !foreignPrivKey || !foreignStorage || !amount}
                    >
                        {loading ? <CircularProgress size={18} /> : 'Export'}
                    </Button>
                </Box>
            </Stack>

            <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)} maxWidth="md">
                <DialogTitle>Export Successful</DialogTitle>
                <DialogContent>
                    <Typography>Successfully sent funds to foreign wallet.</Typography>
                    {resultInfo && (
                        <Box sx={{ mt: 2, background: '#f5f5f5', p: 1, maxHeight: 400, overflow: 'auto' }}>
                            <pre style={{ margin: 0 }}>{JSON.stringify(resultInfo, null, 2)}</pre>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" onClick={() => setSuccessDialogOpen(false)}>
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
