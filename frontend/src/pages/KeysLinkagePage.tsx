import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Stack,
    TextField,
    Button
} from '@mui/material';
import { useWallet } from '../contexts/WalletContext';

function KeysLinkagePage() {
    const { wallet } = useWallet();

    // getPublicKey
    const [protocolString, setProtocolString] = useState('someProtocol');
    const [securityLevel, setSecurityLevel] = useState(0);
    const [keyID, setKeyID] = useState('');
    const [counterparty, setCounterparty] = useState('');
    const [publicKeyResult, setPublicKeyResult] = useState('');

    const handleGetPubKey = async () => {
        if (!wallet) return;
        try {
            const resp = await wallet.getPublicKey({
                identityKey: false,
                protocolID: [securityLevel, protocolString],
                keyID,
                counterparty
            });
            setPublicKeyResult(resp.publicKey);
        } catch (err) {
            console.error(err);
        }
    };

    // Reveal Key Linkage
    const [counterpartyLink, setCounterpartyLink] = useState('');
    const [verifier, setVerifier] = useState('');
    const [linkageResult, setLinkageResult] = useState<any>(null);

    const handleRevealCounterpartyLink = async () => {
        if (!wallet) return;
        try {
            const resp = await wallet.revealCounterpartyKeyLinkage({
                counterparty: counterpartyLink,
                verifier
            });
            setLinkageResult(resp);
        } catch (err) {
            console.error(err);
        }
    };

    // Reveal Specific
    const [specificProtocol, setSpecificProtocol] = useState('docsig');
    const [specificLevel, setSpecificLevel] = useState(1);
    const [specificKeyID, setSpecificKeyID] = useState('doc#123');
    const [specificVerifier, setSpecificVerifier] = useState('');
    const [specificCounterparty, setSpecificCounterparty] = useState('');
    const [specificResult, setSpecificResult] = useState<any>(null);

    const handleRevealSpecific = async () => {
        if (!wallet) return;
        try {
            const resp = await wallet.revealSpecificKeyLinkage({
                counterparty: specificCounterparty,
                verifier: specificVerifier,
                protocolID: [specificLevel, specificProtocol],
                keyID: specificKeyID
            });
            setSpecificResult(resp);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Keys & Linkage</Typography>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">getPublicKey</Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        label="Security Level"
                        type="number"
                        value={securityLevel}
                        onChange={(e) => setSecurityLevel(parseInt(e.target.value, 10))}
                    />
                    <TextField
                        label="Protocol String"
                        value={protocolString}
                        onChange={(e) => setProtocolString(e.target.value)}
                    />
                    <TextField
                        label="Key ID"
                        value={keyID}
                        onChange={(e) => setKeyID(e.target.value)}
                    />
                    <TextField
                        label="Counterparty PubKey"
                        value={counterparty}
                        onChange={(e) => setCounterparty(e.target.value)}
                    />
                    <Button variant="contained" onClick={handleGetPubKey}>
                        Get
                    </Button>
                </Stack>
                {publicKeyResult && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        Public Key: {publicKeyResult}
                    </Typography>
                )}
            </Paper>

            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">Reveal Counterparty Key Linkage</Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        label="Counterparty"
                        value={counterpartyLink}
                        onChange={(e) => setCounterpartyLink(e.target.value)}
                    />
                    <TextField
                        label="Verifier"
                        value={verifier}
                        onChange={(e) => setVerifier(e.target.value)}
                    />
                    <Button
                        variant="contained"
                        onClick={handleRevealCounterpartyLink}
                    >
                        Reveal
                    </Button>
                </Stack>
                {linkageResult && (
                    <pre style={{ background: '#f5f5f5', padding: 8, marginTop: 8 }}>
                        {JSON.stringify(linkageResult, null, 2)}
                    </pre>
                )}
            </Paper>

            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">Reveal Specific Key Linkage</Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        label="Security Level"
                        type="number"
                        value={specificLevel}
                        onChange={(e) => setSpecificLevel(parseInt(e.target.value, 10))}
                    />
                    <TextField
                        label="Protocol"
                        value={specificProtocol}
                        onChange={(e) => setSpecificProtocol(e.target.value)}
                    />
                    <TextField
                        label="Key ID"
                        value={specificKeyID}
                        onChange={(e) => setSpecificKeyID(e.target.value)}
                    />
                </Stack>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        label="Counterparty"
                        value={specificCounterparty}
                        onChange={(e) => setSpecificCounterparty(e.target.value)}
                    />
                    <TextField
                        label="Verifier"
                        value={specificVerifier}
                        onChange={(e) => setSpecificVerifier(e.target.value)}
                    />
                    <Button variant="contained" onClick={handleRevealSpecific}>
                        Reveal
                    </Button>
                </Stack>
                {specificResult && (
                    <pre style={{ background: '#f5f5f5', padding: 8, marginTop: 8 }}>
                        {JSON.stringify(specificResult, null, 2)}
                    </pre>
                )}
            </Paper>
        </Box>
    );
}

export default KeysLinkagePage;
