import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    Checkbox,
    FormControlLabel,
    Stack,
    List,
    ListItem,
    ListItemText,
    Pagination,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';

import { useWallet } from '../contexts/WalletContext';

function ActionsPage() {
    const { wallet } = useWallet();

    const [description, setDescription] = useState('An example action');
    const [actions, setActions] = useState<any[]>([]);
    const [actionsPage, setActionsPage] = useState(1);
    const [totalActions, setTotalActions] = useState(0);
    const [includeLabels, setIncludeLabels] = useState(false);
    const [transactionResult, setTransactionResult] = useState<any>(null);

    // For internalizing
    const [internalizeOpen, setInternalizeOpen] = useState(false);
    const [internalizeTx, setInternalizeTx] = useState('');
    const [internalizeOutputs, setInternalizeOutputs] = useState('');

    useEffect(() => {
        if (!wallet) return;
        listActions(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallet]);

    const listActions = async (page: number) => {
        if (!wallet) return;
        try {
            // In a real wallet, you'd pass offset = (page-1)*limit, etc.
            const resp = await wallet.listActions({
                labels: [], // or filter with labels
                labelQueryMode: 'any',
                includeLabels,
                includeInputs: false,
                includeOutputs: false,
                limit: 5,
                offset: (page - 1) * 5
            });
            setActions(resp.actions || []);
            setTotalActions(resp.totalActions || 0);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateAction = async () => {
        if (!wallet) return;
        try {
            const resp = await wallet.createAction({
                description,
                // Minimal example: no inputs, no outputs
                options: {
                    signAndProcess: true
                }
            });
            setTransactionResult(resp);
            // Refresh
            listActions(1);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSignAction = async () => {
        if (!wallet || !transactionResult?.signableTransaction) return;
        const { reference } = transactionResult.signableTransaction;
        try {
            const resp = await wallet.signAction({
                reference,
                spends: {}
            });
            console.log('Signed transaction:', resp);
            setTransactionResult(resp);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAbortAction = async () => {
        if (!wallet || !transactionResult?.signableTransaction) return;
        const { reference } = transactionResult.signableTransaction;
        try {
            const resp = await wallet.abortAction({ reference });
            console.log('Aborted:', resp);
            setTransactionResult(null);
            listActions(1);
        } catch (err) {
            console.error(err);
        }
    };

    const handleOpenInternalize = () => {
        setInternalizeOpen(true);
    };

    const handleCloseInternalize = () => {
        setInternalizeOpen(false);
    };

    const handleInternalize = async () => {
        if (!wallet) return;
        const outputsParsed = JSON.parse(internalizeOutputs || '[]');
        try {
            const resp = await wallet.internalizeAction({
                tx: parseHexString(internalizeTx),
                outputs: outputsParsed,
                description: 'Manually internalized tx'
            });
            console.log('Internalize result:', resp);
            setInternalizeOpen(false);
        } catch (err) {
            console.error(err);
        }
    };

    function parseHexString(hex: string): number[] {
        // quick parse
        const clean = hex.replace(/^0x/, '').replace(/[^0-9a-fA-F]/g, '');
        const result: number[] = [];
        for (let i = 0; i < clean.length; i += 2) {
            result.push(parseInt(clean.substr(i, 2), 16));
        }
        return result;
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Actions</Typography>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">Create a Simple Action</Typography>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <Button variant="contained" onClick={handleCreateAction}>
                        Create & Process
                    </Button>
                </Stack>
                {transactionResult && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body1">
                            Last transaction result:
                        </Typography>
                        <pre style={{ background: '#f5f5f5', padding: 8 }}>
                            {JSON.stringify(transactionResult, null, 2)}
                        </pre>
                        {transactionResult?.signableTransaction && (
                            <Stack direction="row" spacing={2}>
                                <Button variant="contained" onClick={handleSignAction}>
                                    Sign Transaction
                                </Button>
                                <Button color="warning" variant="contained" onClick={handleAbortAction}>
                                    Abort Transaction
                                </Button>
                            </Stack>
                        )}
                    </Box>
                )}
            </Paper>

            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography variant="h6">List Actions</Typography>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={includeLabels}
                                onChange={(e) => setIncludeLabels(e.target.checked)}
                            />
                        }
                        label="Include Labels?"
                    />
                    <Button
                        variant="outlined"
                        onClick={() => listActions(actionsPage)}
                    >
                        Refresh
                    </Button>
                </Stack>
                <List>
                    {actions.map((a, i) => (
                        <ListItem key={i}>
                            <ListItemText
                                primary={`TXID: ${a.txid} - Desc: ${a.description}`}
                                secondary={`Status: ${a.status} | Sats: ${a.satoshis}`}
                            />
                        </ListItem>
                    ))}
                </List>
                <Pagination
                    sx={{ mt: 1 }}
                    page={actionsPage}
                    count={Math.ceil(totalActions / 5)}
                    onChange={(_, val) => {
                        setActionsPage(val);
                        listActions(val);
                    }}
                />
            </Paper>

            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">Internalize an Existing Transaction</Typography>
                <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                    <Button variant="contained" onClick={handleOpenInternalize}>
                        Internalize
                    </Button>
                </Stack>
            </Paper>

            <Dialog open={internalizeOpen} onClose={handleCloseInternalize} fullWidth>
                <DialogTitle>Internalize Transaction</DialogTitle>
                <DialogContent>
                    <Typography>Enter Hex-Encoded Transaction (AtomicBEEF) Below</Typography>
                    <TextField
                        label="Tx (Hex)"
                        fullWidth
                        multiline
                        rows={3}
                        value={internalizeTx}
                        onChange={(e) => setInternalizeTx(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                    <Typography sx={{ mt: 2 }}>
                        Provide outputs as JSON array. Example:
                    </Typography>
                    <pre style={{ background: '#f5f5f5', padding: 8 }}>
                        {`[
  {
    "outputIndex": 0,
    "protocol": "wallet payment",
    "paymentRemittance": {
      "derivationPrefix": "BASE64",
      "derivationSuffix": "BASE64",
      "senderIdentityKey": "02abc123..."
    }
  },
  {
    "outputIndex": 1,
    "protocol": "basket insertion",
    "insertionRemittance": {
      "basket": "myBasket",
      "tags": ["coolTag"]
    }
  }
]`}
                    </pre>
                    <TextField
                        label="Outputs JSON"
                        fullWidth
                        multiline
                        rows={6}
                        value={internalizeOutputs}
                        onChange={(e) => setInternalizeOutputs(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseInternalize}>Cancel</Button>
                    <Button onClick={handleInternalize} variant="contained">Submit</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default ActionsPage;
