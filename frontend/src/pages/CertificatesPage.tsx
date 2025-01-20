import { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Stack,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { useWallet } from '../contexts/WalletContext';

function CertificatesPage() {
    const { wallet } = useWallet();

    // Acquire
    const [acqType, setAcqType] = useState('base64-type');
    const [acqCertifier, setAcqCertifier] = useState('');
    const [acqProtocol, setAcqProtocol] = useState<'direct' | 'issuance'>('direct');
    const [acqFields, setAcqFields] = useState('{"name":"Alice"}');
    const [acqResult, setAcqResult] = useState<any>(null);

    const handleAcquire = async () => {
        if (!wallet) return;
        try {
            const fieldsObj = JSON.parse(acqFields);
            const resp = await wallet.acquireCertificate({
                type: acqType,
                certifier: acqCertifier,
                acquisitionProtocol: acqProtocol,
                fields: fieldsObj
            });
            setAcqResult(resp);
        } catch (err) {
            console.error(err);
        }
    };

    // List
    const [listedCerts, setListedCerts] = useState<any[]>([]);
    const [listTotal, setListTotal] = useState(0);

    const handleListCerts = async () => {
        if (!wallet) return;
        try {
            const resp = await wallet.listCertificates({
                certifiers: [acqCertifier],
                types: [acqType],
                limit: 10,
                offset: 0
            });
            setListedCerts(resp.certificates);
            setListTotal(resp.totalCertificates);
        } catch (err) {
            console.error(err);
        }
    };

    // Prove
    const [proveDialogOpen, setProveDialogOpen] = useState(false);
    const [proveResult, setProveResult] = useState<any>(null);
    const [fieldsToReveal, setFieldsToReveal] = useState('["name"]');
    const [verifierPubKey, setVerifierPubKey] = useState('');

    const [selectedCert, setSelectedCert] = useState<any>(null);

    const handleOpenProveDialog = (cert: any) => {
        setSelectedCert(cert);
        setProveDialogOpen(true);
    };

    const handleCloseProveDialog = () => {
        setProveDialogOpen(false);
        setProveResult(null);
    };

    const handleProve = async () => {
        if (!wallet || !selectedCert) return;
        try {
            const revealFields = JSON.parse(fieldsToReveal);
            const resp = await wallet.proveCertificate({
                certificate: selectedCert,
                fieldsToReveal: revealFields,
                verifier: verifierPubKey
            });
            setProveResult(resp);
        } catch (err) {
            console.error(err);
        }
    };

    // Relinquish
    const handleRelinquishCert = async (cert: any) => {
        if (!wallet) return;
        try {
            await wallet.relinquishCertificate({
                type: cert.type,
                serialNumber: cert.serialNumber,
                certifier: cert.certifier
            });
            handleListCerts();
        } catch (err) {
            console.error(err);
        }
    };

    // Discover by identity key
    const [discoveryIdentityKey, setDiscoveryIdentityKey] = useState('');
    const [discoveredCerts, setDiscoveredCerts] = useState<any[]>([]);
    const handleDiscoverByIdentityKey = async () => {
        if (!wallet) return;
        try {
            const resp = await wallet.discoverByIdentityKey({
                identityKey: discoveryIdentityKey
            });
            setDiscoveredCerts(resp.certificates);
        } catch (err) {
            console.error(err);
        }
    };

    // Discover by attributes
    const [discoveryAttrs, setDiscoveryAttrs] = useState('{"name":"Alice"}');
    const [attrsCerts, setAttrsCerts] = useState<any[]>([]);
    const handleDiscoverByAttrs = async () => {
        if (!wallet) return;
        try {
            const attrsObj = JSON.parse(discoveryAttrs);
            const resp = await wallet.discoverByAttributes({
                attributes: attrsObj
            });
            setAttrsCerts(resp.certificates);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Certificates</Typography>
            <Paper sx={{ p: 2, mb: 4 }}>
                <Typography variant="h6">Acquire Certificate</Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap">
                    <TextField
                        label="Type (base64)"
                        value={acqType}
                        onChange={(e) => setAcqType(e.target.value)}
                    />
                    <TextField
                        label="Certifier (pubkey)"
                        value={acqCertifier}
                        onChange={(e) => setAcqCertifier(e.target.value)}
                    />
                    <TextField
                        label="acquisitionProtocol"
                        value={acqProtocol}
                        onChange={(e) =>
                            setAcqProtocol(e.target.value === 'issuance' ? 'issuance' : 'direct')
                        }
                    />
                </Stack>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        label="Fields (JSON)"
                        value={acqFields}
                        onChange={(e) => setAcqFields(e.target.value)}
                        fullWidth
                    />
                </Stack>
                <Button variant="contained" sx={{ mt: 2 }} onClick={handleAcquire}>
                    Acquire
                </Button>
                {acqResult && (
                    <pre style={{ background: '#f5f5f5', padding: 8, marginTop: 8 }}>
                        {JSON.stringify(acqResult, null, 2)}
                    </pre>
                )}
            </Paper>

            <Paper sx={{ p: 2, mb: 4 }}>
                <Typography variant="h6">List Certificates</Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Button variant="contained" onClick={handleListCerts}>
                        List
                    </Button>
                    <Typography>Total: {listTotal}</Typography>
                </Stack>
                <List>
                    {listedCerts.map((cert, i) => (
                        <ListItem
                            key={i}
                            secondaryAction={
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => handleOpenProveDialog(cert)}
                                    >
                                        Prove
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        onClick={() => handleRelinquishCert(cert)}
                                    >
                                        Relinquish
                                    </Button>
                                </Stack>
                            }
                        >
                            <ListItemText
                                primary={`Serial: ${cert.serialNumber}`}
                                secondary={`Type: ${cert.type}, Certifier: ${cert.certifier}`}
                            />
                        </ListItem>
                    ))}
                </List>
            </Paper>

            <Paper sx={{ p: 2, mb: 4 }}>
                <Typography variant="h6">Discover Certificates by Identity Key</Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        label="Identity Key"
                        value={discoveryIdentityKey}
                        onChange={(e) => setDiscoveryIdentityKey(e.target.value)}
                    />
                    <Button variant="contained" onClick={handleDiscoverByIdentityKey}>
                        Discover
                    </Button>
                </Stack>
                <List>
                    {discoveredCerts.map((dc, i) => (
                        <ListItem key={i}>
                            <ListItemText
                                primary={`Serial: ${dc.serialNumber}`}
                                secondary={`Subject: ${dc.subject}`}
                            />
                        </ListItem>
                    ))}
                </List>
            </Paper>

            <Paper sx={{ p: 2 }}>
                <Typography variant="h6">Discover Certificates by Attributes</Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        label="Attributes (JSON)"
                        value={discoveryAttrs}
                        onChange={(e) => setDiscoveryAttrs(e.target.value)}
                        fullWidth
                    />
                    <Button variant="contained" onClick={handleDiscoverByAttrs}>
                        Discover
                    </Button>
                </Stack>
                <List>
                    {attrsCerts.map((dc, i) => (
                        <ListItem key={i}>
                            <ListItemText
                                primary={`Serial: ${dc.serialNumber}`}
                                secondary={`Fields: ${JSON.stringify(dc.fields)}`}
                            />
                        </ListItem>
                    ))}
                </List>
            </Paper>

            {/* Prove dialog */}
            <Dialog open={proveDialogOpen} onClose={handleCloseProveDialog} fullWidth>
                <DialogTitle>Prove Certificate Fields</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Fields to Reveal (JSON)"
                        value={fieldsToReveal}
                        onChange={(e) => setFieldsToReveal(e.target.value)}
                        fullWidth
                        sx={{ mt: 2 }}
                    />
                    <TextField
                        label="Verifier PubKey"
                        value={verifierPubKey}
                        onChange={(e) => setVerifierPubKey(e.target.value)}
                        fullWidth
                        sx={{ mt: 2 }}
                    />
                    {proveResult && (
                        <pre style={{ background: '#f5f5f5', padding: 8, marginTop: 8 }}>
                            {JSON.stringify(proveResult, null, 2)}
                        </pre>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseProveDialog}>Cancel</Button>
                    <Button variant="contained" onClick={handleProve}>
                        Prove
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default CertificatesPage;
