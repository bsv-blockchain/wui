import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    Divider,
    Checkbox,
    FormControlLabel,
    Stack,
    List,
    ListItem,
    ListItemText,
    Pagination,
    Grid
} from '@mui/material';
import { useWallet } from '../contexts/WalletContext';

interface ActionInput {
    outpoint: string;
    unlockingScript?: string;
    unlockingScriptLength?: number;
    inputDescription: string;
    sequenceNumber?: number;
}

interface ActionOutput {
    lockingScript: string;
    satoshis: number;
    outputDescription: string;
    basket?: string;
    customInstructions?: string;
    tags?: string[];
}

function ActionsPage() {
    const { wallet } = useWallet();

    /** CREATE ACTION FORM */
    const [description, setDescription] = useState('Example Action');

    // Inputs array
    const [inputs, setInputs] = useState<ActionInput[]>([]);
    const [tempInput, setTempInput] = useState<ActionInput>({
        outpoint: '',
        inputDescription: ''
    });

    // Outputs array
    const [outputs, setOutputs] = useState<ActionOutput[]>([]);
    const [tempOutput, setTempOutput] = useState<ActionOutput>({
        lockingScript: '',
        satoshis: 1000,
        outputDescription: ''
    });

    // Options
    const [signAndProcess, setSignAndProcess] = useState(true);
    const [acceptDelayedBroadcast, setAcceptDelayedBroadcast] = useState(true);
    const [returnTXIDOnly, setReturnTXIDOnly] = useState(false);
    const [noSend, setNoSend] = useState(false);
    const [labels, setLabels] = useState('');
    const [lockTime, setLockTime] = useState<number | undefined>(undefined);
    const [version, setVersion] = useState<number | undefined>(undefined);

    const [transactionResult, setTransactionResult] = useState<any>(null);

    // For listing actions
    const [actions, setActions] = useState<any[]>([]);
    const [actionsPage, setActionsPage] = useState(1);
    const [totalActions, setTotalActions] = useState(0);

    /** SIGN ACTION FORM */
    const [signReference, setSignReference] = useState('');
    // For convenience, let's just do a JSON field that user can type in:
    const [spendsJson, setSpendsJson] = useState('{}');

    useEffect(() => {
        if (wallet) {
            listActions(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallet]);

    async function listActions(page: number) {
        if (!wallet) return;
        try {
            const resp = await wallet.listActions({
                labels: [],
                labelQueryMode: 'any',
                includeLabels: true,
                includeInputs: true,
                includeOutputs: true,
                limit: 5,
                offset: (page - 1) * 5
            });
            setActions(resp.actions || []);
            setTotalActions(resp.totalActions || 0);
        } catch (err) {
            console.error(err);
        }
    }

    const handleAddInput = () => {
        if (!tempInput.outpoint || !tempInput.inputDescription) return;
        setInputs([...inputs, { ...tempInput }]);
        setTempInput({ outpoint: '', inputDescription: '' });
    };

    const handleAddOutput = () => {
        if (!tempOutput.lockingScript || !tempOutput.outputDescription) return;
        setOutputs([...outputs, { ...tempOutput }]);
        setTempOutput({
            lockingScript: '',
            satoshis: 1000,
            outputDescription: ''
        });
    };

    const handleCreateAction = async () => {
        if (!wallet) return;
        try {
            const labelsArr = labels
                ? labels.split(',').map((l) => l.trim()).filter(Boolean)
                : [];
            const resp = await wallet.createAction({
                description,
                inputs: inputs.map((inp) => ({
                    outpoint: inp.outpoint,
                    unlockingScript: inp.unlockingScript || undefined,
                    unlockingScriptLength: inp.unlockingScriptLength || undefined,
                    inputDescription: inp.inputDescription,
                    sequenceNumber: inp.sequenceNumber
                })),
                outputs: outputs.map((out) => ({
                    lockingScript: out.lockingScript,
                    satoshis: out.satoshis,
                    outputDescription: out.outputDescription,
                    basket: out.basket,
                    customInstructions: out.customInstructions,
                    tags: out.tags
                })),
                lockTime: lockTime !== undefined ? lockTime : undefined,
                version: version !== undefined ? version : undefined,
                labels: labelsArr,
                options: {
                    signAndProcess,
                    acceptDelayedBroadcast,
                    returnTXIDOnly,
                    noSend
                    // if you want to handle knownTxids, trustSelf, etc., add them
                }
            });
            setTransactionResult(resp);
            // Refresh
            listActions(1);
        } catch (err) {
            console.error(err);
        }
    };

    // Sign Action
    const handleSignAction = async () => {
        if (!wallet) return;
        try {
            const parsedSpends = JSON.parse(spendsJson);
            const resp = await wallet.signAction({
                reference: signReference,
                spends: parsedSpends
                // Additional options can be appended if needed
            });
            setTransactionResult(resp);
        } catch (err) {
            console.error(err);
        }
    };

    // Abort Action
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

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Actions</Typography>

            {/** CREATE ACTION SECTION */}
            <Paper sx={{ p: 2, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Create a New Action</Typography>

                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            fullWidth
                            label="LockTime"
                            type="number"
                            value={lockTime || ''}
                            onChange={(e) => setLockTime(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            fullWidth
                            label="Version"
                            type="number"
                            value={version || ''}
                            onChange={(e) => setVersion(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                        />
                    </Grid>
                </Grid>

                <Stack direction="row" spacing={2} mt={2}>
                    <TextField
                        label="Labels (comma-separated)"
                        value={labels}
                        onChange={(e) => setLabels(e.target.value)}
                        fullWidth
                    />
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1">Inputs</Typography>
                {inputs.map((inp, idx) => (
                    <Box
                        key={idx}
                        sx={{
                            backgroundColor: '#fafafa',
                            p: 1,
                            mb: 1,
                            border: '1px solid #ccc',
                            borderRadius: 1
                        }}
                    >
                        <strong>{inp.outpoint}</strong> – {inp.inputDescription}
                        {inp.unlockingScript && <div>Unlocking Script: {inp.unlockingScript}</div>}
                    </Box>
                ))}

                <Stack direction="row" spacing={2} mt={1}>
                    <TextField
                        label="Outpoint (txid.index)"
                        value={tempInput.outpoint}
                        onChange={(e) => setTempInput({ ...tempInput, outpoint: e.target.value })}
                    />
                    <TextField
                        label="Description"
                        value={tempInput.inputDescription}
                        onChange={(e) => setTempInput({ ...tempInput, inputDescription: e.target.value })}
                    />
                    <Button variant="outlined" onClick={handleAddInput}>
                        Add Input
                    </Button>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1">Outputs</Typography>
                {outputs.map((out, idx) => (
                    <Box
                        key={idx}
                        sx={{
                            backgroundColor: '#fafafa',
                            p: 1,
                            mb: 1,
                            border: '1px solid #ccc',
                            borderRadius: 1
                        }}
                    >
                        <strong>{out.lockingScript}</strong> – {out.outputDescription}, {out.satoshis} satoshis
                        {out.basket && <div>Basket: {out.basket}</div>}
                        {out.tags && <div>Tags: {out.tags.join(', ')}</div>}
                    </Box>
                ))}
                <Stack direction="row" spacing={2} mt={1} flexWrap="wrap">
                    <TextField
                        label="Locking Script"
                        sx={{ minWidth: 220 }}
                        value={tempOutput.lockingScript}
                        onChange={(e) => setTempOutput({ ...tempOutput, lockingScript: e.target.value })}
                    />
                    <TextField
                        label="Satoshis"
                        type="number"
                        value={tempOutput.satoshis}
                        sx={{ width: 120 }}
                        onChange={(e) => setTempOutput({ ...tempOutput, satoshis: parseInt(e.target.value, 10) })}
                    />
                    <TextField
                        label="Description"
                        value={tempOutput.outputDescription}
                        onChange={(e) => setTempOutput({ ...tempOutput, outputDescription: e.target.value })}
                    />
                    <Button variant="outlined" onClick={handleAddOutput}>
                        Add Output
                    </Button>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1">Options</Typography>
                <Stack direction="row" spacing={2}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={signAndProcess}
                                onChange={(e) => setSignAndProcess(e.target.checked)}
                            />
                        }
                        label="signAndProcess"
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={acceptDelayedBroadcast}
                                onChange={(e) => setAcceptDelayedBroadcast(e.target.checked)}
                            />
                        }
                        label="acceptDelayedBroadcast"
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={returnTXIDOnly}
                                onChange={(e) => setReturnTXIDOnly(e.target.checked)}
                            />
                        }
                        label="returnTXIDOnly"
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={noSend}
                                onChange={(e) => setNoSend(e.target.checked)}
                            />
                        }
                        label="noSend"
                    />
                </Stack>

                <Button variant="contained" sx={{ mt: 2 }} onClick={handleCreateAction}>
                    Create Action
                </Button>

                {transactionResult && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="body1" fontWeight="bold">
                            createAction() result:
                        </Typography>
                        <pre style={{ background: '#f5f5f5', padding: 8 }}>
                            {JSON.stringify(transactionResult, null, 2)}
                        </pre>

                        {transactionResult?.signableTransaction && (
                            <Stack direction="row" spacing={2}>
                                <Button variant="contained" color="warning" onClick={handleAbortAction}>
                                    Abort
                                </Button>
                            </Stack>
                        )}
                    </Box>
                )}
            </Paper>

            {/** SIGN ACTION SECTION */}
            <Paper sx={{ p: 2, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Sign an Existing Action</Typography>
                <Stack direction="row" spacing={2}>
                    <TextField
                        label="Reference (Base64)"
                        value={signReference}
                        onChange={(e) => setSignReference(e.target.value)}
                        fullWidth
                    />
                </Stack>
                <Typography variant="body2" sx={{ mt: 1 }}>
                    Provide `spends` as JSON. Example: {`"0":{"unlockingScript":"abcd...","sequenceNumber":123}`}
                </Typography>
                <TextField
                    label="spends (JSON)"
                    multiline
                    rows={3}
                    value={spendsJson}
                    onChange={(e) => setSpendsJson(e.target.value)}
                    fullWidth
                    sx={{ mt: 1 }}
                />
                <Button variant="contained" sx={{ mt: 2 }} onClick={handleSignAction}>
                    signAction
                </Button>
            </Paper>

            {/** LIST ACTIONS SECTION */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>List Actions</Typography>
                <Button
                    variant="outlined"
                    onClick={() => listActions(actionsPage)}
                    sx={{ mb: 2 }}
                >
                    Refresh
                </Button>
                <List dense>
                    {actions.map((a, i) => (
                        <ListItem key={i}>
                            <ListItemText
                                primary={`TXID: ${a.txid} - Desc: ${a.description} - Status: ${a.status}`}
                                secondary={
                                    <>
                                        Inputs: {a.inputs?.length ?? 0}, Outputs: {a.outputs?.length ?? 0}
                                        {a.labels?.length ? ` | Labels: ${a.labels.join(', ')}` : ''}
                                    </>
                                }
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
        </Box>
    );
}

export default ActionsPage;
